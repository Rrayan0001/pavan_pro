import Module from "module";

// Mock server-only for standalone script run
// @ts-expect-error Mocking server-only in node script
const origRequire = Module.prototype.require;
// @ts-expect-error Mocking server-only in node script
Module.prototype.require = function (id: string) {
  if (id === "server-only") return {};
  // @ts-expect-error Mocking server-only in node script
  return origRequire.apply(this, arguments);
};

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { parsePreferences } from "../lib/chains/parsePreferences";
import { searchCatalog, type RetrievalStats } from "../lib/retrieval/catalog";
import { scoreBookDetailed, type ScoringInput } from "../lib/scoring/score";

async function runPromptTest(message: string, uiGenre?: string, uiLevel?: string) {
  console.log("==================================================");
  console.log(`[TASK 0 TEST] Prompt: "${message}" | uiGenre: ${uiGenre} | uiLevel: ${uiLevel}`);
  console.log("==================================================");

  // Stage 1
  console.log("[STAGE 1: Raw Request]", { message, uiGenre, uiLevel });

  // Stage 2 & 3
  const { preferences, inferredLevel } = await parsePreferences(message, uiGenre, uiLevel);
  console.log("[STAGE 2: Parsed Preferences]", { preferences, inferredLevel });
  console.log("[STAGE 3: Merged Preferences]", preferences);

  // Stage 4
  const stats: RetrievalStats = {
    sqlCount: 0,
    vectorCount: 0,
    googleBooksCount: 0,
    total: 0,
    errors: [],
  };
  const candidates = await searchCatalog(preferences, 15, message, stats);
  console.log("[STAGE 4: Candidate Retrieval]", stats);
  console.log("Candidate titles:", candidates.map(c => `${c.title} (${c.level}, ${c.genres.join(", ")})`));

  // Stage 5
  const scored = candidates.map(book => {
    const input: ScoringInput = {
      bookLevel: book.level,
      bookGenres: book.genres,
      bookPageCount: book.pageCount,
      bookAvgRating: book.avgRating,
      bookTone: book.tone,
      semanticSimilarity: 0.5,
      targetLevel: preferences.level,
      targetGenres: preferences.genres,
      avoidList: preferences.avoid,
    };
    const breakdown = scoreBookDetailed(input);
    return { id: book.id, title: book.title, breakdown };
  }).sort((a, b) => b.breakdown.total - a.breakdown.total);

  console.log("[STAGE 5: Score Breakdown (Top 5)]", scored.slice(0, 5));

  // Stage 6
  console.log("[STAGE 6: Final Book IDs]", scored.slice(0, 5).map(s => `${s.title} [${s.id}] (Score: ${(s.breakdown.total * 100).toFixed(1)}%)`));
  console.log("\n");
}

async function main() {
  await runPromptTest("rom-com books for beginner", "romance", undefined);
  await runPromptTest("spicy romance books", "romance", undefined);
}

main().catch(console.error);
