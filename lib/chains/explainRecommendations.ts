import "server-only";

import { getChatModel } from "@/lib/llm";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { Book, Preferences } from "@/lib/schemas";

const SYSTEM_PROMPT = `You are a friendly, knowledgeable book recommendation assistant called BookCompass.

STRICT RULES — follow these exactly:
1. Use ONLY the facts provided in the book data below. Do not mention page counts, plot points, awards, or details that are not in the data.
2. For each book, explain why it fits the user's requested genre AND their reader level in 2-3 engaging sentences.
3. If the data is thin (e.g., no description), say less. NEVER guess or fabricate details.
4. Be warm and encouraging, especially for beginner readers.
5. If the user is a beginner, emphasize accessibility and why the book won't feel overwhelming.
6. If you mention a reading ladder, explain the progression naturally.
7. Do NOT use bullet points for explanations. Write in a natural, conversational tone.
8. Address the user directly ("you'll love..." not "the reader will love...").

Format your response as a cohesive recommendation. Start with a brief intro acknowledging what the user is looking for, then discuss each book.`;

const USER_TEMPLATE = `The user is looking for: {userRequest}
Their preferences: Genre={genres}, Level={level}
{moodLine}
{avoidLine}

Here are the verified books to recommend (with scores):

{bookDetails}

Write an engaging recommendation explaining why each book is a great fit. Remember: use ONLY the facts provided above.`;

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
