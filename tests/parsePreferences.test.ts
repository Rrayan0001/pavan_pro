import { describe, it, expect } from "vitest";
import { PreferencesSchema, RecommendRequestSchema, GENRES, LEVELS } from "@/lib/schemas";

describe("PreferencesSchema Validation", () => {
  it("validates a complete preference object", () => {
    const valid = {
      genres: ["sci-fi", "thriller"],
      level: "intermediate",
      maxPages: 400,
      mood: ["mind-bending", "dark"],
      similarTo: ["Dune"],
      avoid: ["romance", "gore"],
    };

    const result = PreferencesSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.genres).toEqual(["sci-fi", "thriller"]);
      expect(result.data.level).toBe("intermediate");
      expect(result.data.maxPages).toBe(400);
    }
  });

  it("applies default values for optional fields", () => {
    const minimal = {
      genres: ["fantasy"],
    };

    const result = PreferencesSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.level).toBe("beginner");
      expect(result.data.mood).toEqual([]);
      expect(result.data.similarTo).toEqual([]);
      expect(result.data.avoid).toEqual([]);
    }
  });

  it("fails when genres is empty", () => {
    const invalid = {
      genres: [],
      level: "beginner",
    };

    const result = PreferencesSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("fails on unsupported genre values", () => {
    const invalid = {
      genres: ["unsupported_genre_xyz"],
    };

    const result = PreferencesSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("supports all launch genres", () => {
    for (const genre of GENRES) {
      const result = PreferencesSchema.safeParse({ genres: [genre] });
      expect(result.success).toBe(true);
    }
  });

  it("supports all defined reader levels", () => {
    for (const level of LEVELS) {
      const result = PreferencesSchema.safeParse({
        genres: ["classics"],
        level,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("RecommendRequestSchema Validation", () => {
  it("accepts a valid request message with optional hints", () => {
    const payload = {
      message: "Looking for an exciting mystery novel",
      genre: "mystery",
      level: "beginner",
    };

    const result = RecommendRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects an empty message", () => {
    const payload = {
      message: "",
    };

    const result = RecommendRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("enforces message character limit of 4000 characters", () => {
    const longMessage = "a".repeat(4001);
    const result = RecommendRequestSchema.safeParse({ message: longMessage });
    expect(result.success).toBe(false);

    const validLongMessage = "a".repeat(4000);
    const validResult = RecommendRequestSchema.safeParse({ message: validLongMessage });
    expect(validResult.success).toBe(true);
  });
});
