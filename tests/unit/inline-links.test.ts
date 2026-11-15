import { describe, expect, it } from "vitest";
import {
  containsInlineLinkMarkup,
  inlineLinkKinds,
  inlineLinks,
  inlineLinksToPlainText,
  parseInlineLinks,
  type InlineSegment,
} from "../../src/narrative/inline-links";

// Every text here is synthetic. No book text is read or written.

function segments(text: string): InlineSegment[] {
  const parsed = parseInlineLinks(text);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.segments;
}

function syntaxError(text: string): { offset: number; message: string } {
  const parsed = parseInlineLinks(text);
  if (parsed.ok) throw new Error(`expected a syntax error for ${text}`);
  return parsed.error;
}

describe("parseInlineLinks", () => {
  it("returns plain text unchanged as one segment", () => {
    expect(segments("A plain [sentence] with a | bar.")).toEqual([
      { kind: "text", text: "A plain [sentence] with a | bar." },
    ]);
    expect(segments("")).toEqual([]);
  });

  it("parses bare and labelled links with offsets and link positions", () => {
    expect(
      segments(
        "Works at [[location:test-town]] for [[organization:guild|the Guild]].",
      ),
    ).toEqual([
      { kind: "text", text: "Works at " },
      {
        kind: "link",
        target: "location:test-town",
        label: null,
        offset: 9,
        index: 0,
      },
      { kind: "text", text: " for " },
      {
        kind: "link",
        target: "organization:guild",
        label: "the Guild",
        offset: 36,
        index: 1,
      },
      { kind: "text", text: "." },
    ]);
  });

  it("accepts every mention-target kind and a possessive after the link", () => {
    for (const kind of inlineLinkKinds) {
      expect(inlineLinks(segments(`[[${kind}:x-1]]'s`))[0]?.target).toBe(
        `${kind}:x-1`,
      );
    }
  });

  it("keeps labels with punctuation, abbreviations and inner spaces", () => {
    expect(
      inlineLinks(
        segments("Met [[character:test-doc|Dr. Test-Doc, Jr.]] once."),
      ),
    ).toMatchObject([{ label: "Dr. Test-Doc, Jr." }]);
  });

  it("unescapes literal brackets and backslashes outside links", () => {
    expect(segments("Tagged \\[[draft\\]] in a \\\\ folder.")).toEqual([
      { kind: "text", text: "Tagged [[draft]] in a \\ folder." },
    ]);
  });

  it.each([
    ["Open [[location:sol and more", "unclosed link", 5],
    ["Stray ]] here", 'stray "]]"', 6],
    ["Bad \\n escape", "backslash", 4],
    ["Trailing \\", "backslash", 9],
    ["[[location:a|x [[location:b]] y]]", "do not nest", 15],
    ["[[ location:sol]]", "whitespace", 2],
    ["[[location:sol | Sol]]", "whitespace", 2],
    ["[[location:sol|Sol|Star]]", 'more than one "|"', 18],
    ["[[location:sol|\nSol]]", "line break", 15],
    ["[[location:sol|]]", "label is empty", 15],
    ["[[location:sol|   ]]", "label is empty", 15],
    ["[[location:sol| Sol]]", "start or end with whitespace", 15],
    ["[[location:sol|Sol ]]", "start or end with whitespace", 15],
    ["[[location:sol|S[o]l]]", 'must not contain "["', 15],
    ["[[location:sol|S\\l]]", 'must not contain "["', 15],
    ["[[]]", "target is empty", 2],
    ["[[Location:sol]]", "not a valid entity ID", 2],
    ["[[location:Sol]]", "not a valid entity ID", 2],
    ["[[sol]]", "not a valid entity ID", 2],
    ["[[asset:species-human]]", "cannot be linked", 2],
    ["[[astronomy:sol]]", "cannot be linked", 2],
  ])("rejects %j", (text, message, offset) => {
    const error = syntaxError(text);
    expect(error.message).toContain(message);
    expect(error.offset).toBe(offset);
  });
});

describe("inlineLinksToPlainText", () => {
  it("shows labels, default names and unescaped literals", () => {
    expect(
      inlineLinksToPlainText(
        "At [[location:test-town]] with [[character:x|X]] and \\[[y\\]].",
        (target, index) => `${target.toUpperCase()}#${index}`,
      ),
    ).toBe("At LOCATION:TEST-TOWN#0 with X and [[y]].");
  });

  it("returns unparseable text unchanged", () => {
    expect(inlineLinksToPlainText("Open [[x", () => "?")).toBe("Open [[x");
  });
});

describe("containsInlineLinkMarkup", () => {
  it("flags link brackets and escapes but not lone characters", () => {
    expect(containsInlineLinkMarkup("A [b] | c \\ d")).toBe(false);
    expect(containsInlineLinkMarkup("a [[b")).toBe(true);
    expect(containsInlineLinkMarkup("a ]] b")).toBe(true);
    expect(containsInlineLinkMarkup("a \\\\ b")).toBe(true);
  });
});
