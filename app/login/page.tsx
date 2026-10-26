"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Compass, ArrowRight, ArrowLeft, Mail, Sparkles, CheckCircle2 } from "lucide-react";
import { AsmeStyles } from "@/components/templates/asme/styles";
import { inter, instrumentSerif } from "@/components/templates/asme/fonts";
import { Serif } from "@/components/templates/asme/primitives";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect straight to /chat
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("bookcompass_user_email");
      if (stored && stored.includes("@")) {
        router.replace("/chat");
      }
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    localStorage.setItem("bookcompass_user_email", cleanEmail);
    window.dispatchEvent(new Event("bookcompass_auth_change"));
    router.push("/chat");
  };

  const handleGuest = () => {
    router.push("/chat");
  };

  return (
    <div
      className={cn(
        "asme dark min-h-screen relative flex flex-col justify-between bg-black text-white [font-family:var(--font-asme-sans),ui-sans-serif,sans-serif] px-4 py-8 overflow-hidden",
        inter.variable,
        instrumentSerif.variable
      )}
    >
      <AsmeStyles />
      <div aria-hidden className="glow-top absolute inset-0 pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 max-w-5xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-white/80 hover:text-white transition-all"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>

        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white">
            <Compass size={18} />
          </div>
          <span className="text-base font-semibold tracking-tight text-white">BookCompass</span>
        </Link>
      </header>

      {/* Center Auth Card */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-12">
        <div className="liquid-glass rounded-3xl p-8 sm:p-10 border border-white/15 bg-black/60 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-2">
              <Sparkles size={12} />
              <span>Instant Cloud Sync</span>
            </div>
            <h1 className="text-3xl sm:text-4xl [font-family:var(--font-asme-serif)] tracking-tight text-white">
              Sign in to <Serif className="text-white/70">BookCompass</Serif>
            </h1>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Save your book chats, revisit reading ladders, and access recommendations across all devices.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label htmlFor="login-email" className="text-xs font-medium text-white/70 tracking-wide uppercase font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-sm text-white outline-none transition-all focus:border-white/40 focus:bg-white/10 placeholder:text-white/30"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-rose-400 font-medium pl-1">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl py-3.5 px-5 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 border border-white/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <span className="text-white font-medium">{isSubmitting ? "Connecting..." : "Continue with Email"}</span>
              <ArrowRight size={16} className="text-white" />
            </button>
          </form>

          <div className="relative flex items-center justify-center border-t border-white/10 pt-6">
            <span className="absolute -top-3 bg-black px-3 text-[11px] text-white/40 uppercase font-mono">
              or
            </span>
          </div>

          <button
            type="button"
            onClick={handleGuest}
            className="w-full rounded-2xl py-2.5 px-4 text-xs font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer"
          >
            Continue as Guest (without saving chats)
          </button>

          <div className="pt-2 flex flex-col gap-2 text-[11px] text-white/50 border-t border-white/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span>No password required &bull; 1-click cloud sync</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span>Deterministic recommendations & verified ISBNs</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-white/40 py-4">
        &copy; 2026 BookCompass. All rights reserved.
      </footer>
    </div>
  );
}
