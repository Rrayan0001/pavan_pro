import { NextRequest } from "next/server";
import { RecommendRequestSchema } from "@/lib/schemas";
import { parsePreferences } from "@/lib/chains/parsePreferences";
import { explainRecommendations } from "@/lib/chains/explainRecommendations";
import { searchCatalog, getReadingLadder } from "@/lib/retrieval/catalog";
import { scoreBook, type ScoringInput } from "@/lib/scoring/score";
import { checkRateLimit } from "@/lib/ratelimit";
import { formatSSE } from "@/lib/utils";
import { supabase } from "@/lib/db/supabase";
import type { Book } from "@/lib/schemas";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "anonymous";

    // Check rate limit
    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error:
            "Too many requests. Please wait a moment before trying again.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfter ?? 60),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Malformed request body. JSON object expected." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const parsed = RecommendRequestSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        Object.entries(fieldErrors).map(([field, errs]) => `${field}: ${errs?.join(", ")}`)[0] ||
        "Invalid request parameters";

      return new Response(
        JSON.stringify({
          error: firstError,
          details: fieldErrors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { message, genre, level, email, chatId } = parsed.data;

    // Start SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // [1] Parse user preferences
          const { preferences, inferredLevel } = await parsePreferences(
            message,
            genre,
            level
          );

          // [2] Search catalog and live Google Books for candidates
          const candidates = await searchCatalog(preferences, 15, message);

          if (candidates.length === 0) {
            controller.enqueue(
              encoder.encode(
                formatSSE("error", "No books found matching your preferences. Try broadening your search!")
              )
            );
            controller.enqueue(encoder.encode(formatSSE("done", null)));
            controller.close();
            return;
          }

          // [3] Score all candidates
          const scoredBooks: Book[] = candidates
            .map((book) => {
              const input: ScoringInput = {
                bookLevel: book.level,
                bookGenres: book.genres,
                bookPageCount: book.pageCount,
                bookAvgRating: book.avgRating,
                bookTone: book.tone,
                semanticSimilarity: 0.5, // default when no vector search
                targetLevel: preferences.level,
                targetGenres: preferences.genres,
                avoidList: preferences.avoid,
              };
              let score = scoreBook(input);

              // If the user was asking specifically about this book title, prioritize it to the top!
              if (
                preferences.targetBookQuery &&
                book.title.toLowerCase().includes(preferences.targetBookQuery.toLowerCase())
              ) {
                score = Math.max(score, 0.98);
              }

              return { ...book, score };
            })
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .slice(0, 5);

          // Send book cards
          controller.enqueue(
            encoder.encode(formatSSE("books", scoredBooks))
          );

          // [4] Get reading ladder
          const primaryGenre = preferences.genres[0];
          let ladderSteps: { step: number; book: Book; note: string }[] = [];
          if (primaryGenre) {
            const ladder = await getReadingLadder(primaryGenre);
            if (ladder.length > 0) {
              ladderSteps = ladder.map((book, i) => ({
                step: i + 1,
                book,
                note:
                  i === 0
                    ? "Start here"
                    : i === ladder.length - 1
                      ? "Ready for a challenge"
                      : "Level up",
              }));
              controller.enqueue(
                encoder.encode(formatSSE("ladder", ladderSteps))
              );
            }
          }

          // Send inferred level notice
          let fullExplanation = "";
          if (inferredLevel) {
            const notice = `*I noticed you didn't specify a reading level, so I've started with **${preferences.level}** recommendations. You can adjust this anytime!*\n\n`;
            fullExplanation += notice;
            controller.enqueue(
              encoder.encode(formatSSE("text", notice))
            );
          }

          // [5] Stream explanation
          const explanationGen = explainRecommendations(
            scoredBooks,
            preferences,
            message
          );

          for await (const chunk of explanationGen) {
            fullExplanation += chunk;
            controller.enqueue(
              encoder.encode(formatSSE("text", chunk))
            );
          }

          // Save chat session if user is logged in with an email
          if (email) {
            try {
              const chatTitle =
                preferences.targetBookQuery
                  ? `About "${preferences.targetBookQuery}"`
                  : message.length > 40
                  ? message.slice(0, 37) + "..."
                  : message;

              const currentTurn = {
                id: crypto.randomUUID(),
                userMessage: message,
                genre: primaryGenre,
                level: preferences.level,
                books: scoredBooks,
                ladder: ladderSteps,
                explanation: fullExplanation,
                createdAt: new Date().toISOString(),
              };

              if (chatId) {
                // Fetch previous turns to extend the conversation rather than overwriting
                const { data: existingChat } = await supabase
                  .from("user_chats")
                  .select("messages, user_message, books, ladder, explanation, created_at, genre, level")
                  .eq("id", chatId)
                  .eq("email", email.toLowerCase().trim())
                  .single();

                let turns: Record<string, unknown>[] = [];
                if (
                  existingChat?.messages &&
                  Array.isArray(existingChat.messages) &&
                  existingChat.messages.length > 0
                ) {
                  turns = [...(existingChat.messages as Record<string, unknown>[])];
                } else if (existingChat?.user_message) {
                  turns = [
                    {
                      id: crypto.randomUUID(),
                      userMessage: existingChat.user_message,
                      genre: existingChat.genre,
                      level: existingChat.level,
                      books: existingChat.books || [],
                      ladder: existingChat.ladder || [],
                      explanation: existingChat.explanation || "",
                      createdAt: existingChat.created_at || new Date().toISOString(),
                    },
                  ];
                }

                turns.push(currentTurn);

                // Keep the last 6 turns (preserves 3-4+ prompts in each chat)
                if (turns.length > 6) {
                  turns = turns.slice(-6);
                }

                const { error: updateError } = await supabase
                  .from("user_chats")
                  .update({
                    user_message: message,
                    books: scoredBooks,
                    ladder: ladderSteps,
                    explanation: fullExplanation,
                    messages: turns,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", chatId)
                  .eq("email", email.toLowerCase().trim());

                if (updateError) {
                  // Fallback without messages column if schema not yet migrated
                  await supabase
                    .from("user_chats")
                    .update({
                      user_message: message,
                      books: scoredBooks,
                      ladder: ladderSteps,
                      explanation: fullExplanation,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", chatId)
                    .eq("email", email.toLowerCase().trim());
                }
              } else {
                const { data: savedChat, error: insertError } = await supabase
                  .from("user_chats")
                  .insert({
                    email: email.toLowerCase().trim(),
                    title: chatTitle,
                    genre: primaryGenre,
                    level: preferences.level,
                    user_message: message,
                    books: scoredBooks,
                    ladder: ladderSteps,
                    explanation: fullExplanation,
                    messages: [currentTurn],
                  })
                  .select("id")
                  .single();

                let activeId = savedChat?.id;

                if (insertError) {
                  // Fallback without messages column if schema not yet migrated
                  const { data: fallbackChat } = await supabase
                    .from("user_chats")
                    .insert({
                      email: email.toLowerCase().trim(),
                      title: chatTitle,
                      genre: primaryGenre,
                      level: preferences.level,
                      user_message: message,
                      books: scoredBooks,
                      ladder: ladderSteps,
                      explanation: fullExplanation,
                    })
                    .select("id")
                    .single();

                  activeId = fallbackChat?.id;
                }

                if (activeId) {
                  controller.enqueue(
                    encoder.encode(formatSSE("chatId", activeId))
                  );
                }
              }
            } catch (err) {
              console.error("Failed to persist user chat:", err);
            }
          }

          // Log query (no personal data)
          await supabase.from("queries_log").insert({
            genre: primaryGenre,
            level: preferences.level,
          });

          controller.enqueue(encoder.encode(formatSSE("done", null)));
          controller.close();
        } catch (error) {
          console.error("Pipeline error:", error);
          controller.enqueue(
            encoder.encode(
              formatSSE(
                "error",
                "Something went wrong generating your recommendations. Please try again."
              )
            )
          );
          controller.enqueue(encoder.encode(formatSSE("done", null)));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-RateLimit-Remaining": String(rateLimit.remaining ?? "unknown"),
      },
    });
  } catch (error) {
    console.error("Request error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
