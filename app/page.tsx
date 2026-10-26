"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { AuthModal } from "@/components/AuthModal";
import { ChatSidebar, type UserChat, type ChatTurn } from "@/components/ChatSidebar";
import { Asme } from "@/components/templates/asme/asme";
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

  // Fetch chat history on userEmail change
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
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setTurns([]);
    setCurrentPrompt(null);
    setBooks([]);
    setLadder([]);
    setStreamText("");
    setError(null);
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

                // Commit the finished turn into turns history (keeps 3 to 4+ prompts per session)
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
                  return updated.slice(-6);
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

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground/20 selection:text-foreground">
      {/* Dynamic Left Chat Sidebar */}
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

      {/* Auth Modal */}
      <AuthModal
        email={userEmail}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isOpen={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        showTrigger={false}
      />

      {/* Asme Landing Page Template */}
      <Asme
        turns={turns}
        currentPrompt={currentPrompt}
        books={books}
        ladder={ladder}
        streamText={streamText}
        isStreaming={isStreaming}
        isLoading={isLoading}
        error={error}
        onClearError={() => setError(null)}
        onSubmitPrompt={handleRecommend}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        userEmail={userEmail}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        chatCount={chatHistory.length}
      />
    </div>
  );
}
