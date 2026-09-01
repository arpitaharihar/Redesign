"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import type { FaceSample, LoginPrompt } from "@/lib/face-auth-shared";
import { EMPLOYEE_FACE_LOGIN_PROMPTS } from "@/lib/face-auth-shared";
import {
  analyzeCurrentFrame,
  captureFaceSample,
  ensureFaceModels,
  getPromptFeedback,
  promptInstruction,
} from "@/lib/face-client";

type EmployeeFaceVerifierProps = {
  challengeToken: string;
  employeeLabel: string;
  companyLabel: string;
};

function promptLabel(prompt: LoginPrompt, hasFirstSideTurn: boolean) {
  switch (prompt) {
    case "front":
      return "Straight View";
    case "left":
      return "Side Turn 1";
    case "right":
      return hasFirstSideTurn ? "Second Side Angle" : "Side Turn 2";
    default:
      return prompt;
  }
}

export function EmployeeFaceVerifier({
  challengeToken,
  employeeLabel,
  companyLabel,
}: EmployeeFaceVerifierProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [samples, setSamples] = useState<Record<string, FaceSample>>({});
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState(
    "Loading the face verification models for secure employee sign-in.",
  );
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const currentPrompt =
    EMPLOYEE_FACE_LOGIN_PROMPTS.find((prompt) => !samples[prompt]) ?? null;
  const currentPromptLabel = currentPrompt
    ? promptLabel(currentPrompt, Boolean(samples.left))
    : null;

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await ensureFaceModels();
        if (!cancelled) {
          setModelsReady(true);
          setStatus("Face verification is ready. Turn on the camera to continue.");
        }
      } catch {
        if (!cancelled) {
          setError("Face verification models could not be loaded in this browser.");
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!cameraReady || !currentPrompt || !videoRef.current) {
      return;
    }

    const prompt = currentPrompt;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      if (!videoRef.current) {
        return;
      }

      const result = await analyzeCurrentFrame(videoRef.current);
      if (cancelled) {
        return;
      }

      if ("error" in result) {
        setStatus(result.error ?? "No face detected. Move closer and improve the lighting.");
        return;
      }

      setStatus(getPromptFeedback(prompt, result.analysis, samples));
    }, 1300);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [cameraReady, currentPrompt, samples]);

  async function startCamera() {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setStatus(
        currentPrompt
          ? promptInstruction(currentPrompt)
          : "All verification angles are captured. Finish face authentication.",
      );
    } catch {
      setError("Camera access was denied or is unavailable on this device.");
    }
  }

  async function captureCurrentPrompt() {
    const prompt = currentPrompt;

    if (!prompt || !videoRef.current) {
      return;
    }

    setError(null);
    setStatus(`Capturing ${promptLabel(prompt, Boolean(samples.left))}...`);

    const result = await captureFaceSample(videoRef.current, prompt, samples);

    if ("error" in result) {
      setError(result.error ?? "Unable to capture the requested verification angle.");
      setStatus(result.error ?? "Unable to capture the requested verification angle.");
      return;
    }

    if (!("sample" in result)) {
      setError("Unable to capture the requested verification angle.");
      setStatus("Unable to capture the requested verification angle.");
      return;
    }

    setSamples((current) => ({
      ...current,
      [prompt]: result.sample,
    }));
    setStatus(`Captured ${promptLabel(prompt, Boolean(samples.left))}.`);
  }

  function resetVerification() {
    setSamples({});
    setError(null);
    setStatus(promptInstruction("front"));
  }

  async function verifyFace() {
    if (Object.keys(samples).length !== EMPLOYEE_FACE_LOGIN_PROMPTS.length) {
      setError("Capture every requested angle before finishing face authentication.");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/employee-face/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeToken,
          samples: EMPLOYEE_FACE_LOGIN_PROMPTS.map((prompt) => samples[prompt]),
        }),
      });

      const payload = (await response.json()) as { error?: string; redirectUrl?: string };

      if (!response.ok || !payload.redirectUrl) {
        throw new Error(payload.error ?? "Face authentication failed.");
      }

      window.location.assign(payload.redirectUrl);
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Face authentication failed.",
      );
    } finally {
      startTransition(() => {
        setVerifying(false);
      });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="panel-strong rounded-[30px] p-6">
        <span className="eyebrow">Employee Face Verification</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
          Confirm the employee identity for {employeeLabel}
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Company workspace: {companyLabel}. Capture the requested head positions so
          SmartDesk can compare them against the registered multi-angle face template.
        </p>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="button-primary"
            type="button"
            onClick={() => void startCamera()}
            disabled={!modelsReady}
          >
            {cameraReady ? "Restart Camera" : "Start Camera"}
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={() => void captureCurrentPrompt()}
            disabled={!cameraReady || !currentPrompt}
          >
            {currentPromptLabel ? `Capture ${currentPromptLabel}` : "All Captures Ready"}
          </button>
          <button className="button-secondary" type="button" onClick={resetVerification}>
            Reset Verification
          </button>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
          <p className="font-medium text-slate-800">
            {currentPromptLabel
              ? `Current verification step: ${currentPromptLabel}`
              : "Verification captures complete."}
          </p>
          <p className="mt-2">{status}</p>
          {error ? <p className="mt-3 text-rose-600">{error}</p> : null}
        </div>

        <div className="mt-8">
          <button
            className="button-primary"
            type="button"
            onClick={() => void verifyFace()}
            disabled={verifying}
          >
            {verifying ? "Verifying Face..." : "Finish Face Authentication"}
          </button>
        </div>
      </section>

      <aside className="panel rounded-[30px] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Verification Checklist
        </p>
        <div className="mt-5 space-y-3">
          {EMPLOYEE_FACE_LOGIN_PROMPTS.map((prompt) => {
            const captured = Boolean(samples[prompt]);
            const label = promptLabel(prompt, Boolean(samples.left));
            return (
              <div
                key={prompt}
                className={`rounded-[22px] px-4 py-4 text-sm ${
                  captured
                    ? "bg-emerald-50 text-emerald-800"
                    : "border border-slate-200/80 bg-white text-slate-700"
                }`}
              >
                <p className="font-semibold">{label}</p>
                <p className="mt-2 leading-6">
                  {captured ? "Captured and queued for verification." : promptInstruction(prompt)}
                </p>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
