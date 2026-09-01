import { Suspense } from "react";

import { FaceCompleteClient } from "@/components/face-complete-client";

function FaceCompleteFallback() {
  return (
    <section className="panel-strong w-full rounded-[30px] p-8">
      <span className="eyebrow">Face Sign-In</span>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
        Finalizing secure employee access
      </h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        Completing secure face sign-in...
      </p>
    </section>
  );
}

export default function FaceCompletePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-1 items-center px-6 py-10">
      <Suspense fallback={<FaceCompleteFallback />}>
        <FaceCompleteClient />
      </Suspense>
    </main>
  );
}
