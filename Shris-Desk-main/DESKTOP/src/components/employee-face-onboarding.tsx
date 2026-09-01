"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import type { FaceSample } from "@/lib/face-auth-shared";
import { EMPLOYEE_FACE_ENROLLMENT_PROMPTS } from "@/lib/face-auth-shared";
import {
  analyzeCurrentFrame,
  captureFaceSample,
  ensureFaceModels,
  getPromptFeedback,
  promptInstruction,
} from "@/lib/face-client";

type EmployeeFaceOnboardingProps = {
  initialFullName: string;
  initialDepartment: string;
  initialPhone: string;
  initialJobTitle: string;
  initialEmployeeCode: string;
  initialLocation: string;
  initialShiftName: string;
  initialJoiningDate: string;
  initialManagerName: string;
  initialEmergencyContact: string;
  initialSkills: string;
  allowRefresh: boolean;
};

export function EmployeeFaceOnboarding({
  initialFullName,
  initialDepartment,
  initialPhone,
  initialJobTitle,
  initialEmployeeCode,
  initialLocation,
  initialShiftName,
  initialJoiningDate,
  initialManagerName,
  initialEmergencyContact,
  initialSkills,
  allowRefresh,
}: EmployeeFaceOnboardingProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [fullName, setFullName] = useState(initialFullName);
  const [department, setDepartment] = useState(initialDepartment);
  const [phone, setPhone] = useState(initialPhone);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [employeeCode, setEmployeeCode] = useState(initialEmployeeCode);
  const [location, setLocation] = useState(initialLocation);
  const [shiftName, setShiftName] = useState(initialShiftName);
  const [joiningDate, setJoiningDate] = useState(initialJoiningDate);
  const [managerName, setManagerName] = useState(initialManagerName);
  const [emergencyContact, setEmergencyContact] = useState(initialEmergencyContact);
  const [skills, setSkills] = useState(initialSkills);
  const [samples, setSamples] = useState<Record<string, FaceSample>>({});
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState(
    "Loading the face models and preparing camera access.",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentPrompt =
    EMPLOYEE_FACE_ENROLLMENT_PROMPTS.find((prompt) => !samples[prompt]) ?? null;

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await ensureFaceModels();
        if (!cancelled) {
          setModelsReady(true);
          setStatus("Face models are ready. Turn on the camera to begin secure setup.");
        }
      } catch {
        if (!cancelled) {
          setError("Face models could not be loaded in this browser.");
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
          : "All face angles captured. Submit to finish secure setup.",
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
    setStatus(`Capturing ${prompt} angle...`);

    const result = await captureFaceSample(videoRef.current, prompt, samples);

    if ("error" in result) {
      setError(result.error ?? "Unable to capture the requested face angle.");
      setStatus(result.error ?? "Unable to capture the requested face angle.");
      return;
    }

    if (!("sample" in result)) {
      setError("Unable to capture the requested face angle.");
      setStatus("Unable to capture the requested face angle.");
      return;
    }

    setSamples((current) => ({
      ...current,
      [prompt]: result.sample,
    }));
    setStatus(`Captured ${prompt} angle successfully.`);
  }

  function resetCaptures() {
    setSamples({});
    setError(null);
    setStatus(promptInstruction("front"));
  }

  async function completeSetup() {
    if (Object.keys(samples).length !== EMPLOYEE_FACE_ENROLLMENT_PROMPTS.length) {
      setError("Capture all requested face angles before completing the setup.");
      return;
    }

    if (fullName.trim().length < 2) {
      setError("Enter the employee full name before saving the secure setup.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/employee-face/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          department,
          phone,
          jobTitle,
          employeeCode,
          location,
          shiftName,
          joiningDate,
          managerName,
          emergencyContact,
          skills,
          samples: EMPLOYEE_FACE_ENROLLMENT_PROMPTS.map((prompt) => samples[prompt]),
        }),
      });

      const payload = (await response.json()) as { error?: string; redirectTo?: string };

      if (!response.ok || !payload.redirectTo) {
        throw new Error(payload.error ?? "Unable to save secure face setup.");
      }

      window.location.assign(payload.redirectTo);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save secure face setup.",
      );
    } finally {
      startTransition(() => {
        setSubmitting(false);
      });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="panel-strong rounded-[30px] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Step 1
        </p>
        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
          Complete the employee profile
        </h3>
        <div className="mt-6 grid max-h-[520px] gap-4 overflow-y-auto pr-2 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
            <input
              className="input-base"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Employee full name"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Department</label>
            <input
              className="input-base"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Department"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Job title</label>
            <input
              className="input-base"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Job title"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Employee code</label>
            <input
              className="input-base"
              value={employeeCode}
              onChange={(event) => setEmployeeCode(event.target.value)}
              placeholder="Employee code"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
            <input
              className="input-base"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
            <input
              className="input-base"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Work location"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Shift</label>
            <input
              className="input-base"
              value={shiftName}
              onChange={(event) => setShiftName(event.target.value)}
              placeholder="Shift name"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Joining date</label>
            <input
              className="input-base"
              type="date"
              value={joiningDate}
              onChange={(event) => setJoiningDate(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Manager</label>
            <input
              className="input-base"
              value={managerName}
              onChange={(event) => setManagerName(event.target.value)}
              placeholder="Reporting manager"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Emergency contact
            </label>
            <input
              className="input-base"
              value={emergencyContact}
              onChange={(event) => setEmergencyContact(event.target.value)}
              placeholder="Emergency contact"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Skills</label>
            <textarea
              className="input-base min-h-24"
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              placeholder="Core skills, tools, certifications"
            />
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200/70 pt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Step 2
          </p>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Register face authentication
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Capture one clear face sample for each guided angle. This creates a more
            reliable template for different head turns and everyday backgrounds.
          </p>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950">
            <video
              ref={videoRef}
              className="aspect-video w-full object-cover"
              muted
              playsInline
            />
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
              {currentPrompt ? `Capture ${currentPrompt}` : "All Captures Ready"}
            </button>
            <button className="button-secondary" type="button" onClick={resetCaptures}>
              Reset Captures
            </button>
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
            <p className="font-medium text-slate-800">
              {currentPrompt
                ? `Current angle: ${currentPrompt}`
                : "All required face angles are captured."}
            </p>
            <p className="mt-2">{status}</p>
            {error ? <p className="mt-3 text-rose-600">{error}</p> : null}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            className="button-primary"
            type="button"
            onClick={() => void completeSetup()}
            disabled={submitting}
          >
            {submitting
              ? "Finishing Secure Setup..."
              : allowRefresh
                ? "Save Updated Face Registration"
                : "Complete Secure Setup"}
          </button>
        </div>
      </section>

      <aside className="panel rounded-[30px] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Capture Checklist
        </p>
        <div className="mt-5 space-y-3">
          {EMPLOYEE_FACE_ENROLLMENT_PROMPTS.map((prompt) => {
            const captured = Boolean(samples[prompt]);
            return (
              <div
                key={prompt}
                className={`rounded-[22px] px-4 py-4 text-sm ${
                  captured
                    ? "bg-emerald-50 text-emerald-800"
                    : "border border-slate-200/80 bg-white text-slate-700"
                }`}
              >
                <p className="font-semibold capitalize">{prompt}</p>
                <p className="mt-2 leading-6">
                  {captured
                    ? "Captured and stored for enrollment."
                    : promptInstruction(prompt)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-[24px] bg-slate-950 px-5 py-5 text-sm leading-7 text-slate-200">
          <p className="font-semibold uppercase tracking-[0.16em] text-slate-400">
            Enforcement
          </p>
          <p className="mt-3">
            Employee workspace access stays locked until profile completion and face
            registration both succeed.
          </p>
        </div>
      </aside>
    </div>
  );
}
