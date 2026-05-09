"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// Gemini's documented hard cap for inline parts is ~20MB total per request,
// but PDFs balloon once base64-encoded and we still need headroom for the
// system prompt + history. 10MB pre-base64 keeps us comfortably under.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface CapturedImage {
  /** Full data URL (data:<mime>;base64,...) — handy for previewing inline */
  dataUrl: string;
  /** Just the base64 payload, ready to send to the Gemini API */
  base64: string;
  mimeType: string;
  /** Original filename when the source was an upload (undefined for live frames). */
  fileName?: string;
  /** File size in bytes (uploads only). */
  fileSize?: number;
}

export interface CameraPanelHandle {
  /** Pull the currently-armed photo or document and clear it. */
  takeArmedImage(): CapturedImage | null;
  /** True if the student has captured a photo / attached a file waiting to be sent. */
  hasArmedImage(): boolean;
  /** True when the live camera is open and ready to snap a frame. */
  isReady(): boolean;
  /** Imperatively snap a frame (same as the "Take photo" button). Returns null if camera isn't ready. */
  captureNow(): CapturedImage | null;
  /** Discard any armed photo / snapshot (same as "Retake"). */
  discardArmed(): void;
}

interface CameraPanelProps {
  /**
   * Optional: fired when the student taps "Send to ACE" on a captured photo
   * or attached file. If omitted, the panel just arms the attachment and the
   * parent reads it off the ref the next time the student asks a question.
   */
  onSendCapture?: (image: CapturedImage) => void;
}

type CameraState = "starting" | "active" | "denied" | "unavailable" | "off";

function isPdf(mime: string) {
  return mime === "application/pdf";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CameraPanel = forwardRef<CameraPanelHandle, CameraPanelProps>(
  function CameraPanel({ onSendCapture }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const collapsedFileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const armedRef = useRef<CapturedImage | null>(null);

    const [state, setState] = useState<CameraState>("off");
    const [snapshot, setSnapshot] = useState<CapturedImage | null>(null);
    const [resolution, setResolution] = useState<{ w: number; h: number } | null>(null);
    const [visible, setVisible] = useState(true);
    const [uploadError, setUploadError] = useState("");

    // ── Camera lifecycle ────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setResolution(null);
    }, []);

    const startCamera = useCallback(async () => {
      if (streamRef.current) return;
      setState("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          const v = videoRef.current;
          const recordSize = () => {
            if (v.videoWidth && v.videoHeight) {
              setResolution({ w: v.videoWidth, h: v.videoHeight });
            }
          };
          if (v.readyState >= 1) recordSize();
          else v.onloadedmetadata = recordSize;
        }
        setState("active");
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setState("denied");
        } else {
          setState("unavailable");
        }
      }
    }, []);

    useEffect(() => {
      return () => stopCamera();
    }, [stopCamera]);

    // Hiding the panel must also free the camera — leaving a hidden but live
    // stream feels surveilly and drains battery.
    useEffect(() => {
      if (!visible && state === "active") {
        stopCamera();
        setState("off");
      }
    }, [visible, state, stopCamera]);

    // ── Capture ─────────────────────────────────────────────────────────────
    const takeSnapshot = useCallback((): CapturedImage | null => {
      const video = videoRef.current;
      if (
        state !== "active" ||
        !video ||
        video.readyState < 2 ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        return null;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      return {
        dataUrl,
        base64: dataUrl.split(",")[1] ?? "",
        mimeType: "image/jpeg",
      };
    }, [state]);

    const handleCapture = useCallback(() => {
      const img = takeSnapshot();
      if (!img) return;
      armedRef.current = img;
      setSnapshot(img);
      setUploadError("");
    }, [takeSnapshot]);

    const handleRetake = useCallback(() => {
      armedRef.current = null;
      setSnapshot(null);
      setUploadError("");
    }, []);

    const handleSend = useCallback(() => {
      if (!snapshot) return;
      onSendCapture?.(snapshot);
      armedRef.current = null;
    }, [snapshot, onSendCapture]);

    const handleFile = useCallback((file: File) => {
      setUploadError("");

      const mime = file.type || "";
      const accepted = mime.startsWith("image/") || mime === "application/pdf";
      if (!accepted) {
        setUploadError("Only image files and PDFs are supported.");
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(
          `File is ${formatBytes(file.size)} — please upload something under ${formatBytes(MAX_UPLOAD_BYTES)}.`
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img: CapturedImage = {
          dataUrl,
          base64: dataUrl.split(",")[1] ?? "",
          mimeType: mime || "application/octet-stream",
          fileName: file.name,
          fileSize: file.size,
        };
        armedRef.current = img;
        setSnapshot(img);
      };
      reader.onerror = () => setUploadError("Could not read that file. Try another.");
      reader.readAsDataURL(file);
    }, []);

    // ── Imperative API ──────────────────────────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        takeArmedImage: () => {
          const img = armedRef.current;
          armedRef.current = null;
          return img;
        },
        hasArmedImage: () => armedRef.current !== null,
        isReady: () => state === "active",
        captureNow: () => {
          const img = takeSnapshot();
          if (img) {
            armedRef.current = img;
            setSnapshot(img);
            setUploadError("");
          }
          return img;
        },
        discardArmed: () => {
          armedRef.current = null;
          setSnapshot(null);
          setUploadError("");
        },
      }),
      [state, takeSnapshot]
    );

    // ── Collapsed view ──────────────────────────────────────────────────────
    if (!visible) {
      const armed = snapshot;
      const armedIsPdf = armed ? isPdf(armed.mimeType) : false;
      return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span aria-hidden className="text-base opacity-70">📷</span>
            <span className="font-semibold uppercase tracking-widest">
              Camera hidden
            </span>
            {armed && (
              <span className="ml-1 rounded-full bg-indigo-950/60 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                {armedIsPdf ? "PDF ready" : "Photo ready"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white">
              <span aria-hidden>📎</span>
              Attach file
              <input
                ref={collapsedFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => setVisible(true)}
              className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Show camera
            </button>
          </div>
        </div>
      );
    }

    // ── Expanded view ───────────────────────────────────────────────────────
    const snapshotIsPdf = snapshot ? isPdf(snapshot.mimeType) : false;

    return (
      <div className="mb-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-base">📷</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Take a photo of your question
            </span>
            {state === "active" && !snapshot && resolution && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  resolution.w >= 1280
                    ? "bg-zinc-800 text-zinc-400"
                    : "bg-amber-950/60 text-amber-300"
                }`}
                title={
                  resolution.w >= 1280
                    ? "High enough to read printed text"
                    : "Low resolution — text may be hard to read"
                }
              >
                {resolution.w}×{resolution.h}
              </span>
            )}
            {snapshot && (
              <span className="ml-1 rounded-full bg-indigo-950/60 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                {snapshotIsPdf ? "PDF ready" : "Photo ready"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {state === "active" ? (
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setState("off");
                  handleRetake();
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Stop camera
              </button>
            ) : state === "starting" ? (
              <span className="text-[11px] text-zinc-500">Starting…</span>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Open camera
              </button>
            )}
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
              title="Hide the camera panel"
            >
              Hide
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            className={`h-full w-full object-cover ${
              state === "active" && !snapshot ? "block" : "hidden"
            }`}
            muted
            playsInline
            autoPlay
          />

          {snapshot && !snapshotIsPdf && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={snapshot.dataUrl}
              alt={snapshot.fileName ?? "Captured question"}
              className="h-full w-full object-contain"
            />
          )}

          {snapshot && snapshotIsPdf && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-800/60 bg-rose-950/40 text-3xl">
                📄
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  {snapshot.fileName ?? "Attached PDF"}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  {snapshot.fileSize ? formatBytes(snapshot.fileSize) : "PDF document"}
                  {" · "}ACE will read every page
                </p>
              </div>
            </div>
          )}

          {state !== "active" && !snapshot && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              {state === "denied" ? (
                <>
                  <span className="text-2xl" aria-hidden>🚫</span>
                  <p className="text-sm text-zinc-300">Camera permission denied</p>
                  <p className="text-xs text-zinc-500">
                    Enable it in your browser settings, or attach a file below.
                  </p>
                </>
              ) : state === "unavailable" ? (
                <>
                  <span className="text-2xl" aria-hidden>⚠️</span>
                  <p className="text-sm text-zinc-300">No camera available</p>
                  <p className="text-xs text-zinc-500">
                    Attach an image or PDF of your question instead.
                  </p>
                </>
              ) : state === "starting" ? (
                <p className="text-sm text-zinc-400">Waking up the camera…</p>
              ) : (
                <>
                  <span className="text-3xl" aria-hidden>📸</span>
                  <p className="text-sm text-zinc-300">
                    Tap <span className="font-semibold">Open camera</span> to take a
                    photo, or attach a file below.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 px-4 py-3">
          {!snapshot ? (
            <>
              <button
                type="button"
                onClick={handleCapture}
                disabled={state !== "active"}
                className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                📸 Take photo
              </button>
              <label className="cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white">
                Upload image / PDF
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSend}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Send to ACE
              </button>
              <button
                type="button"
                onClick={handleRetake}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                {snapshotIsPdf ? "Remove" : "Retake"}
              </button>
            </>
          )}
        </div>

        {uploadError && (
          <div className="border-t border-red-900/60 bg-red-950/30 px-4 py-2 text-[11px] text-red-300">
            {uploadError}
          </div>
        )}

        <p className="border-t border-zinc-800 px-4 py-2 text-[11px] leading-relaxed text-zinc-500">
          Hold the page steady, fill the frame with the question, and tap{" "}
          <span className="text-zinc-300">Take photo</span>. Or attach a multi-page
          PDF — ACE will ask which question you want to look at.
        </p>
      </div>
    );
  }
);

export default CameraPanel;
