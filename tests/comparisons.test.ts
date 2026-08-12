import { test, expect, describe } from "bun:test";
import { Statement } from "../src/statement";
import { LevenshteinDistance, JaccardSimilarity, HybridSimilarity } from "../src/comparisons";

describe("Comparisons", () => {
  test("LevenshteinDistance returns 1.0 for exact matches", () => {
    const s1 = new Statement("How are you?");
    const s2 = new Statement("How are you?");
    expect(LevenshteinDistance(s1, s2)).toBe(1.0);
  });

  test("LevenshteinDistance returns high similarity for minor typos", () => {
    const s1 = new Statement("How are you?");
    const s2 = new Statement("How area you?");
    const score = LevenshteinDistance(s1, s2);
    expect(score).toBeGreaterThan(0.8);
  });

  test("JaccardSimilarity calculates token overlap", () => {
    const s1 = new Statement("the quick brown fox");
    const s2 = new Statement("the brown fox jumps");
    const score = JaccardSimilarity(s1, s2);
    expect(score).toBeGreaterThan(0.5);
  });

  test("HybridSimilarity combines string and token matching", () => {
    const s1 = new Statement("Hello world");
    const s2 = new Statement("Hello world!");
    expect(HybridSimilarity(s1, s2)).toBeGreaterThan(0.9);
  });
});
