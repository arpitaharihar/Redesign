export const EMPLOYEE_FACE_ENROLLMENT_PROMPTS = [
  "front",
  "left",
  "right",
  "up",
  "down",
] as const;

export const EMPLOYEE_FACE_LOGIN_PROMPTS = ["front", "left", "right"] as const;

export type EnrollmentPrompt = (typeof EMPLOYEE_FACE_ENROLLMENT_PROMPTS)[number];
export type LoginPrompt = (typeof EMPLOYEE_FACE_LOGIN_PROMPTS)[number];

export type FaceSample = {
  prompt: EnrollmentPrompt | LoginPrompt;
  descriptor: number[];
  score: number;
  yaw: number;
  pitch: number;
  capturedAt: string;
};
