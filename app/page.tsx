"use client";

import { useState, useRef } from "react";
import { Compass, BookOpen, Layers, Sparkles, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeProvider";
import { PreferenceForm } from "@/components/PreferenceForm";
import { BookCard, BookCardSkeleton } from "@/components/BookCard";
import { ReadingLadder } from "@/components/ReadingLadder";
import { ChatStream } from "@/components/ChatStream";
import { ExampleChips, type ExampleQuery } from "@/components/ExampleChips";
import type { Book, LadderStep, Genre, Level } from "@/lib/schemas";

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [ladder, setLadder] = useState<LadderStep[]>([]);
  const [streamText, setStreamText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<{
    message: string;
    genre?: Genre;
    level?: Level;
  } | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  const handleRecommend = async (payload: {
    message: string;
    genre?: Genre;
    level?: Level;
  }) => {
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setBooks([]);
    setLadder([]);
    setStreamText("");

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            data.error || "Rate limit reached. Please wait a minute and try again."
          );
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received from server.");
      }

      setIsLoading(false); // Skeletons can turn into incoming cards

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventBlock of events) {
          const lines = eventBlock.split("\n");
          let eventType = "";
          let dataText = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataText = line.slice(6).trim();
            }
          }

          if (eventType && dataText) {
            try {
              const parsedData = JSON.parse(dataText);

              if (eventType === "books") {
                setBooks(parsedData as Book[]);
              } else if (eventType === "ladder") {
                setLadder(parsedData as LadderStep[]);
              } else if (eventType === "text") {
                setStreamText((prev) => prev + parsedData);
              } else if (eventType === "error") {
                setError(typeof parsedData === "string" ? parsedData : "An error occurred.");
              } else if (eventType === "done") {
                setIsStreaming(false);
              }
            } catch {
              // Plain text or parse failure
              if (eventType === "text") {
                setStreamText((prev) => prev + dataText);
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error("Recommendation stream error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to generate recommendations. Please retry.";
      setError(message);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleSelectExample = (example: ExampleQuery) => {
    setPrefill({
      message: example.message,
      genre: example.genre,
      level: example.level,
    });
    handleRecommend({
      message: example.message,
      genre: example.genre,
      level: example.level,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
              <Compass size={20} className="animate-spin-slow" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                BookCompass
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                AI Book Recommender
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium">
            <Sparkles size={13} />
            <span>Grounded GenAI — Never invents book facts</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Find the right book to <span className="text-primary">start with</span>.
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Recommendations tailored to your genre, reading level, and mood. We use deterministic
            scoring and verified catalogs so every recommendation has real pages, covers, and facts.
          </p>
        </div>

        {/* Search Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <PreferenceForm
            key={prefill ? `${prefill.message}-${prefill.genre}-${prefill.level}` : "default"}
            onSubmit={handleRecommend}
            isLoading={isLoading || isStreaming}
            initialValues={prefill}
          />
          <div className="border-t border-border/60 pt-4">
            <ExampleChips
              onSelectExample={handleSelectExample}
              disabled={isLoading || isStreaming}
            />
          </div>
        </div>

        {/* Results Anchor */}
        <div ref={resultsRef} className="space-y-8 scroll-mt-20">
          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Unable to fetch recommendations</p>
                <p className="mt-0.5 opacity-90">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-xs underline hover:opacity-80"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Skeletons while loading */}
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-48 rounded skeleton" />
                <div className="h-4 w-28 rounded skeleton" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BookCardSkeleton />
                <BookCardSkeleton />
                <BookCardSkeleton />
                <BookCardSkeleton />
              </div>
            </div>
          )}

          {/* Book Cards */}
          {books.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    Top Recommended Books ({books.length})
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  Scored by our deterministic rubric
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {books.map((book, idx) => (
                  <BookCard key={book.id || idx} book={book} index={idx} />
                ))}
              </div>
            </section>
          )}

          {/* Reading Ladder */}
          {ladder.length > 0 && (
            <section className="p-5 rounded-2xl border border-border bg-card/60">
              <ReadingLadder steps={ladder} />
            </section>
          )}

          {/* AI Explanation Stream */}
          <ChatStream
            content={streamText}
            isStreaming={isStreaming}
            error={null}
          />

          {/* Empty State */}
          {!isLoading && !isStreaming && books.length === 0 && !error && (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Layers size={22} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-semibold text-foreground text-base">
                  Ready to discover your next favorite book?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pick a genre, choose your comfort level, or try one of the prompt examples
                  above to generate your personalized reading roadmap.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-8 text-xs text-muted-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p>
            BookCompass &copy; 2026 &bull; GenAI explanations grounded in verified
            catalogs from Google Books &amp; Open Library.
          </p>
          <div className="flex items-center gap-4">
            <span>Portfolio Project</span>
            <span>&bull;</span>
            <span>Next.js App Router + Supabase + Gemini</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
