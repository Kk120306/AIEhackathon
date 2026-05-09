"use client";

import { useRef, useState, useCallback } from "react";
import type { AppStatus } from "../types";

// VAD tuning constants
const SILENCE_THRESHOLD = 30;      // RMS below this (0–255 scale) = silence
const SILENCE_DURATION_MS = 1500;  // Hold silence this long before auto-stopping
const MIN_RECORDING_MS = 700;      // Never auto-stop before this much has been recorded
const MAX_RECORDING_MS = 30_000;   // Hard cap — always submit after this long

interface UseVoiceRecorderOptions {
  setStatus: (status: AppStatus) => void;
  setError: (error: string) => void;
  onTranscript: (transcript: string) => void;
  onNoSpeech: () => void;
  onAudioLevel?: (level: number) => void;
}

export function useVoiceRecorder({
  setStatus,
  setError,
  onTranscript,
  onNoSpeech,
  onAudioLevel,
}: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const abortedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadFrameRef = useRef<number | null>(null);
  // Guard against overlapping startListening calls
  const isStartingRef = useRef(false);

  const stopVad = useCallback(() => {
    if (vadFrameRef.current !== null) {
      cancelAnimationFrame(vadFrameRef.current);
      vadFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    setStatus("transcribing");
    const formData = new FormData();
    formData.append(
      "audio",
      new File([audioBlob], "ace-question.webm", {
        type: audioBlob.type || "audio/webm",
      })
    );
    formData.append("language", "en-US");

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error ?? "Could not transcribe audio.");
    return String(payload.transcript ?? "").trim();
  };

  // Hard-stop (abort) — used when ending the conversation entirely
  const stopListening = useCallback(() => {
    abortedRef.current = true;
    isStartingRef.current = false;
    stopVad();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
    onAudioLevel?.(0);
  }, [stopVad, onAudioLevel]);

  // Soft-stop — submit whatever has been recorded without aborting the session
  const submitNow = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      stopVad();
      recorderRef.current.stop();
    }
  }, [stopVad]);

  const startListening = useCallback(async () => {
    // Prevent overlapping sessions
    if (isStartingRef.current || (recorderRef.current?.state === "recording")) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("This browser does not support microphone recording.");
      setStatus("error");
      return;
    }

    isStartingRef.current = true;
    let stream: MediaStream | null = null;

    try {
      setError("");
      abortedRef.current = false;

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // If aborted while waiting for getUserMedia permission, clean up immediately
      if (abortedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        isStartingRef.current = false;
        return;
      }

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;

      // ── Voice Activity Detection ──────────────────────────────────────────
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const recordingStartedAt = Date.now();
      let silenceStart: number | null = null;

      const tick = () => {
        if (abortedRef.current || recorder.state !== "recording") return;

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length);

        onAudioLevel?.(Math.min(rms / 80, 1));

        const elapsed = Date.now() - recordingStartedAt;

        // Hard cap — always submit after MAX_RECORDING_MS
        if (elapsed >= MAX_RECORDING_MS) {
          stopVad();
          recorder.stop();
          return;
        }

        if (elapsed >= MIN_RECORDING_MS) {
          if (rms < SILENCE_THRESHOLD) {
            if (silenceStart === null) silenceStart = Date.now();
            else if (Date.now() - silenceStart >= SILENCE_DURATION_MS) {
              stopVad();
              recorder.stop();
              return;
            }
          } else {
            silenceStart = null;
          }
        }

        vadFrameRef.current = requestAnimationFrame(tick);
      };
      vadFrameRef.current = requestAnimationFrame(tick);
      // ─────────────────────────────────────────────────────────────────────

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream?.getTracks().forEach((t) => t.stop());
        stopVad();
        setIsRecording(false);
        onAudioLevel?.(0);

        // Check abort BEFORE the async transcription call
        if (abortedRef.current) return;

        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const transcript = await transcribeAudio(blob);

          // Check abort AGAIN after the async transcription (could have been stopped mid-flight)
          if (abortedRef.current) return;

          if (!transcript) {
            onNoSpeech();
            return;
          }
          onTranscript(transcript);
        } catch (err) {
          if (abortedRef.current) return;
          setError(
            err instanceof Error ? err.message : "Could not process the recording."
          );
          setStatus("error");
        }
      };

      recorder.start();
      setIsRecording(true);
      setStatus("listening");
      isStartingRef.current = false;
    } catch (err) {
      // Clean up any partially-initialised resources
      stream?.getTracks().forEach((t) => t.stop());
      stopVad();
      isStartingRef.current = false;
      setIsRecording(false);
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone access was blocked or unavailable."
          : "Could not start microphone."
      );
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTranscript, onNoSpeech, setStatus, setError, onAudioLevel, stopVad]);

  return { isRecording, startListening, stopListening, submitNow };
}
