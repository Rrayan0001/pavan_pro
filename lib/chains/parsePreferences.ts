import "server-only";

import { getChatModel } from "@/lib/llm";
import {
  PreferencesSchema,
  type Preferences,
  type LevelSource,
  type Level,
  GENRES,
  LEVELS,
  HEAT_LEVELS,
} from "@/lib/schemas";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const SYSTEM_PROMPT = `You are an expert literary librarian and book search parser.
Your task is to analyze the user's message and extract structured reading preferences according to strict rules.

Rules:
1. GENRES: Choose one or more from: ${GENRES.join(", ")}. Always return at least one genre.
   - "love story", "romance", "dating" -> romance
   - "suspense", "whodunit", "detective" -> mystery or thriller
   - "magic", "dragons", "sword" -> fantasy
   - "aliens", "space", "future", "AI" -> sci-fi
2. SUB_GENRES: Extract niche sub-genres or tropes (e.g. "rom-com", "enemies-to-lovers", "slow-burn", "space opera", "cyberpunk", "psychological thriller", "cozy mystery").
3. LEVEL: Choose from: ${LEVELS.join(", ")} ONLY if the text explicitly asks for a reading level.
   - If the user explicitly mentions "beginner", "easy read", "for beginner", "getting started", "introductory", "simple" -> beginner
   - "intermediate", "standard read", "moderate" -> intermediate
   - "advanced", "challenging", "dense", "literary masterpiece", "deep read" -> advanced
   - If the text DOES NOT explicitly state a difficulty level, return null.
4. HEAT_LEVEL: For romance queries, choose from: ${HEAT_LEVELS.join(", ")} or null.
   - "spicy", "steamy", "smut", "erotic", "high heat" -> steamy
   - "mild", "sensual", "warm" -> mild
   - "clean", "wholesome", "sweet", "fade to black", "no spice" -> clean
   - Otherwise -> null
5. MOOD: Array of descriptive mood words (e.g. ["dark", "witty", "heartwarming", "gripping"]).
6. SIMILAR_TO: Array of author names or book titles mentioned as positive references.
7. AVOID: Array of tropes, genres, or themes the user explicitly wishes to avoid.
8. MAX_PAGES: Integer page limit if mentioned, else null.
9. TARGET_BOOK_QUERY: If the user is asking about a specific book title (e.g. "is The Notebook good?", "thoughts on Dune"), extract that title.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  ["human", "{message}"],
]);

export interface ParsedPreferencesResult {
  preferences: Preferences;
  levelSource: LevelSource;
  notice: string | null;
}

/**
 * Parse natural language into structured preferences with strict precedence:
 * 1. Explicit cues in message text (highest)
 * 2. UI filter chips
 * 3. Default (level = beginner)
 */
export async function parsePreferences(
  message: string,
  genreHint?: string,
  levelHint?: string
): Promise<ParsedPreferencesResult> {
  const model = getChatModel({ maxOutputTokens: 1024, temperature: 0.1 });
  const structuredModel = model.withStructuredOutput(PreferencesSchema);

  // Normalize UI hints ("any" string mapped to undefined)
  const cleanGenreHint =
    genreHint && genreHint.trim().toLowerCase() !== "any" ? genreHint.trim().toLowerCase() : undefined;
  const cleanLevelHint =
    levelHint && levelHint.trim().toLowerCase() !== "any" ? (levelHint.trim().toLowerCase() as Level) : undefined;

  let rawResult: Preferences;

  try {
    const output = await prompt.pipe(structuredModel).invoke({ message });
    rawResult = PreferencesSchema.parse(output);
  } catch (firstError) {
    console.warn("[STAGE 2: Preference parse retry]:", firstError);
    try {
      const output = await prompt.pipe(structuredModel).invoke({ message });
      rawResult = PreferencesSchema.parse(output);
    } catch (secondError) {
      console.error("[STAGE 2: Preference parse failed twice, using defaults]:", secondError);
      rawResult = {
        genres: cleanGenreHint ? [cleanGenreHint as (typeof GENRES)[number]] : ["fiction" as any],
        subGenres: [],
        level: "beginner",
        heatLevel: null,
        maxPages: null,
        mood: [],
        similarTo: [],
        avoid: [],
      };
    }
  }

  // Detect explicit level cues in message text
  const lowerMsg = message.toLowerCase();
  const textHasBeginner = /\b(beginner|for beginner|beginners|easy read|new to reading|first.?time|starter|introductory)\b/.test(lowerMsg);
  const textHasIntermediate = /\b(intermediate|moderate)\b/.test(lowerMsg);
  const textHasAdvanced = /\b(advanced|challenge|challenging|literary|deep read|dense|masterwork)\b/.test(lowerMsg);

  let finalLevel: Level;
  let levelSource: LevelSource;

  if (textHasBeginner) {
    finalLevel = "beginner";
    levelSource = "message";
  } else if (textHasAdvanced) {
    finalLevel = "advanced";
    levelSource = "message";
  } else if (textHasIntermediate) {
    finalLevel = "intermediate";
    levelSource = "message";
  } else if (rawResult.level) {
    finalLevel = rawResult.level;
    levelSource = "message";
  } else if (cleanLevelHint && LEVELS.includes(cleanLevelHint)) {
    finalLevel = cleanLevelHint;
    levelSource = "ui";
  } else {
    finalLevel = "beginner";
    levelSource = "default";
  }

  // Genre Precedence:
  // If user passed a clean UI genre hint and message didn't specify an explicit conflicting genre, prioritize UI
  let finalGenres = rawResult.genres;
  if (cleanGenreHint && GENRES.includes(cleanGenreHint as any)) {
    if (!finalGenres.includes(cleanGenreHint as any)) {
      finalGenres = [cleanGenreHint as any, ...finalGenres];
    }
  }

  // Handle "spicy" sub-genre extraction explicitly
  let finalHeatLevel = rawResult.heatLevel;
  if (!finalHeatLevel && (lowerMsg.includes("spicy") || lowerMsg.includes("smut") || lowerMsg.includes("steamy"))) {
    finalHeatLevel = "steamy";
  }

  const finalPreferences: Preferences = {
    ...rawResult,
    genres: finalGenres.length > 0 ? finalGenres : ["fiction" as any],
    level: finalLevel,
    heatLevel: finalHeatLevel,
  };

  // Generate plain notice message (no raw markdown asterisks!)
  let notice: string | null = null;
  if (levelSource === "default") {
    notice = "I noticed you didn't specify a reading level, so I've started with beginner recommendations. You can adjust this anytime!";
  }

  return {
    preferences: finalPreferences,
    levelSource,
    notice,
  };
}
