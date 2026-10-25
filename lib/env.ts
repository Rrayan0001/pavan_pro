import { z } from "zod";

const envSchema = z.object({
  // Gemini
  GOOGLE_API_KEY: z.string().min(1, "GOOGLE_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),

  // Google Books
  GOOGLE_BOOKS_API_KEY: z.string().optional(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessage = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
      .join("\n");

    console.error("❌ Invalid environment variables:\n" + errorMessage);

    // In development, build time, or testing with missing env vars, warn but allow build to proceed
    if (
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test" ||
      process.env.SKIP_ENV_VALIDATION === "true" ||
      !process.env.GOOGLE_API_KEY
    ) {
      console.warn(
        "⚠️  Running with missing env vars. Using placeholders for build/development."
      );
      return {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "placeholder-key",
        GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        GEMINI_EMBEDDING_MODEL:
          process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
        GOOGLE_BOOKS_API_KEY: process.env.GOOGLE_BOOKS_API_KEY,
        NEXT_PUBLIC_SUPABASE_URL:
          process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          "placeholder-publishable-key",
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          "placeholder-anon-key",
        SUPABASE_SERVICE_ROLE_KEY:
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          "placeholder-service-role-key",
        UPSTASH_REDIS_REST_URL:
          process.env.UPSTASH_REDIS_REST_URL || "https://placeholder.upstash.io",
        UPSTASH_REDIS_REST_TOKEN:
          process.env.UPSTASH_REDIS_REST_TOKEN || "placeholder-upstash-token",
      };
    }

    throw new Error("Invalid environment variables:\n" + errorMessage);
  }

  return parsed.data;
}

export const env = validateEnv();
