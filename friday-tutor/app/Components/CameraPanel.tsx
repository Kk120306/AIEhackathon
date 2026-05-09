"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface CameraPanelHandle {
  captureFrame(): string | null;
}

type CameraState = "idle" | "active" | "denied" | "unavailable";

const CameraPanel = forwardRef<CameraPanelHandle>(function CameraPanel(_, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState("active");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setState("denied");
        } else {
          setState("unavailable");
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    captureFrame(): string | null {
      const video = videoRef.current;
      if (state !== "active" || !video) return null;
      if (video.readyState < 2) return null;
      if (video.videoWidth === 0 || video.videoHeight === 0) return null;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.85);
    },
  }));

  if (state === "denied" || state === "unavailable") return null;

  return (
    <div className="relative mb-4 w-40 overflow-hidden rounded-xl border border-gray-700 bg-gray-900">
      <video
        ref={videoRef}
        className="h-30 w-40 object-cover"
        muted
        playsInline
      />
      {state === "active" && (
        <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
          <span className="text-[10px] text-gray-300">Live</span>
        </div>
      )}
    </div>
  );
});

export default CameraPanel;
