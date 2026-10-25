import "server-only";

import { getChatModel } from "@/lib/llm";
import {
  PreferencesSchema,
  type Preferences,
  GENRES,
  LEVELS,
} from "@/lib/schemas";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const SYSTEM_PROMPT = `You are a book recommendation assistant. Your job is to understand what kind of book the user is looking for.

Analyze the user's message and extract their preferences. Here are the rules:

1. GENRES: Choose from exactly these genres: ${GENRES.join(", ")}
2. LEVEL: Choose from: ${LEVELS.join(", ")}
   - If the user says things like "new to reading", "never read much", "easy read" → beginner
   - If no level cues are given, default to beginner
   - "looking for a challenge", "deep", "literary" → advanced
3. MOOD: Extract mood/atmosphere preferences (e.g., "dark", "lighthearted", "thought-provoking")
4. SIMILAR_TO: If they mention specific books or authors they liked, list them
5. AVOID: If they mention things they don't want, list them
6. MAX_PAGES: If they mention a page preference, extract it

Be generous with genre matching - "scary" maps to horror, "love story" maps to romance, etc.
Always return at least one genre.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  ["human", "{message}"],
]);

/**
 * Parse natural language into structured preferences.
 * Uses Gemini with structured output (Zod schema).
 * Retries once on validation failure, then returns a safe default.
 */
export async function parsePreferences(
  message: string,
  genreHint?: string,
  levelHint?: string
): Promise<{ preferences: Preferences; inferredLevel: boolean }> {
  const model = getChatModel({ maxOutputTokens: 512, temperature: 0.1 });

  // Use withStructuredOutput for reliable JSON
  const structuredModel = model.withStructuredOutput(PreferencesSchema);

  const enrichedMessage = buildEnrichedMessage(message, genreHint, levelHint);

  const inferredLevel =
    !levelHint &&
    !message
      .toLowerCase()
      .match(
        /beginner|intermediate|advanced|new to reading|first.?time|challenge|literary|deep read/
      );

  try {
    const rawResult = await prompt.pipe(structuredModel).invoke({
      message: enrichedMessage,
    });
    const result = PreferencesSchema.parse(rawResult);

    return { preferences: result, inferredLevel: !!inferredLevel };
  } catch (firstError) {
    // Retry once
    console.warn("First preference parse failed, retrying:", firstError);
    try {
      const rawResult = await prompt.pipe(structuredModel).invoke({
        message: enrichedMessage,
      });
      const result = PreferencesSchema.parse(rawResult);
      return { preferences: result, inferredLevel: !!inferredLevel };
    } catch (secondError) {
      console.error("Preference parsing failed twice:", secondError);
      // Return safe defaults
      return {
        preferences: {
          genres: genreHint
            ? [genreHint as (typeof GENRES)[number]]
            : ["fantasy"],
          level:
            (levelHint as "beginner" | "intermediate" | "advanced") ??
            "beginner",
          maxPages: undefined,
          mood: [],
          similarTo: [],
          avoid: [],
        },
        inferredLevel: true,
      };
    }
  }
}

function buildEnrichedMessage(
  message: string,
  genreHint?: string,
  levelHint?: string
): string {
  let enriched = message;
  if (genreHint) enriched += `\n[User selected genre: ${genreHint}]`;
  if (levelHint) enriched += `\n[User selected level: ${levelHint}]`;
  return enriched;
}
