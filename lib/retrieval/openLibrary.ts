import "server-only";

import type { Book } from "@/lib/schemas";
import { amazonSearchUrl } from "@/lib/utils";

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  number_of_pages_median?: number;
  cover_i?: number;
  first_sentence?: string[];
  subject?: string[];
  ratings_average?: number;
  isbn?: string[];
}

interface OpenLibraryResponse {
  numFound: number;
  docs: OpenLibraryDoc[];
}

const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_COVERS = "https://covers.openlibrary.org/b/id";

/**
 * Fallback: Search Open Library when Google Books is unavailable.
 */
export async function searchOpenLibrary(
  query: string,
  limit: number = 10
): Promise<Partial<Book>[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      fields:
        "key,title,author_name,number_of_pages_median,cover_i,first_sentence,subject,ratings_average,isbn",
      lang: "en",
    });

    const response = await fetch(`${OPEN_LIBRARY_SEARCH}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Open Library API error: ${response.status}`);
      return [];
    }

    const data: OpenLibraryResponse = await response.json();
    return data.docs.filter((doc) => doc.title).map(docToBook);
  } catch (error) {
    console.error("Open Library search failed:", error);
    return [];
  }
}

/**
 * Look up a book by title + author on Open Library.
 */
export async function verifyBookOpenLibrary(
  title: string,
  author: string
): Promise<Partial<Book> | null> {
  const results = await searchOpenLibrary(`${title} ${author}`, 3);
  return results[0] ?? null;
}

function docToBook(doc: OpenLibraryDoc): Partial<Book> {
  const title = doc.title;
  const author = doc.author_name?.[0] ?? "Unknown";

  return {
    title,
    author,
    genres: doc.subject?.slice(0, 5) ?? [],
    pageCount: doc.number_of_pages_median ?? null,
    description: doc.first_sentence?.[0] ?? null,
    coverUrl: doc.cover_i
      ? `${OPEN_LIBRARY_COVERS}/${doc.cover_i}-M.jpg`
      : null,
    avgRating: doc.ratings_average ?? null,
    amazonSearchUrl: amazonSearchUrl(title, author),
  };
}
