'use client';

import * as React from 'react';
import { MotionConfig } from 'framer-motion';
import { BookOpen, AlertCircle, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { About } from './about';
import { FeaturedVideo } from './featured-video';
import { inter, instrumentSerif } from './fonts';
import { Footer } from './footer';
import { Hero } from './hero';
import { Philosophy } from './philosophy';
import { Services } from './services';
import { AsmeStyles } from './styles';

import { BookCard, BookCardSkeleton } from '@/components/BookCard';
import { ReadingLadder } from '@/components/ReadingLadder';
import { ChatStream } from '@/components/ChatStream';
import type { ChatTurn } from '@/components/ChatSidebar';
import type { Book, LadderStep, Genre, Level } from '@/lib/schemas';

interface AsmeLandingProps {
  turns: ChatTurn[];
  currentPrompt: {
    message: string;
    genre?: Genre;
    level?: Level;
  } | null;
  books: Book[];
  ladder: LadderStep[];
  streamText: string;
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
  onSubmitPrompt: (payload: { message: string; genre?: Genre; level?: Level }) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  userEmail: string | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  chatCount: number;
}

export const Asme = ({
  turns,
  currentPrompt,
  books,
  ladder,
  streamText,
  isStreaming,
  isLoading,
  error,
  onClearError,
  onSubmitPrompt,
  onToggleSidebar,
  isSidebarOpen,
  userEmail,
  onOpenAuth,
  onLogout,
  chatCount,
}: AsmeLandingProps) => {
  const [followUpMessage, setFollowUpMessage] = React.useState('');
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const hasContent = turns.length > 0 || isLoading || isStreaming || (currentPrompt && (streamText || books.length > 0));

  React.useEffect(() => {
    if (hasContent && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hasContent]);

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpMessage.trim() || isLoading || isStreaming) return;
    const msg = followUpMessage.trim();
    setFollowUpMessage('');
    onSubmitPrompt({ message: msg });
  };

  return (
    <MotionConfig reducedMotion="user">
      <main
        className={cn(
          'asme',
          inter.variable,
          instrumentSerif.variable,
          'relative min-h-svh bg-background [font-family:var(--font-asme-sans),ui-sans-serif,sans-serif] text-foreground antialiased',
        )}
      >
        <AsmeStyles />

        {/* Hero Section */}
        <Hero
          onSubmitPrompt={onSubmitPrompt}
          isLoading={isLoading || isStreaming}
          onToggleSidebar={onToggleSidebar}
          isSidebarOpen={isSidebarOpen}
          userEmail={userEmail}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          chatCount={chatCount}
        />

        {/* Interactive Recommendation Thread Section */}
        {hasContent && (
          <section
            ref={resultsRef}
            id="recommendation-results"
            className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-12 space-y-10 scroll-mt-24"
          >
            {/* Error Notification */}
            {error && (
              <div className="liquid-glass flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Unable to fetch recommendations</p>
                  <p className="mt-0.5 opacity-90">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={onClearError}
                  className="text-xs underline hover:opacity-80 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Conversation History: Prior Prompts & Answers */}
            {turns.length > 0 && (
              <div className="space-y-12">
                {turns.map((turn, tIdx) => (
                  <div
                    key={turn.id || tIdx}
                    className="space-y-6 rounded-3xl border border-foreground/10 bg-card/30 p-6 sm:p-8 backdrop-blur-md"
                  >
                    {/* User Prompt */}
                    <div className="flex items-start justify-end">
                      <div className="liquid-glass max-w-2xl rounded-2xl rounded-tr-xs bg-foreground/10 p-4 text-foreground space-y-1 border border-foreground/15">
                        <div className="flex items-center justify-end gap-2 text-[11px] text-foreground/60 font-mono">
                          <span>Turn #{tIdx + 1}</span>
                          {turn.genre && <span>&bull; {turn.genre}</span>}
                          {turn.level && <span className="capitalize">&bull; {turn.level}</span>}
                        </div>
                        <p className="text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap text-left">
                          {turn.userMessage}
                        </p>
                      </div>
                    </div>

                    {/* AI Response Explanation */}
                    {turn.explanation && (
                      <div className="rounded-2xl p-1">
                        <ChatStream content={turn.explanation} isStreaming={false} error={null} />
                      </div>
                    )}

                    {/* Book Cards */}
                    {turn.books && turn.books.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                          <div className="flex items-center gap-2">
                            <BookOpen size={18} className="text-foreground" />
                            <h3 className="text-base font-semibold text-foreground">
                              Curated Books ({turn.books.length})
                            </h3>
                          </div>
                          <span className="text-xs text-foreground/50 font-mono">
                            Deterministic Rubric
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {turn.books.map((book, bIdx) => (
                            <BookCard key={book.id || bIdx} book={book} index={bIdx} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reading Ladder */}
                    {turn.ladder && turn.ladder.length > 0 && (
                      <div className="liquid-glass rounded-2xl p-5 border border-foreground/10">
                        <ReadingLadder steps={turn.ladder} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* In-Flight Current Streaming Turn */}
            {(isLoading || isStreaming || (currentPrompt && (streamText || books.length > 0))) && (
              <div className="space-y-6 rounded-3xl border border-foreground/15 bg-card/40 p-6 sm:p-8 backdrop-blur-md">
                {currentPrompt && (
                  <div className="flex items-start justify-end">
                    <div className="liquid-glass max-w-2xl rounded-2xl rounded-tr-xs bg-foreground/10 p-4 text-foreground space-y-1 border border-foreground/15">
                      <div className="flex items-center justify-end gap-2 text-[11px] text-foreground/60 font-mono">
                        <span>Current Inquiry</span>
                        {currentPrompt.genre && <span>&bull; {currentPrompt.genre}</span>}
                        {currentPrompt.level && <span className="capitalize">&bull; {currentPrompt.level}</span>}
                      </div>
                      <p className="text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap text-left">
                        {currentPrompt.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Skeletons while fetching */}
                {isLoading && (
                  <div className="space-y-4">
                    <div className="h-6 w-48 rounded-full bg-foreground/10 animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <BookCardSkeleton />
                      <BookCardSkeleton />
                    </div>
                  </div>
                )}

                {/* Live Stream Text */}
                {streamText && (
                  <div className="rounded-2xl p-1">
                    <ChatStream content={streamText} isStreaming={isStreaming} error={error} />
                  </div>
                )}

                {/* Live Streamed Books */}
                {books.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-foreground" />
                        <h3 className="text-base font-semibold text-foreground">
                          Recommended Books ({books.length})
                        </h3>
                      </div>
                      <span className="text-xs text-foreground/50 font-mono">
                        Scoring & Verifying
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {books.map((book, bIdx) => (
                        <BookCard key={book.id || bIdx} book={book} index={bIdx} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Streamed Reading Ladder */}
                {ladder.length > 0 && (
                  <div className="liquid-glass rounded-2xl p-5 border border-foreground/10">
                    <ReadingLadder steps={ladder} />
                  </div>
                )}
              </div>
            )}

            {/* Follow-Up Inquiry Bar */}
            <form
              onSubmit={handleFollowUpSubmit}
              className="liquid-glass flex items-center gap-3 rounded-full px-5 py-3 border border-foreground/15 shadow-lg"
            >
              <input
                type="text"
                value={followUpMessage}
                onChange={(e) => setFollowUpMessage(e.target.value)}
                placeholder="Ask a follow-up or refine (e.g. 'Give me something darker with faster pacing')..."
                className="min-w-0 flex-1 bg-transparent text-sm sm:text-base text-foreground outline-none placeholder:text-foreground/40"
                disabled={isLoading || isStreaming}
              />
              <button
                type="submit"
                disabled={!followUpMessage.trim() || isLoading || isStreaming}
                className="liquid-glass inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                <ArrowRight size={16} />
              </button>
            </form>
          </section>
        )}

        {/* About Section */}
        <About />

        {/* Featured Video / Showcase Section */}
        <FeaturedVideo />

        {/* Philosophy Section */}
        <Philosophy />

        {/* Engine Features / Services Section */}
        <Services />

        {/* Footer */}
        <Footer />
      </main>
    </MotionConfig>
  );
};

export default Asme;
