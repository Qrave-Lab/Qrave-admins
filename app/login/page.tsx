"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"password" | "code">("password");
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const router = useRouter();

  const handleCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 && /timed out/i.test(data.error || "")) {
          setStep("password");
          setPassword("");
          setCode("");
        }
        setError(data.error || "That code didn't work.");
        return;
      }
      if (data.used_recovery_code && typeof data.recovery_codes_left === "number" && data.recovery_codes_left <= 2) {
        router.push("/security");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Unable to connect to the authentication service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      if (data.mfa_required) {
        setStep("code");
        setCode("");
        return;
      }
      router.push(data.setup_required ? "/security" : "/dashboard");
    } catch {
      setError("Unable to connect to the authentication service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50">
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
              {step === "password" ? "Sign in" : "Enter your code"}
            </h1>
            {step === "code" && (
              <p className="text-sm text-slate-500 mt-1">
                {useRecovery ? "Enter one of your recovery codes." : "Open your authenticator app and enter the 6-digit code."}
              </p>
            )}
          </div>

          {step === "code" ? (
            <form onSubmit={handleCode} aria-busy={loading} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 group">
                <label htmlFor="code" className="text-xs font-semibold text-slate-700 ml-0.5">
                  {useRecovery ? "Recovery code" : "Code"}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <ShieldCheck size={18} />
                  </div>
                  <input
                    id="code"
                    key={useRecovery ? "recovery" : "totp"}
                    type="text"
                    inputMode={useRecovery ? "text" : "numeric"}
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={useRecovery ? 16 : 6}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm tracking-widest text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
                    placeholder={useRecovery ? "xxxxx-xxxxx" : "123456"}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                className="mt-1 w-full py-3.5 px-5 rounded-xl font-semibold text-base sm:text-sm text-white bg-[#FF5500] hover:bg-[#E64D00] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center gap-2 shadow-sm"
                type="submit"
                disabled={loading}
              >
                {loading ? "Checking..." : "Verify"}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-slate-500 hover:text-slate-900 flex items-center gap-1"
                  onClick={() => {
                    setStep("password");
                    setPassword("");
                    setError("");
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  className="text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline"
                  onClick={() => {
                    setUseRecovery((v) => !v);
                    setCode("");
                    setError("");
                  }}
                >
                  {useRecovery ? "Use app code" : "Lost your phone? Use a recovery code"}
                </button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleLogin} aria-busy={loading} className="flex flex-col gap-5">
            {/* Username Input */}
            <div className="flex flex-col gap-2 group">
              <label htmlFor="username" className="text-xs font-semibold text-slate-700 ml-0.5">
                Username
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                  <User size={18} />
                </div>
                <input
                  id="username"
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
              <label htmlFor="password" className="text-xs font-semibold text-slate-700 ml-0.5">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
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
                  className="absolute right-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md"
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
                  <div aria-hidden className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          )}

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.15 }}
                role="alert"
                className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2"
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
