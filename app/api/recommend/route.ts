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
    const body = await request.json();
    const parsed = RecommendRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { message, genre, level } = parsed.data;

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

          // [2] Search catalog for candidates
          const candidates = await searchCatalog(preferences, 15);

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
              return { ...book, score: scoreBook(input) };
            })
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .slice(0, 5);

          // Send book cards
          controller.enqueue(
            encoder.encode(formatSSE("books", scoredBooks))
          );

          // [4] Get reading ladder
          const primaryGenre = preferences.genres[0];
          if (primaryGenre) {
            const ladder = await getReadingLadder(
              primaryGenre
            );
            if (ladder.length > 0) {
              const ladderSteps = ladder.map((book, i) => ({
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
          if (inferredLevel) {
            controller.enqueue(
              encoder.encode(
                formatSSE(
                  "text",
                  `*I noticed you didn't specify a reading level, so I've started with **${preferences.level}** recommendations. You can adjust this anytime!*\n\n`
                )
              )
            );
          }

          // [5] Stream explanation
          const explanationGen = explainRecommendations(
            scoredBooks,
            preferences,
            message
          );

          for await (const chunk of explanationGen) {
            controller.enqueue(
              encoder.encode(formatSSE("text", chunk))
            );
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
