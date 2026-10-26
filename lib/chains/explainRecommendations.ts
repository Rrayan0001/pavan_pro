import "server-only";

import { getChatModel } from "@/lib/llm";
import {
  ExplanationResponseSchema,
  type ExplanationResponse,
  type Book,
  type Preferences,
} from "@/lib/schemas";
import { cleanText } from "@/lib/text/cleanText";

const SYSTEM_PROMPT = `You are BookCompass, an exceptionally knowledgeable, friendly, and literary book recommendation assistant.

YOUR MISSION:
1. DIRECT ANSWER: If the user asked a question (e.g. "is The Notebook good to start with romance?", "recommend something like Dune"), address their specific question directly, warmly, and thoroughly in the summary paragraph.
2. CLEAN PROSE ONLY: NEVER output markdown asterisks (no **bold**, no *italics*), no markdown headers (###), and no bullet points (- or *). Write natural, eloquent, flowing paragraphs.
3. GROUNDING: Ground all explanations strictly in the verified facts provided for each book (level, pacing, complexity, description, tone). Never invent imaginary awards, plot points, or mismatched page counts.
4. PER-BOOK INSIGHTS: For each book in the list, explain:
   - whyItFits: Why this book specifically satisfies what the user is looking for.
   - whyThisLevel: How its pacing and complexity match the reader's level.
   - watchOut: Optional content advisory or stylistic heads-up (e.g. "slow beginning", "sensitive themes", or null).
5. READING LADDER NOTE: Provide a brief 1-sentence note introducing the reading progression if applicable.`;

/**
 * Generate structured explanations for recommended books.
 */
export async function generateStructuredExplanation(
  books: Book[],
  preferences: Preferences,
  userMessage: string,
  existingNotice?: string | null
): Promise<ExplanationResponse> {
  const model = getChatModel({ maxOutputTokens: 2048, temperature: 0.3 });
  const structuredModel = model.withStructuredOutput(ExplanationResponseSchema);

  const bookSummaries = books.map((b, i) => ({
    bookId: b.id,
    title: b.title,
    author: b.author,
    level: b.level,
    complexity: b.complexity,
    pacing: b.pacing,
    tone: b.tone,
    pages: b.pageCount,
    description: b.description?.slice(0, 300),
    whyStartHere: b.whyStartHere,
  }));

  try {
    const result = await structuredModel.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `User query: "${userMessage}"
Target Preferences:
- Requested Level: ${preferences.level}
- Genres: ${preferences.genres.join(", ")}
${preferences.subGenres && preferences.subGenres.length > 0 ? `- Sub-genres: ${preferences.subGenres.join(", ")}` : ""}
${preferences.mood && preferences.mood.length > 0 ? `- Mood: ${preferences.mood.join(", ")}` : ""}
${preferences.heatLevel ? `- Heat Level: ${preferences.heatLevel}` : ""}

Verified Books:
${JSON.stringify(bookSummaries, null, 2)}`,
      },
    ]);

    // Sanitize all text fields using cleanText to remove any inadvertent markdown artifacts
    return {
      notice: existingNotice ? cleanText(existingNotice) : result.notice ? cleanText(result.notice) : null,
      summary: cleanText(result.summary),
      books: (result.books || []).map((b) => ({
        bookId: b.bookId,
        whyItFits: cleanText(b.whyItFits),
        whyThisLevel: cleanText(b.whyThisLevel),
        watchOut: b.watchOut ? cleanText(b.watchOut) : null,
      })),
      ladderNote: result.ladderNote ? cleanText(result.ladderNote) : null,
    };
  } catch (err: unknown) {
    console.error("[EXPLAIN_RECOMMENDATIONS] Structured output failed, falling back to clean prose:", err);
    return {
      notice: existingNotice ? cleanText(existingNotice) : null,
      summary: cleanText(
        `Here are hand-picked recommendations tailored to your taste in ${preferences.genres.join(", ")}. Each selection offers an inviting entry point matching your reading level.`
      ),
      books: books.map((b) => ({
        bookId: b.id,
        whyItFits: cleanText(b.whyStartHere || `A standout match for ${preferences.genres.join(", ")} readers.`),
        whyThisLevel: cleanText(`Calibrated for ${b.level} reading with ${b.pacing} pacing.`),
        watchOut: null,
      })),
      ladderNote: "Follow our reading ladder below to level up your reading journey.",
    };
  }
}
