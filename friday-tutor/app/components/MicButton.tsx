"use client";

import { useRef, useState } from "react";
import type { AppStatus } from "../page";

export default function MicButton({
  setQuestion,
  askBackend,
  setStatus,
  setError,
}: {
  setQuestion: (question: string) => void;
  askBackend: (question: string) => Promise<void>;
  setStatus: (status: AppStatus) => void;
  setError: (error: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const transcribeAudio = async (audioBlob: Blob) => {
    setStatus("transcribing");

    const formData = new FormData();
    const file = new File([audioBlob], "friday-question.webm", {
      type: audioBlob.type || "audio/webm",
    });

    formData.append("audio", file);
    formData.append("language", "en-US");

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const payload = await res.json();

    if (!res.ok) {
      throw new Error(payload.error ?? "Could not transcribe audio.");
    }

    return String(payload.transcript ?? "").trim();
  };

  const stopListening = () => {
    recorderRef.current?.stop();
  };

  const startListening = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("This browser does not support microphone recording.");
      setStatus("error");
      return;
    }

    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        try {
          const audioBlob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const transcript = await transcribeAudio(audioBlob);

          if (!transcript) {
            throw new Error("No speech was detected.");
          }

          setQuestion(transcript);
          await askBackend(transcript);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not process the recording."
          );
          setStatus("error");
        }
      };

      recorder.start();
      setIsRecording(true);
      setStatus("listening");
    } catch {
      setIsRecording(false);
      setError("Microphone access was blocked or unavailable.");
      setStatus("error");
    }
  };

  return (
    <button
      onClick={isRecording ? stopListening : startListening}
      className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl text-black font-bold"
    >
      {isRecording ? "Stop recording" : "Ask Friday"}
    </button>
  );
}
