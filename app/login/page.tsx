"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed. Please verify your credentials.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Unable to connect to the authentication service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 select-none">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-[480px]"
      >
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-8 sm:p-12">
          {/* Logo & Heading */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="-my-6 sm:-my-8 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Qrave"
                className="h-36 sm:h-44 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
              Sign in
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Username Input */}
            <div className="flex flex-col gap-2 group">
              <label className="text-xs font-semibold text-slate-700 ml-0.5">
                Username
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2 group">
              <label className="text-xs font-semibold text-slate-700 ml-0.5">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.12 }}
              className="mt-2 w-full py-3.5 px-5 rounded-xl font-semibold text-base sm:text-sm text-white bg-[#FF5500] hover:bg-[#E64D00] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center gap-2 shadow-sm"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={17} />
                </>
              )}
            </motion.button>
          </form>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.15 }}
                className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"
              >
                <AlertCircle size={15} className="shrink-0 text-red-600 mt-0.5" />
                <span className="leading-snug font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  );
}
