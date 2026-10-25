"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  Compass,
  BookOpen,
  Layers,
  Sparkles,
  AlertCircle,
  PanelLeft,
  Plus,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeProvider";
import { PreferenceForm } from "@/components/PreferenceForm";
import { BookCard, BookCardSkeleton } from "@/components/BookCard";
import { ReadingLadder } from "@/components/ReadingLadder";
import { ChatStream } from "@/components/ChatStream";
import { ExampleChips, type ExampleQuery } from "@/components/ExampleChips";
import { AuthModal } from "@/components/AuthModal";
import { ChatSidebar, type UserChat, type ChatTurn } from "@/components/ChatSidebar";
import type { Book, LadderStep, Genre, Level } from "@/lib/schemas";

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

export default function Home() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<{
    message: string;
    genre?: Genre;
    level?: Level;
  } | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [ladder, setLadder] = useState<LadderStep[]>([]);
  const [streamText, setStreamText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userEmail = useSyncExternalStore(subscribeToEmail, getEmailSnapshot, getEmailServerSnapshot);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<UserChat[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [prefill, setPrefill] = useState<{
    message: string;
    genre?: Genre;
    level?: Level;
  } | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch chat history on userEmail change via async fetch
  useEffect(() => {
    let ignore = false;
    if (!userEmail) return;

    fetch(`/api/chats?email=${encodeURIComponent(userEmail)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data?.chats) {
          setChatHistory(data.chats);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch chats:", err);
      });

    return () => {
      ignore = true;
    };
  }, [userEmail]);

  // Fetch chat history manually on stream done / delete / rename
  const fetchChats = useCallback(async (email: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/chats?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data.chats || []);
      }
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const handleLogin = (email: string) => {
    localStorage.setItem("bookcompass_user_email", email);
    window.dispatchEvent(new Event("bookcompass_auth_change"));
  };

  const handleLogout = () => {
    localStorage.removeItem("bookcompass_user_email");
    window.dispatchEvent(new Event("bookcompass_auth_change"));
    setChatHistory([]);
    handleNewChat();
  };

  const handleSelectChat = (chat: UserChat) => {
    setActiveChatId(chat.id);
    let loadedTurns: ChatTurn[] = [];

    if (chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0) {
      loadedTurns = chat.messages;
    } else if (chat.user_message) {
      loadedTurns = [
        {
          id: chat.id,
          userMessage: chat.user_message,
          genre: chat.genre,
          level: chat.level,
          books: chat.books || [],
          ladder: chat.ladder || [],
          explanation: chat.explanation || "",
          createdAt: chat.created_at,
        },
      ];
    }

    setTurns(loadedTurns);
    setCurrentPrompt(null);
    setBooks([]);
    setLadder([]);
    setStreamText("");
    setError(null);
    setPrefill({
      message: "",
      genre: undefined,
      level: undefined,
    });
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setTurns([]);
    setCurrentPrompt(null);
    setBooks([]);
    setLadder([]);
    setStreamText("");
    setError(null);
    setPrefill({
      message: "",
      genre: undefined,
      level: undefined,
    });
  };

  const handleDeleteChat = async (id: string) => {
    if (!userEmail) return;
    try {
      await fetch("/api/chats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, email: userEmail }),
      });
      setChatHistory((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    if (!userEmail) return;
    try {
      const res = await fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, email: userEmail, title: newTitle }),
      });
      if (res.ok) {
        setChatHistory((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
        );
      }
    } catch (err) {
      console.error("Failed to rename chat:", err);
    }
  };

  const handleRecommend = async (payload: {
    message: string;
    genre?: Genre;
    level?: Level;
  }) => {
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setCurrentPrompt(payload);
    setBooks([]);
    setLadder([]);
    setStreamText("");

    let latestBooks: Book[] = [];
    let latestLadder: LadderStep[] = [];
    let accumulatedText = "";

    try {
      const payloadToSend = {
        message: payload.message.trim(),
        ...(payload.genre ? { genre: payload.genre } : {}),
        ...(payload.level ? { level: payload.level } : {}),
        ...(userEmail?.trim() ? { email: userEmail.trim().toLowerCase() } : {}),
        ...(activeChatId ? { chatId: activeChatId } : {}),
      };

      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToSend),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error(
            data.error || "Rate limit reached. Please wait a minute and try again."
          );
        }
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received from server.");
      }

      setIsLoading(false);

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
                latestBooks = parsedData as Book[];
                setBooks(latestBooks);
              } else if (eventType === "ladder") {
                latestLadder = parsedData as LadderStep[];
                setLadder(latestLadder);
              } else if (eventType === "text") {
                accumulatedText += parsedData;
                setStreamText(accumulatedText);
              } else if (eventType === "chatId") {
                setActiveChatId(parsedData);
                if (userEmail) fetchChats(userEmail);
              } else if (eventType === "error") {
                setError(typeof parsedData === "string" ? parsedData : "An error occurred.");
              } else if (eventType === "done") {
                setIsStreaming(false);

                // Commit the finished turn into turns history!
                const finishedTurn: ChatTurn = {
                  id: crypto.randomUUID(),
                  userMessage: payload.message.trim(),
                  genre: payload.genre,
                  level: payload.level,
                  books: latestBooks,
                  ladder: latestLadder,
                  explanation: accumulatedText,
                  createdAt: new Date().toISOString(),
                };

                setTurns((prev) => {
                  const updated = [...prev, finishedTurn];
                  return updated.slice(-6); // retains 3 to 4+ prompts in each chat
                });

                setCurrentPrompt(null);
                setBooks([]);
                setLadder([]);
                setStreamText("");

                if (userEmail) fetchChats(userEmail);
              }
            } catch {
              if (eventType === "text") {
                accumulatedText += dataText;
                setStreamText(accumulatedText);
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error("Recommendation stream error:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to generate recommendations. Please retry.";
      setError(msg);
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
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      {/* Dynamic Left Sidebar for Past Chats */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chats={chatHistory}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        isLoading={isLoadingHistory}
        userEmail={userEmail}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Viewport */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:pl-72 sm:md:pl-80" : "pl-0"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-20 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Left Header: Sidebar Toggle & Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card/80 hover:bg-muted text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
                title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                aria-label="Toggle chat history sidebar"
              >
                <PanelLeft size={16} className="text-primary" />
                <span className="hidden sm:inline font-semibold">Chats</span>
                {userEmail && chatHistory.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {chatHistory.length}
                  </span>
                )}
              </button>

              <button
                onClick={handleNewChat}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/80 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title="Start a new chat"
              >
                <Plus size={14} />
                <span>New</span>
              </button>

              <div className="flex items-center gap-2 pl-1">
                <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
                  <Compass size={18} className="animate-spin-slow" />
                </div>
                <div>
                  <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    BookCompass
                  </span>
                  <span className="hidden md:inline-block ml-2 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    AI Book Recommender
                  </span>
                </div>
              </div>
            </div>

            {/* Right Header: Auth & Theme */}
            <div className="flex items-center gap-2.5">
              <AuthModal
                email={userEmail}
                onLogin={handleLogin}
                onLogout={handleLogout}
                isOpen={isAuthModalOpen}
                onOpenChange={setIsAuthModalOpen}
                showTrigger={true}
              />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Center Content */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
          {/* Hero Section */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium">
              <Sparkles size={13} />
              <span>Interactive AI Book Assistant &bull; Grounded Knowledge</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Ask any question. Find your <span className="text-primary">next book</span>.
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Ask questions about books, get direct answers, or discover tailored recommendations
              based on your genre and reading level. All facts and page counts are verified.
            </p>
          </div>

          {/* Search / Preference Input Card */}
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

          {/* Results Anchor: Multi-Turn Conversation Thread */}
          <div ref={resultsRef} className="space-y-10 scroll-mt-20">
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

            {/* Render Previous Chat Turns (retains the 3 to 4+ prompts in each chat session) */}
            {turns.length > 0 && (
              <div className="space-y-10">
                {turns.map((turn, tIdx) => (
                  <div
                    key={turn.id || tIdx}
                    className="space-y-6 pt-6 first:pt-0 border-t border-border/60 first:border-0"
                  >
                    {/* User Prompt Message Bubble */}
                    <div className="flex items-start justify-end gap-3">
                      <div className="max-w-2xl p-4 rounded-2xl rounded-tr-xs bg-primary text-primary-foreground shadow-xs space-y-1">
                        <div className="flex items-center justify-end gap-2 text-[11px] opacity-80 font-medium">
                          <span>Prompt #{tIdx + 1}</span>
                          {turn.genre && (
                            <>
                              <span>&bull;</span>
                              <span className="capitalize">{turn.genre}</span>
                            </>
                          )}
                          {turn.level && (
                            <>
                              <span>&bull;</span>
                              <span className="capitalize">{turn.level}</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-left">
                          {turn.userMessage}
                        </p>
                      </div>
                    </div>

                    {/* Assistant Response for Turn */}
                    <div className="space-y-6">
                      {turn.explanation && (
                        <ChatStream content={turn.explanation} isStreaming={false} error={null} />
                      )}

                      {turn.books && turn.books.length > 0 && (
                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BookOpen size={18} className="text-primary" />
                              <h3 className="text-base font-bold text-foreground">
                                Recommended Books ({turn.books.length})
                              </h3>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Scored by our deterministic rubric
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {turn.books.map((book, bIdx) => (
                              <BookCard key={book.id || bIdx} book={book} index={bIdx} />
                            ))}
                          </div>
                        </section>
                      )}

                      {turn.ladder && turn.ladder.length > 0 && (
                        <section className="p-5 rounded-2xl border border-border bg-card/60">
                          <ReadingLadder steps={turn.ladder} />
                        </section>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* In-Flight Current Streaming Turn */}
            {(isLoading || isStreaming || (currentPrompt && (streamText || books.length > 0))) && (
              <div className="space-y-6 pt-6 border-t border-border/60">
                {currentPrompt && (
                  <div className="flex items-start justify-end gap-3">
                    <div className="max-w-2xl p-4 rounded-2xl rounded-tr-xs bg-primary text-primary-foreground shadow-xs space-y-1">
                      <div className="flex items-center justify-end gap-2 text-[11px] opacity-80 font-medium">
                        <span>Latest Prompt</span>
                        {currentPrompt.genre && (
                          <>
                            <span>&bull;</span>
                            <span className="capitalize">{currentPrompt.genre}</span>
                          </>
                        )}
                        {currentPrompt.level && (
                          <>
                            <span>&bull;</span>
                            <span className="capitalize">{currentPrompt.level}</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-left">
                        {currentPrompt.message}
                      </p>
                    </div>
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

                {/* Active Stream */}
                {streamText && (
                  <ChatStream content={streamText} isStreaming={isStreaming} error={null} />
                )}

                {/* Active Books */}
                {books.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-primary" />
                        <h2 className="text-base font-bold text-foreground">
                          Recommended Books ({books.length})
                        </h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {books.map((book, idx) => (
                        <BookCard key={book.id || idx} book={book} index={idx} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Active Ladder */}
                {ladder.length > 0 && (
                  <section className="p-5 rounded-2xl border border-border bg-card/60">
                    <ReadingLadder steps={ladder} />
                  </section>
                )}
              </div>
            )}

            {/* Empty State */}
            {!isLoading &&
              !isStreaming &&
              turns.length === 0 &&
              books.length === 0 &&
              !error &&
              !streamText && (
                <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Layers size={22} />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="font-semibold text-foreground text-base">
                      Ask a question or find your next read
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Ask questions like &ldquo;Is The Notebook a good romance book to start with?&rdquo;
                      or pick a genre and level to explore verified books.
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
              BookCompass &copy; 2026 &bull; GenAI answers and recommendations grounded in verified
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
    </div>
  );
}
