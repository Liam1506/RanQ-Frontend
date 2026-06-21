import { describe, expect, it } from "vitest";
import { escapeHtml, formatDate } from "./format";

describe("escapeHtml", () => {
  it("returns an empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("leaves safe text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes greater-than", () => {
    expect(escapeHtml("1 > 0")).toBe("1 &gt; 0");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml(`say "hi"`)).toBe("say &quot;hi&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapes all XSS characters in one string", () => {
    expect(escapeHtml(`<a href="/" onclick='alert(1)'>x & y</a>`)).toBe(
      "&lt;a href=&quot;/&quot; onclick=&#39;alert(1)&#39;&gt;x &amp; y&lt;/a&gt;"
    );
  });

  it("escapes multiple occurrences of the same character", () => {
    expect(escapeHtml("<<>>")).toBe("&lt;&lt;&gt;&gt;");
  });
});

describe("formatDate", () => {
  it("returns an empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns a non-empty string for a valid ISO date", () => {
    const result = formatDate("2024-06-15T10:00:00Z");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes the year for a known ISO date", () => {
    const result = formatDate("2024-06-15T10:00:00Z");
    expect(result).toMatch(/2024/);
  });

  it("different dates produce different output", () => {
    const jan = formatDate("2024-01-01T00:00:00Z");
    const dec = formatDate("2024-12-31T00:00:00Z");
    expect(jan).not.toBe(dec);
  });
});
