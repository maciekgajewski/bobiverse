import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  disableTroikaUnicodeCdn,
  forceTroikaMainThread,
  troikaCspPlugin,
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
      expect(transformed, file).not.toContain("cdn.jsdelivr.net");
    }
  });

  it("strips the default-CDN retry from pretty-printed Vite prebundles", () => {
    const prebundled = `
      var v = "${UNICODE_FONT_RESOLVER_CDN}";
      }).catch((function(n) {
        if (l !== v) return j || (console.error("unicode-font-resolver: Failed loading from dataUrl \\"" + l + "\\", trying default CDN. " + n.message), j = !0), l = v, p.delete(t), M(t);
        throw n;
      })), p.set(t, n)), n;
    `;
    expect(prebundled).toContain("trying default CDN");
    const transformed = disableTroikaUnicodeCdn(prebundled);
    expect(transformed).not.toContain("trying default CDN");
    expect(transformed).not.toContain("cdn.jsdelivr.net");
    expect(transformed).toContain(".catch((function(n){throw n}))");
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

describe("troika CSP plugin failure modes", () => {
  it("throws when a targeted troika-three-text file still contains the CDN URL after the transform", () => {
    const plugin = troikaCspPlugin();
    const transform = plugin.transform as (code: string, id: string) => unknown;
    const id = "/node_modules/troika-three-text/dist/unexpected.js";
    const code =
      'const url = "https://cdn.jsdelivr.net/gh/other-package@1.0.0";';
    expect(() => transform(code, id)).toThrow(/CDN URL|cdn\.jsdelivr\.net/i);
  });

  it("throws when a targeted file still contains the default-CDN retry after the transform", () => {
    const plugin = troikaCspPlugin();
    const transform = plugin.transform as (code: string, id: string) => unknown;
    const id = "/node_modules/troika-three-text/dist/unexpected.js";
    const code = 'console.error("trying default CDN");';
    expect(() => transform(code, id)).toThrow(/trying default CDN/i);
  });

  it("throws when supportsWorkers is still unpatched after the transform", () => {
    const plugin = troikaCspPlugin();
    const transform = plugin.transform as (code: string, id: string) => unknown;
    const id = "/node_modules/troika-worker-utils/dist/unexpected.js";
    const code = "const supportsWorkers = function () { return true; };";
    expect(() => transform(code, id)).toThrow(/unpatched supportsWorkers/i);
  });

  function applyTransform(
    plugin: ReturnType<typeof troikaCspPlugin>,
    code: string,
    id: string,
  ) {
    const transform = plugin.transform as (code: string, id: string) => unknown;
    return transform(code, id);
  }

  function fireExpectedPatches(plugin: ReturnType<typeof troikaCspPlugin>) {
    const text = readFileSync(
      path.join("node_modules/troika-three-text/dist/troika-three-text.esm.js"),
      "utf8",
    );
    const workers = readFileSync(
      path.join(
        "node_modules/troika-worker-utils/dist/troika-worker-utils.esm.js",
      ),
      "utf8",
    );
    applyTransform(
      plugin,
      text,
      "/node_modules/troika-three-text/dist/troika-three-text.esm.js",
    );
    applyTransform(
      plugin,
      workers,
      "/node_modules/troika-worker-utils/dist/troika-worker-utils.esm.js",
    );
  }

  it("fails the build if emitted JS contains cdn.jsdelivr.net", () => {
    const plugin = troikaCspPlugin();
    fireExpectedPatches(plugin);
    const generateBundle = plugin.generateBundle as (
      options: object,
      bundle: object,
    ) => void;
    const bundle = {
      "assets/index.js": {
        type: "chunk",
        fileName: "assets/index.js",
        code: 'import "https://cdn.jsdelivr.net/npm/left-pad";',
      },
    };
    expect(() => generateBundle({}, bundle)).toThrow(/cdn\.jsdelivr\.net/);
  });

  it("fails the build if an expected patch never fired", () => {
    const plugin = troikaCspPlugin();
    const generateBundle = plugin.generateBundle as (
      options: object,
      bundle: object,
    ) => void;
    const bundle = {
      "assets/index.js": {
        type: "chunk",
        fileName: "assets/index.js",
        code: "console.log('ok');",
      },
    };
    expect(() => generateBundle({}, bundle)).toThrow(
      /expected patch\(es\) did not fire/,
    );
    const plugin2 = troikaCspPlugin();
    const close = plugin2.closeBundle as () => void;
    expect(() => close()).toThrow(/expected patch\(es\) did not fire/);
  });
});
