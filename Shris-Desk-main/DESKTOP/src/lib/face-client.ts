import type {
  EnrollmentPrompt,
  FaceSample,
  LoginPrompt,
} from "./face-auth-shared";

type FaceApiModule = typeof import("face-api.js");

export type PromptKey = EnrollmentPrompt | LoginPrompt;
export type FaceSampleMap = Partial<Record<PromptKey, FaceSample>>;

export type FaceAnalysisResult = {
  descriptor: number[];
  score: number;
  yaw: number;
  pitch: number;
  faceWidthRatio: number;
  faceHeightRatio: number;
  horizontalOffset: number;
  verticalOffset: number;
};

const MODEL_URI = "/models";
const FACE_DETECTION_OPTIONS = {
  inputSize: 320,
  scoreThreshold: 0.45,
};

let faceApiPromise: Promise<FaceApiModule> | null = null;

function averagePoint(points: Array<{ x: number; y: number }>) {
  return points.reduce(
    (acc, point) => ({
      x: acc.x + point.x / points.length,
      y: acc.y + point.y / points.length,
    }),
    { x: 0, y: 0 },
  );
}

function promptSatisfied(
  prompt: PromptKey,
  yaw: number,
  pitch: number,
  existingSamples?: FaceSampleMap,
) {
  const frontPitch = existingSamples?.front?.pitch;

  switch (prompt) {
    case "front":
      return Math.abs(yaw) <= 0.2 && pitch >= 0.18 && pitch <= 0.82;
    case "left":
      if (Math.abs(yaw) < 0.04) {
        return false;
      }

      if (existingSamples?.right) {
        return Math.sign(yaw) !== Math.sign(existingSamples.right.yaw);
      }

      return true;
    case "right":
      if (Math.abs(yaw) < 0.04) {
        return false;
      }

      if (existingSamples?.left) {
        return (
          Math.sign(yaw) !== Math.sign(existingSamples.left.yaw) ||
          Math.abs(yaw - existingSamples.left.yaw) >= 0.06
        );
      }

      return true;
    case "up":
      if (typeof frontPitch === "number") {
        if (pitch > frontPitch - 0.05) {
          return false;
        }

        if (existingSamples?.down) {
          return pitch < existingSamples.down.pitch;
        }

        return true;
      }

      return pitch <= 0.42;
    case "down":
      if (typeof frontPitch === "number") {
        if (pitch < frontPitch + 0.05) {
          return false;
        }

        if (existingSamples?.up) {
          return pitch > existingSamples.up.pitch;
        }

        return true;
      }

      return pitch >= 0.58;
    default:
      return false;
  }
}

export function promptInstruction(prompt: PromptKey) {
  switch (prompt) {
    case "front":
      return "Look straight into the camera with your face centered.";
    case "left":
      return "Turn your face slightly to one side so the camera gets a side-angle sample.";
    case "right":
      return "Turn your face to a clearly different side angle from the previous side capture.";
    case "up":
      return "Lift your chin slightly so the camera gets a higher face angle.";
    case "down":
      return "Lower your chin slightly so the camera gets a lower face angle.";
    default:
      return "Align your face with the camera.";
  }
}

export function getPromptFeedback(
  prompt: PromptKey,
  analysis: FaceAnalysisResult,
  existingSamples?: FaceSampleMap,
) {
  const frontPitch = existingSamples?.front?.pitch;

  if (analysis.score < 0.5) {
    return "Hold still for a moment so the face can be detected more clearly.";
  }

  if (analysis.faceWidthRatio < 0.16 || analysis.faceHeightRatio < 0.24) {
    return "Move a little closer so your face fills more of the frame.";
  }

  if (Math.abs(analysis.horizontalOffset) > 0.24) {
    return analysis.horizontalOffset > 0
      ? "Move slightly to your right so your face stays centered."
      : "Move slightly to your left so your face stays centered.";
  }

  if (Math.abs(analysis.verticalOffset) > 0.26) {
    return analysis.verticalOffset > 0
      ? "Raise the camera or sit a bit higher so your face is centered."
      : "Lower the camera a little so your face is centered.";
  }

  if (promptSatisfied(prompt, analysis.yaw, analysis.pitch, existingSamples)) {
    return `Pose looks good for ${prompt}. Press capture now.`;
  }

  switch (prompt) {
    case "front":
      if (analysis.yaw < -0.2) {
        return "Turn slightly to your right until your face looks straight.";
      }
      if (analysis.yaw > 0.2) {
        return "Turn slightly to your left until your face looks straight.";
      }
      if (analysis.pitch < 0.18) {
        return "Lower your chin a little for the straight-on capture.";
      }
      if (analysis.pitch > 0.82) {
        return "Raise your chin a little for the straight-on capture.";
      }
      return "Keep your face centered and look straight into the camera.";
    case "left":
      if (existingSamples?.right) {
        return "Turn to the opposite side from your earlier side-angle capture.";
      }
      return "Turn your face a little more to either side.";
    case "right":
      if (existingSamples?.left) {
        return "Turn to a noticeably different side angle from your earlier side capture. Opposite side is best, but a stronger turn also works.";
      }
      return "Turn your face a little more to either side.";
    case "up":
      if (typeof frontPitch === "number" && analysis.pitch > frontPitch - 0.05) {
        return "Lift your chin a little more than your straight-on capture.";
      }
      if (existingSamples?.down && analysis.pitch >= existingSamples.down.pitch) {
        return "Move back toward a higher angle, opposite from your down capture.";
      }
      return "Lift your chin a little more while keeping your face visible.";
    case "down":
      if (typeof frontPitch === "number" && analysis.pitch < frontPitch + 0.05) {
        return "Lower your chin a little more than your straight-on capture.";
      }
      if (existingSamples?.up && analysis.pitch <= existingSamples.up.pitch) {
        return "Move back toward a lower angle, opposite from your up capture.";
      }
      return "Lower your chin a little more while keeping your eyes visible.";
    default:
      return promptInstruction(prompt);
  }
}

async function getFaceApi() {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      const faceapi = await import("face-api.js");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
      ]);
      return faceapi;
    })();
  }

  return faceApiPromise;
}

export async function ensureFaceModels() {
  await getFaceApi();
}

async function detectFaces(video: HTMLVideoElement) {
  const faceapi = await getFaceApi();

  return faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions(FACE_DETECTION_OPTIONS))
    .withFaceLandmarks()
    .withFaceDescriptors();
}

export async function analyzeCurrentFrame(video: HTMLVideoElement) {
  const detections = await detectFaces(video);

  if (!detections.length) {
    return { error: "No face detected. Move closer and improve the lighting." };
  }

  if (detections.length > 1) {
    return { error: "Multiple faces detected. Keep only one person in the camera frame." };
  }

  const detection = detections[0];
  const detectionBox = detection.detection.box;
  const leftEye = averagePoint(detection.landmarks.getLeftEye());
  const rightEye = averagePoint(detection.landmarks.getRightEye());
  const nose = averagePoint(detection.landmarks.getNose().slice(-3));
  const mouth = averagePoint(detection.landmarks.getMouth());
  const eyeCenter = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
  };
  const eyeDistance = Math.max(
    Math.abs(rightEye.x - leftEye.x),
    Math.abs(rightEye.y - leftEye.y),
    1,
  );
  const eyeToMouthDistance = Math.max(mouth.y - eyeCenter.y, 1);
  const yaw = (nose.x - eyeCenter.x) / eyeDistance;
  const pitch = (nose.y - eyeCenter.y) / eyeToMouthDistance;
  const faceCenterX = detectionBox.x + detectionBox.width / 2;
  const faceCenterY = detectionBox.y + detectionBox.height / 2;
  const horizontalOffset = faceCenterX / Math.max(video.videoWidth, 1) - 0.5;
  const verticalOffset = faceCenterY / Math.max(video.videoHeight, 1) - 0.5;

  return {
    analysis: {
      descriptor: Array.from(detection.descriptor),
      score: detection.detection.score,
      yaw,
      pitch,
      faceWidthRatio: detectionBox.width / Math.max(video.videoWidth, 1),
      faceHeightRatio: detectionBox.height / Math.max(video.videoHeight, 1),
      horizontalOffset,
      verticalOffset,
    } satisfies FaceAnalysisResult,
  };
}

export async function captureFaceSample(
  video: HTMLVideoElement,
  prompt: PromptKey,
  existingSamples?: FaceSampleMap,
) {
  const result = await analyzeCurrentFrame(video);

  if ("error" in result) {
    return result;
  }

  const feedback = getPromptFeedback(prompt, result.analysis, existingSamples);

  if (!promptSatisfied(prompt, result.analysis.yaw, result.analysis.pitch, existingSamples)) {
    return {
      error: feedback,
      analysis: result.analysis,
    };
  }

  return {
    sample: {
      prompt,
      descriptor: result.analysis.descriptor,
      score: result.analysis.score,
      yaw: result.analysis.yaw,
      pitch: result.analysis.pitch,
      capturedAt: new Date().toISOString(),
    } satisfies FaceSample,
  };
}
