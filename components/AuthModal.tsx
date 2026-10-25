"use client";

import { useState } from "react";
import { User, LogIn, LogOut, Mail, CheckCircle2 } from "lucide-react";

interface AuthModalProps {
  email: string | null;
  onLogin: (email: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function AuthModal({
  email,
  onLogin,
  onLogout,
  isOpen: controlledIsOpen,
  onOpenChange,
  showTrigger = true,
}: AuthModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (open: boolean) => {
    if (isControlled) {
      onOpenChange?.(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const [inputEmail, setInputEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = inputEmail.trim().toLowerCase();
    if (!cleaned || !cleaned.includes("@") || !cleaned.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    onLogin(cleaned);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {showTrigger && (
        email ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              <User size={13} />
              <span className="max-w-[140px] truncate">{email}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )
      )}

      {/* Modal dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Mail size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-base">Save Your Reading Chats</h3>
                <p className="text-xs text-muted-foreground">
                  Access your book recommendations anytime
                </p>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {error && <p className="text-xs text-destructive mt-1">{error}</p>}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Continue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
