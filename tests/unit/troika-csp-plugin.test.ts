import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  disableTroikaUnicodeCdn,
  forceTroikaMainThread,
  UNICODE_FONT_RESOLVER_CDN,
} from "../../vite.troika-csp-plugin";

function listTroikaFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) visit(full);
      else if (/\.(js|mjs|cjs)$/.test(entry)) files.push(full);
    }
  };
  visit(root);
  return files;
}

describe("disableTroikaUnicodeCdn", () => {
  const troikaRoot = path.resolve("node_modules/troika-three-text");

  it("strips the jsDelivr unicode-font-resolver URL from every troika JS file", () => {
    const files = listTroikaFiles(troikaRoot).filter((file) =>
      readFileSync(file, "utf8").includes(UNICODE_FONT_RESOLVER_CDN),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const transformed = disableTroikaUnicodeCdn(readFileSync(file, "utf8"));
      expect(transformed, file).not.toContain(UNICODE_FONT_RESOLVER_CDN);
      expect(transformed, file).not.toContain(
        "cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver",
      );
    }
  });

  it("does not retry a failed resolver lookup on the default CDN", () => {
    const esm = readFileSync(
      path.join(troikaRoot, "dist/troika-three-text.esm.js"),
      "utf8",
    );
    expect(esm).toContain("trying default CDN");
    const transformed = disableTroikaUnicodeCdn(esm);
    expect(transformed).not.toContain("trying default CDN");
    expect(transformed).toContain(".catch((function(n){throw n}))");
  });

  it("finishes typesetting when the stub resolver returns no fallback fonts", () => {
    const source = readFileSync(
      path.join(troikaRoot, "src/FontResolver.js"),
      "utf8",
    );
    const esm = readFileSync(
      path.join(troikaRoot, "dist/troika-three-text.esm.js"),
      "utf8",
    );
    for (const [label, code] of [
      ["source", source],
      ["esm", esm],
    ] as const) {
      const transformed = disableTroikaUnicodeCdn(code);
      expect(transformed, label).toContain(
        "if (fontUrls.length === 0) { allDone(); return; }",
      );
    }
  });

  it("skips typography runs that have no fontObj", () => {
    const esm = readFileSync(
      path.join(troikaRoot, "dist/troika-three-text.esm.js"),
      "utf8",
    );
    const transformed = disableTroikaUnicodeCdn(esm);
    expect(transformed).toContain(
      "const { fontObj } = run; if (!fontObj) return",
    );
  });

  it("does not fetch a catalog when the resolver data URL is empty", () => {
    const esm = readFileSync(
      path.join(troikaRoot, "dist/troika-three-text.esm.js"),
      "utf8",
    );
    const transformed = disableTroikaUnicodeCdn(esm);
    expect(transformed).toContain(
      "if(!l)return Promise.resolve({fontUrls:[],chars:new Uint8Array(t.length)});",
    );
    expect(transformed.indexOf("if(!l)return Promise.resolve")).toBeGreaterThan(
      -1,
    );
  });
});

describe("forceTroikaMainThread", () => {
  const workerRoot = path.resolve("node_modules/troika-worker-utils");

  it("forces supportsWorkers() to return false in the ESM build and source", () => {
    const files = [
      path.join(workerRoot, "dist/troika-worker-utils.esm.js"),
      path.join(workerRoot, "src/supportsWorkers.js"),
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toMatch(/supportsWorkers = /);
      const transformed = forceTroikaMainThread(source);
      expect(transformed, file).toMatch(
        /(?:var|let) supportsWorkers = (?:function \(\)|\(\) =>) \{\s*return false;/,
      );
    }
  });
});
