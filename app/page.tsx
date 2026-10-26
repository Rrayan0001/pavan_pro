"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Asme } from "@/components/templates/asme/asme";

function subscribeToEmail(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("bookcompass_auth_change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("bookcompass_auth_change", callback);
  };
}

function getEmailSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bookcompass_user_email");
}

function getEmailServerSnapshot(): string | null {
  return null;
}

export default function LandingPage() {
  const router = useRouter();
  const userEmail = useSyncExternalStore(subscribeToEmail, getEmailSnapshot, getEmailServerSnapshot);

  // If the user is already logged in, redirect directly to the main chatbot page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("bookcompass_user_email");
      if (stored && stored.includes("@")) {
        router.replace("/chat");
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("bookcompass_user_email");
    window.dispatchEvent(new Event("bookcompass_auth_change"));
  };

  return (
    <div className="dark min-h-screen bg-black text-white selection:bg-white/20">
      <Asme userEmail={userEmail} onLogout={handleLogout} />
    </div>
  );
}
