import { describe, it, expect } from "vitest";
import { cleanText } from "@/lib/text/cleanText";

describe("cleanText", () => {
  it("removes bold and italic markdown asterisks", () => {
    const raw = "I noticed you didn't specify a reading level, so I've started with **beginner** recommendations. You can adjust this anytime!";
    const cleaned = cleanText(raw);
    expect(cleaned).toBe("I noticed you didn't specify a reading level, so I've started with beginner recommendations. You can adjust this anytime!");
    expect(cleaned).not.toContain("**");
    expect(cleaned).not.toContain("*");
  });

  it("removes header markers", () => {
    const raw = "### Why It Fits\nThis book is great.";
    const cleaned = cleanText(raw);
    expect(cleaned).toBe("Why It Fits\nThis book is great.");
    expect(cleaned).not.toContain("###");
  });

  it("removes list bullets", () => {
    const raw = "* Point 1\n* Point 2\n- Point 3";
    const cleaned = cleanText(raw);
    expect(cleaned).toBe("Point 1\nPoint 2\nPoint 3");
  });

  it("handles null and empty input safely", () => {
    expect(cleanText(null)).toBe("");
    expect(cleanText("")).toBe("");
  });
});
