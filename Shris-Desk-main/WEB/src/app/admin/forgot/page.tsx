"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/login`,
      });

      if (error) {
        setStatus(error.message);
      } else {
        setStatus("Password reset email sent successfully.");
      }
    } catch (err) {
      setStatus("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-white via-white to-blue-500 px-4">
      
      <div className="w-full max-w-md backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 text-white">
        
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-sm tracking-widest uppercase text-gray-300">
            Password Reset
          </p>
          <h2 className="text-indigo-600 text-2xl font-bold mt-2">
            Recover Admin Access
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter your admin email to receive a reset link
          </p>
        </div>

        {/* Status Message */}
        {status && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-400 text-sm text-blue-100">
            {status}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleReset} className="space-y-4">
          
          <input
            type="email"
            placeholder="Work Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white text-white"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-white text-indigo-600 font-semibold hover:bg-gray-100 transition flex items-center justify-center"
          >
            {loading ? (
              <span className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full"></span>
            ) : (
              "Send Reset Email"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="flex justify-between mt-6 text-sm text-gray-200">
          <a href="/admin/login" className="hover:underline">
            Back to Sign In
          </a>
          <a href="/" className="hover:underline">
            Back to Home
          </a>
        </div>

      </div>
    </div>
  );
}