'use client';

import Link from 'next/link';
import { Compass, User, MessageSquare, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeProvider';

const NAV_LINKS = [
  { label: 'Discover', href: '#discover' },
  { label: 'Reading Ladder', href: '#ladder' },
  { label: 'Methodology', href: '#methodology' },
  { label: 'Features', href: '#features' },
];

interface NavbarProps {
  userEmail?: string | null;
  onLogout?: () => void;
}

export const Navbar = ({ userEmail, onLogout }: NavbarProps) => {
  return (
    <header className="relative z-30 px-4 sm:px-6 py-6">
      <nav className="liquid-glass mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="BookCompass home" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-foreground/10 text-foreground">
              <Compass size={18} />
            </div>
            <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">BookCompass</span>
          </Link>

          <div className="ms-6 hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-medium tracking-wide text-foreground/70 transition-colors hover:text-foreground uppercase"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {userEmail ? (
            <div className="flex items-center gap-2">
              <Link
                href="/chat"
                className="liquid-glass flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-medium text-foreground transition-all hover:bg-foreground/10 cursor-pointer shadow-sm"
              >
                <MessageSquare size={14} />
                <span>Open Chat</span>
              </Link>
              <button
                type="button"
                onClick={onLogout}
                title="Log out"
                className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-foreground/80 transition-all hover:bg-foreground/10 hover:text-foreground cursor-pointer"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="liquid-glass rounded-full px-5 py-2 text-xs sm:text-sm font-medium text-foreground transition-all hover:bg-foreground/10 cursor-pointer flex items-center gap-1.5 shadow-sm"
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
