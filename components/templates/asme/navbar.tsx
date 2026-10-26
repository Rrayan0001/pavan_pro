'use client';

import { Compass, PanelLeft, User, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeProvider';

const NAV_LINKS = [
  { label: 'Discover', href: '#discover' },
  { label: 'Reading Ladder', href: '#ladder' },
  { label: 'Methodology', href: '#methodology' },
  { label: 'Features', href: '#features' },
];

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  userEmail?: string | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  chatCount?: number;
}

export const Navbar = ({
  onToggleSidebar,
  isSidebarOpen,
  userEmail,
  onOpenAuth,
  onLogout,
  chatCount = 0,
}: NavbarProps) => {
  return (
    <header className="relative z-30 px-4 sm:px-6 py-6">
      <nav className="liquid-glass mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-all hover:bg-foreground/10 hover:text-foreground cursor-pointer"
              title={isSidebarOpen ? 'Close chat sidebar' : 'Open chat sidebar'}
              aria-label="Toggle chat sidebar"
            >
              <PanelLeft size={16} className="text-foreground" />
              <span className="hidden sm:inline">Chats</span>
              {userEmail && chatCount > 0 && (
                <span className="ml-0.5 rounded-full bg-foreground/15 px-1.5 py-0.2 text-[10px] font-bold">
                  {chatCount}
                </span>
              )}
            </button>
          )}

          <a href="#" aria-label="BookCompass home" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-foreground/10 text-foreground">
              <Compass size={18} />
            </div>
            <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">BookCompass</span>
          </a>

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
              <span
                className="hidden md:inline-block max-w-[140px] truncate text-xs text-foreground/80 font-mono"
                title={userEmail}
              >
                {userEmail}
              </span>
              <button
                type="button"
                onClick={onLogout}
                title="Log out"
                className="liquid-glass flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-foreground/10 cursor-pointer"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAuth}
                className="liquid-glass rounded-full px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium text-foreground transition-all hover:bg-foreground/10 cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <User size={14} />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
