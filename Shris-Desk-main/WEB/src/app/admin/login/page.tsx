"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatus(data.message || "Invalid login credentials");
        return;
      }

      // 1. DATA MANIPULATION: Check role access BEFORE persisting to localStorage
      const allowedRoles = ["company_admin", "admin", "super_admin"];
      const userRole = data.profile?.role;

      if (!userRole || !allowedRoles.includes(userRole)) {
        setStatus("Access denied. Account does not have admin permissions.");
        localStorage.removeItem("user");
        localStorage.removeItem("profile");
        return;
      }

      // 2. DATA MANIPULATION: Persist sanitized session state for route guards
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      if (data.profile) {
        localStorage.setItem("profile", JSON.stringify(data.profile));
      }

      // Direct redirection to admin panel
      window.location.href = "/admin/dashboard";
    } catch (err) {
      console.error("Login request error:", err);
      setStatus("Unexpected server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-900 px-4 py-8">
      <div className="w-full max-w-md backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 text-white">
        
        {/* Header UI */}
        <div className="text-center mb-6">
          <p className="text-xs tracking-widest uppercase text-indigo-200 font-semibold">
            SmartDesk Admin
          </p>
          <h2 className="text-white text-3xl font-extrabold mt-1">
            Welcome Back
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Sign in with your company admin credentials
          </p>
        </div>

        {/* Error Alert UI */}
        {status && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/50 text-sm text-red-200 flex items-center gap-2">
            <span className="font-bold">⚠️</span>
            <span>{status}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-300 mb-1 font-medium">
              Work Email
            </label>
            <input
              type="email"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status) setStatus(null);
              }}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-black/20 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-300 mb-1 font-medium">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (status) setStatus(null);
              }}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-black/20 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition duration-150 shadow-lg shadow-indigo-600/30 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              "Sign In to Admin Panel"
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="flex justify-between items-center mt-6 text-xs text-slate-300 border-t border-white/10 pt-4">
          <Link href="/admin/forgot" className="hover:text-white transition underline-offset-4 hover:underline">
            Forgot password?
          </Link>
          <Link href="/" className="hover:text-white transition underline-offset-4 hover:underline">
            Back to Website
          </Link>
        </div>
      </div>
    </div>
  );
}