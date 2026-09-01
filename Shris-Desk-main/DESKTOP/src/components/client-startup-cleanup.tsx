"use client";

import { useEffect } from "react";

export function ClientStartupCleanup() {
  useEffect(() => {
    async function cleanup() {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        }
      } catch {
        // Ignore cleanup failures in the client boot path.
      }
    }

    void cleanup();
  }, []);

  return null;
}
