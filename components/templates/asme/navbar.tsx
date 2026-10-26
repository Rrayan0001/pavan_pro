'use client';

import Link from 'next/link';
import { Compass, User, MessageSquare, LogOut } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Methodology', href: '#methodology' },
  { label: 'About', href: '#about' },
];

interface NavbarProps {
  userEmail?: string | null;
  onLogout?: () => void;
}

export const Navbar = ({ userEmail, onLogout }: NavbarProps) => {
  return (
    <header className="relative z-30 px-4 sm:px-6 py-6 text-white">
      <nav className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 sm:px-8 py-3.5 border border-white/15 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="BookCompass home" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white">
              <Compass size={18} />
            </div>
            <span className="text-base sm:text-lg font-semibold tracking-tight text-white">BookCompass</span>
          </Link>

          <div className="ms-8 hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-medium tracking-wide text-white/70 transition-colors hover:text-white uppercase"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userEmail ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/chat"
                className="liquid-glass flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-medium text-white transition-all hover:bg-white/10 cursor-pointer shadow-sm"
              >
                <MessageSquare size={14} />
                <span>Open Chat</span>
              </Link>
              <button
                type="button"
                onClick={onLogout}
                title="Log out"
                className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="liquid-glass rounded-full px-6 py-2 text-xs sm:text-sm font-medium text-white transition-all hover:bg-white/10 cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <User size={14} />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
