"use client";

import type React from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-white">
      <AppNavbar />
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#141417] p-6">
          <div className="mb-5 flex flex-col items-center text-center">
            <Image
              src="/brand/orderzero-logo.jpg"
              alt="OrderZero Logo"
              width={44}
              height={44}
              className="mb-2 rounded-lg border border-zinc-800"
            />
            <h1 className="text-lg font-bold">Sign in to OrderZero</h1>
            <p className="text-xs text-zinc-400">
              Email, Google OAuth, or Indian Mobile OTP (+91)
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-lg border border-zinc-800 bg-[#09090B] p-1 text-xs">
            <button
              type="button"
              onClick={() => setMethod("email")}
              className={`rounded py-1.5 font-semibold ${
                method === "email" ? "bg-[#10B981] text-[#09090B]" : "text-zinc-400"
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => setMethod("otp")}
              className={`rounded py-1.5 font-semibold ${
                method === "otp" ? "bg-[#10B981] text-[#09090B]" : "text-zinc-400"
              }`}
            >
              Mobile OTP (+91)
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 text-xs">
            {method === "email" ? (
              <>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.in"
                  className="w-full rounded-md border border-zinc-700 bg-[#09090B] px-3 py-2.5 text-white"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-md border border-zinc-700 bg-[#09090B] px-3 py-2.5 text-white"
                />
                <button
                  type="submit"
                  className="w-full rounded-md bg-[#10B981] py-2.5 font-bold text-[#09090B] hover:bg-emerald-400"
                >
                  Continue to Dashboard
                </button>
              </>
            ) : (
              <>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-md border border-zinc-700 bg-[#09090B] px-3 py-2.5 font-mono text-white"
                />
                {otpSent && (
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full rounded-md border border-zinc-700 bg-[#09090B] px-3 py-2.5 font-mono text-white"
                  />
                )}
                {!otpSent ? (
                  <button
                    type="button"
                    onClick={() => setOtpSent(true)}
                    className="w-full rounded-md bg-[#8B5CF6] py-2.5 font-bold text-white"
                  >
                    Send SMS OTP
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="w-full rounded-md bg-[#10B981] py-2.5 font-bold text-[#09090B]"
                  >
                    Verify OTP & Sign In
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full rounded-md border border-zinc-700 bg-[#09090B] py-2.5 font-semibold text-zinc-200 hover:border-zinc-500"
            >
              Continue with Google
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-zinc-500">
            By signing in, you consent to encrypted storage of your account and
            broker tokens under India&apos;s DPDP Act 2023.
          </p>
        </div>
      </main>
      <SebiDisclaimerBar />
    </div>
  );
}
