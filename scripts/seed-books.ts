/**
 * Seed script: loads curated books, enriches via Google Books,
 * generates embeddings, and inserts into Supabase.
 *
 * Usage: npx tsx scripts/seed-books.ts
 */

import { createClient } from "@supabase/supabase-js";
import curatedBooks from "./data/curated-books.json";

// Load env vars
import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
const GEMINI_EMBED_API = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

interface CuratedBook {
  title: string;
  author: string;
  genres: string[];
  level: string;
  complexity: number;
  pacing: string;
  tone: string[];
  page_count: number | null;
  isbn: string | null;
  why_start_here: string;
}

interface EnrichedBook extends CuratedBook {
  description: string | null;
  cover_url: string | null;
  avg_rating: number | null;
  google_books_id: string | null;
  embedding: number[] | null;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Search Google Books for a book by title + author
 */
async function enrichFromGoogleBooks(
  title: string,
  author: string
): Promise<{
  description: string | null;
  cover_url: string | null;
  avg_rating: number | null;
  google_books_id: string | null;
  page_count: number | null;
}> {
  try {
    const params = new URLSearchParams({
      q: `intitle:${title} inauthor:${author}`,
      maxResults: "3",
      orderBy: "relevance",
      printType: "books",
    });

    if (GOOGLE_BOOKS_API_KEY) {
      params.set("key", GOOGLE_BOOKS_API_KEY);
    }

    const response = await fetch(`${GOOGLE_BOOKS_API}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`  ⚠ Google Books returned ${response.status} for "${title}"`);
      return {
        description: null,
        cover_url: null,
        avg_rating: null,
        google_books_id: null,
        page_count: null,
      };
    }

    const data = await response.json();
    if (!data.items?.length) {
      return {
        description: null,
        cover_url: null,
        avg_rating: null,
        google_books_id: null,
        page_count: null,
      };
    }

    const best = data.items[0];
    const info = best.volumeInfo;

    return {
      description: info.description ?? null,
      cover_url:
        info.imageLinks?.thumbnail?.replace("http:", "https:") ?? null,
      avg_rating: info.averageRating ?? null,
      google_books_id: best.id,
      page_count: info.pageCount ?? null,
    };
  } catch (error) {
    console.warn(`  ⚠ Google Books lookup failed for "${title}":`, error);
    return {
      description: null,
      cover_url: null,
      avg_rating: null,
      google_books_id: null,
      page_count: null,
    };
  }
}

/**
 * Generate an embedding using Gemini Embeddings API directly
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(`${GEMINI_EMBED_API}?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`  ⚠ Embedding API returned ${response.status}: ${errText}`);
      return null;
    }

    const data = await response.json();
    return data.embedding?.values ?? null;
  } catch (error) {
    console.warn("  ⚠ Embedding generation failed:", error);
    return null;
  }
}

/**
 * Build embedding text from a book's metadata
 */
function buildEmbeddingText(book: CuratedBook, description: string | null): string {
  const parts = [
    book.title,
    `by ${book.author}`,
    `genres: ${book.genres.join(", ")}`,
    `level: ${book.level}`,
    `tone: ${book.tone.join(", ")}`,
    `pacing: ${book.pacing}`,
    book.why_start_here,
  ];
  if (description) {
    parts.push(description.slice(0, 500));
  }
  return parts.join(". ");
}

async function main() {
  console.log("📚 BookCompass Seed Script");
  console.log("========================\n");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!GOOGLE_API_KEY) {
    console.error("❌ Missing GOOGLE_API_KEY (needed for embeddings)");
    process.exit(1);
  }

  const books = curatedBooks as CuratedBook[];
  console.log(`Found ${books.length} curated books to seed.\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(
      `[${i + 1}/${books.length}] Processing: "${book.title}" by ${book.author}`
    );

    // Check if book already exists
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("title", book.title)
      .eq("author", book.author)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("  ⏭ Already exists, skipping");
      skipCount++;
      continue;
    }

    // Enrich from Google Books
    console.log("  🔍 Enriching from Google Books...");
    const enrichment = await enrichFromGoogleBooks(book.title, book.author);
    await sleep(300); // Rate limit courtesy

    // Generate embedding
    console.log("  🧮 Generating embedding...");
    const embeddingText = buildEmbeddingText(book, enrichment.description);
    const embedding = await generateEmbedding(embeddingText);
    await sleep(200); // Rate limit courtesy

    // Insert into Supabase
    const enrichedBook: EnrichedBook = {
      ...book,
      description: enrichment.description,
      cover_url: enrichment.cover_url,
      avg_rating: enrichment.avg_rating,
      google_books_id: enrichment.google_books_id,
      page_count: book.page_count || enrichment.page_count || null,
      embedding,
    };

    const { error: insertError } = await supabase.from("books").insert({
      title: enrichedBook.title,
      author: enrichedBook.author,
      genres: enrichedBook.genres,
      level: enrichedBook.level,
      complexity: enrichedBook.complexity,
      pacing: enrichedBook.pacing,
      tone: enrichedBook.tone,
      page_count: enrichedBook.page_count,
      description: enrichedBook.description,
      cover_url: enrichedBook.cover_url,
      avg_rating: enrichedBook.avg_rating,
      google_books_id: enrichedBook.google_books_id,
      isbn: enrichedBook.isbn,
      why_start_here: enrichedBook.why_start_here,
      embedding: enrichedBook.embedding,
    });

    if (insertError) {
      console.error(`  ❌ Insert failed: ${insertError.message}`);
      errorCount++;
    } else {
      console.log("  ✅ Inserted successfully");
      successCount++;
    }
  }

  console.log("\n========================");
  console.log(`📊 Results: ${successCount} inserted, ${skipCount} skipped, ${errorCount} errors`);
  console.log("Done! 🎉");
}

main().catch(console.error);
