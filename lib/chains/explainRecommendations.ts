import "server-only";

import { getChatModel } from "@/lib/llm";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { Book, Preferences } from "@/lib/schemas";

const SYSTEM_PROMPT = `You are a conversational, friendly, and knowledgeable book assistant called BookCompass.

CORE RESPONSIBILITIES:
1. DIRECTLY ANSWER THE USER'S QUESTION: If the user asked a question (e.g. "is The Notebook good book to start with romance genre?"), start immediately by answering their question thoroughly, clearly, and thoughtfully! Never ignore their direct question or jump straight to a generic list without answering what they asked.
2. RECOMMENDATIONS & CONTEXT: Discuss why the provided books fit (or compare with) the user's inquiry, reading level, and preferences.
3. GROUNDING: Ground all book claims strictly in the verified facts provided below (title, author, level, complexity, pacing, pages, description, why start here, etc.). Do not fabricate imaginary awards or unrelated page counts.
4. TONE: Warm, encouraging, conversational, and direct. Talk to the user naturally ("Yes, *The Notebook* is indeed a great starting point for romance...").
5. If the user is asking whether a specific book is good to start with, explain its pacing, complexity, emotional tone, and accessibility for their level.`;

const USER_TEMPLATE = `The user asked / requested:
"{userRequest}"

Extracted context:
- Genres: {genres}
- Reading Level: {level}
{moodLine}
{avoidLine}

Verified candidate books from our database:
{bookDetails}

Please answer the user's question directly first, provide clear and engaging insights into the book(s), and explain why they fit their needs.`;

/**
 * Generate a streamed explanation for the recommended books.
 * Returns an async iterable of text chunks.
 */
export async function* explainRecommendations(
  books: Book[],
  preferences: Preferences,
  userMessage: string
): AsyncGenerator<string> {
  const model = getChatModel({ maxOutputTokens: 1500, temperature: 0.7 });

  const bookDetails = books
    .map(
      (b, i) =>
        `Book ${i + 1}: "${b.title}" by ${b.author}
  - Genres: ${b.genres.join(", ")}
  - Level: ${b.level} | Complexity: ${b.complexity}/5 | Pacing: ${b.pacing}
  - Pages: ${b.pageCount ?? "unknown"}
  - Tone: ${b.tone.join(", ") || "N/A"}
  - Description: ${b.description ?? "No description available"}
  - Why start here: ${b.whyStartHere ?? "N/A"}
  - Score: ${b.score?.toFixed(2) ?? "N/A"}`
    )
    .join("\n\n");

  const moodLine =
    preferences.mood.length > 0
      ? `Mood preferences: ${preferences.mood.join(", ")}`
      : "";
  const avoidLine =
    preferences.avoid.length > 0
      ? `Wants to avoid: ${preferences.avoid.join(", ")}`
      : "";

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    ["human", USER_TEMPLATE],
  ]);

  const chain = prompt.pipe(model);

  const stream = await chain.stream({
    userRequest: userMessage,
    genres: preferences.genres.join(", "),
    level: preferences.level,
    moodLine,
    avoidLine,
    bookDetails,
  });

  for await (const chunk of stream) {
    const text = typeof chunk.content === "string" ? chunk.content : "";
    if (text) {
      yield text;
    }
  }
}
