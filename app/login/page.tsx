"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Lock, User } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        setError(data.error || "Login failed");
        return;
      }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid items-center justify-center p-6 bg-brand-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-brand-200"
      >
        <div className="mb-8 items-center text-center">
          <div className="mx-auto w-12 h-12 bg-brand-900 rounded-xl flex items-center justify-center mb-4 text-white">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-semibold text-brand-900 mb-2 tracking-tight">Superadmin Login</h2>
          <p className="text-brand-500 text-sm">
            Sign in to access the platform
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-brand-700 ml-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-brand-400" />
              </div>
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-200 rounded-lg text-brand-900 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all duration-200"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoCapitalize="none"
                autoComplete="username"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-brand-700 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-brand-400" />
              </div>
              <input
                type="password"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-200 rounded-lg text-brand-900 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all duration-200"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="mt-2 w-full py-2.5 px-4 bg-brand-900 hover:bg-brand-800 text-white font-medium rounded-lg transition-colors duration-200 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed" 
            type="submit" 
            disabled={loading}
          >
            {loading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : "Sign In"}
          </motion.button>
        </form>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-6 p-3 bg-red-50 border border-red-100 rounded-lg text-center"
          >
            <p className="text-red-600 font-medium text-sm">{error}</p>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
