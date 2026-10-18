import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "./utils";

describe("isValidSlug", () => {
  it.each(["rotex", "festool-rotex-150", "g0555", "a-b-c"])("accepts %s", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each([
    "",
    "https://www.festool.com/products/sanders/rotex",
    "has/slash",
    "Upper-Case",
    "has space",
    "-leading",
    "trailing-",
    "double--hyphen",
    "under_score",
  ])("rejects %j", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });

  it("accepts whatever slugify produces from a pasted URL", () => {
    const slug = slugify("https://www.festool.com/products/sanders/rotex");
    expect(slug).toBe("https-www-festool-com-products-sanders-rotex");
    expect(isValidSlug(slug)).toBe(true);
  });
});
