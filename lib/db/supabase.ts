import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabaseKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

/**
 * Server-only Supabase client.
 * Uses Service Role key if provided, otherwise falls back to publishable/anon key.
 * NEVER import this from client components.
 */
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Type for a book row from the database.
 */
export interface BookRow {
  id: string;
  title: string;
  author: string;
  genres: string[];
  level: "beginner" | "intermediate" | "advanced";
  complexity: number;
  pacing: "slow" | "medium" | "fast";
  tone: string[];
  page_count: number | null;
  description: string | null;
  cover_url: string | null;
  avg_rating: number | null;
  google_books_id: string | null;
  isbn: string | null;
  why_start_here: string | null;
  embedding: number[] | null;
  created_at: string;
}
