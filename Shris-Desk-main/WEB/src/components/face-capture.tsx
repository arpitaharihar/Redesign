"use client";

import { useEffect, useRef, useState } from "react";

import { computeHashFromCanvas, computeImageQuality } from "@/lib/face-hash";

type FaceCaptureProps = {
  onCapture: (hash: string, previewUrl: string) => void;
  onCaptureSeries?: (hashes: string[], previewUrl: string) => void;
  buttonLabel?: string;
  hint?: string;
  burst?: boolean;
  compact?: boolean;
};

export function FaceCapture({
  onCapture,
  onCaptureSeries,
  buttonLabel,
  hint,
  burst = false,
  compact = false,
}: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Camera permission is required for face verification.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setError("Camera is still loading. Please wait a moment.");
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const quality = computeImageQuality(canvas);
    return { canvas, quality };
  };

  const handleCapture = async () => {
    if (capturing) return;
    setError(null);
    setCapturing(true);

    const captures: Array<{ canvas: HTMLCanvasElement; quality: number }> = [];
    const totalShots = burst ? 3 : 1;
    for (let i = 0; i < totalShots; i += 1) {
      const frame = captureFrame();
      if (frame) captures.push(frame);
      if (burst && i < totalShots - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    if (captures.length === 0) {
      setCapturing(false);
      return;
    }

    captures.sort((a, b) => b.quality - a.quality);
    const hashes = captures.map((item) => computeHashFromCanvas(item.canvas));
    const best = captures[0];
    const hash = hashes[0];
    const dataUrl = best.canvas.toDataURL("image/png");
    setPreview(dataUrl);
    onCapture(hash, dataUrl);
    if (onCaptureSeries) {
      onCaptureSeries(hashes, dataUrl);
    }
    setCapturing(false);
  };

  return (
    <div className="rounded-4 border border-light-subtle bg-white p-4 shadow-sm">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <p className="fw-semibold mb-0">Face Camera</p>
        <span className={`badge ${ready ? "text-bg-success" : "text-bg-secondary"}`}>
          {ready ? "Camera ready" : "Starting..."}
        </span>
      </div>
      {hint ? <p className="text-muted small mb-3">{hint}</p> : null}
      {error ? <div className="alert alert-warning">{error}</div> : null}
      {compact ? (
        <div className="row g-3 align-items-start">
          <div className="col-md-7">
            <div className="border rounded-4 overflow-hidden bg-dark position-relative" style={{ height: 400 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-100 h-100"
                onLoadedMetadata={() => setReady(true)}
              />
              <div
                className="position-absolute top-50 start-50 translate-middle border border-2 rounded-circle border-light opacity-75"
                style={{ width: "52%", height: "72%" }}
              />
            </div>
          </div>
          <div className="col-md-5">
            <div className="border rounded-4 bg-light d-flex align-items-center justify-content-center" style={{ height: 200 }}>
              {preview ? (
                <img src={preview} alt="Face preview" className="img-fluid rounded-3 border" />
              ) : (
                <span className="text-muted small">Captured preview</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="ratio ratio-4x3 border rounded-4 overflow-hidden bg-dark position-relative sd-face-preview">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-100 h-100"
            onLoadedMetadata={() => setReady(true)}
          />
          <div className="position-absolute top-50 start-50 translate-middle border border-2 rounded-circle border-light opacity-75" style={{ width: "52%", height: "72%" }} />
        </div>
      )}
      <button
        type="button"
        className="btn btn-primary mt-3"
        onClick={handleCapture}
        disabled={!ready || capturing}
      >
        {capturing ? "Capturing..." : buttonLabel ?? "Capture Face"}
      </button>
      <div className="mt-3 d-flex flex-wrap gap-3 text-muted small">
        <span>Keep your face centered</span>
        <span>Good lighting helps</span>
        <span>Remove hats or masks</span>
      </div>
      {!compact && preview ? (
        <div className="mt-3">
          <p className="text-muted small mb-2">Captured Preview</p>
          <img src={preview} alt="Face preview" className="img-fluid rounded-3 border" />
        </div>
      ) : null}
    </div>
  );
}
