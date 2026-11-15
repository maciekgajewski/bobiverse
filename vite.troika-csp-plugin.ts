import type { Plugin } from "vite";

type EmittedJsBundle = Record<
  string,
  { type: string; fileName?: string; code?: string }
>;

export const UNICODE_FONT_RESOLVER_CDN =
  "https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data";

export const TROIKA_CDN_RETRY_MARKER = "trying default CDN";

export const EXPECTED_TROIKA_CSP_PATCHES = [
  "cdn-url",
  "cdn-retry",
  "supports-workers",
] as const;

export type TroikaCspPatch = (typeof EXPECTED_TROIKA_CSP_PATCHES)[number];

const fontUrlsForEachSource = `fontUrls.forEach((url, i) => {
            loadFont(url, fontObj => {
              fontResolutions[i + fontIndexOffset] = fontObj
              if (++loadedCount === fontUrls.length) {
                allDone();
              }
            })
          })`;

const fontUrlsForEachEsm = `fontUrls.forEach((url, i) => {
            loadFont(url, fontObj => {
              fontResolutions[i + fontIndexOffset] = fontObj;
              if (++loadedCount === fontUrls.length) {
                allDone();
              }
            });
          });`;

const SUPPORTS_WORKERS_START =
  /(?:var|let) supportsWorkers = (?:function \(\)|\(\) =>) \{/g;
/**
 * Rewrite troika-three-text so a missing glyph cannot fetch the default
 * jsDelivr unicode-font-resolver dataset. A failed custom dataUrl also must
 * not fall back to that CDN (the stock client retries it automatically).
 */
export function disableTroikaUnicodeCdn(code: string): string {
  let next = code;
  next = next.replace(
    /\.catch\(\(?function\((\w+)\)\{if\([^)]+\)return[\s\S]{0,400}?trying default CDN[\s\S]{0,200}?throw \1;?\}\)?\)/g,
    ".catch((function($1){throw $1}))",
  );
  next = next.replaceAll(UNICODE_FONT_RESOLVER_CDN, "");
  // Troika also embeds a Khronos WebGL debug loader on jsDelivr. The public
  // CSP forbids that origin, and generateBundle fails the build if any
  // emitted JS still mentions cdn.jsdelivr.net. A hash bump of this URL
  // is left in place so the residual and emit checks fail loudly.
  next = next.replaceAll(
    "https://cdn.jsdelivr.net/gh/KhronosGroup/WebGLDeveloperTools@b42e702/src/debug/webgl-debug.js",
    "",
  );
  // Missing-glyph fallback fonts may be absent; skip those typography runs
  // instead of destructuring metrics from undefined.
  next = next.replaceAll(
    "const { fontObj } = run",
    "const { fontObj } = run; if (!fontObj) return",
  );
  // An empty data URL would otherwise fetch same-origin paths like
  // /codepoint-index/....json, get HTML, and throw a JSON parse error.
  next = next.replaceAll(
    'var l=(n.dataUrl||v).replace(/\\/$/g,""),h=',
    'var l=(n.dataUrl||v).replace(/\\/$/g,"");if(!l)return Promise.resolve({fontUrls:[],chars:new Uint8Array(t.length)});var h=',
  );
  const offsetBlocks = [
    `          const fontIndexOffset = fontResolutions.length
          let charIdx = 0;
          fallbackRanges.forEach(range => {`,
    `          const fontIndexOffset = fontResolutions.length;
          let charIdx = 0;
          fallbackRanges.forEach(range => {`,
  ];
  for (const block of offsetBlocks) {
    if (next.includes(block)) {
      next = next.replaceAll(
        block,
        `          if (fontUrls.length === 0) { allDone(); return; }
${block}`,
      );
    }
  }
  for (const block of [fontUrlsForEachEsm, fontUrlsForEachSource]) {
    if (next.includes(block)) {
      next = next.replaceAll(
        block,
        `if (fontUrls.length === 0) { allDone(); } else { ${block} }`,
      );
    }
  }
  return next;
}

/**
 * troika typography workers rehydrate module functions with
 * importScripts(blob:...). That is blocked by script-src 'self' even though
 * worker-src allows blob workers, so typesetting throws and the official
 * main-thread fallback never runs. Force supportsWorkers() to false so
 * typography stays on the main thread under the public CSP.
 */
export function forceTroikaMainThread(code: string): string {
  return code.replace(
    SUPPORTS_WORKERS_START,
    (match) => `${match} return false;`,
  );
}

export function hasUnpatchedSupportsWorkers(code: string): boolean {
  // Broader than the rewrite regex so a supportsWorkers shape the patch
  // missed (const, odd whitespace) still fails the build.
  const hasDefinition =
    /(?:var|let|const)\s+supportsWorkers\s*=\s*(?:function\s*\(\)\s*|\(\)\s*=>)\s*\{/.test(
      code,
    );
  if (!hasDefinition) return false;
  const patched =
    /(?:var|let|const)\s+supportsWorkers\s*=\s*(?:function\s*\(\)\s*|\(\)\s*=>)\s*\{\s*return false;/.test(
      code,
    );
  return !patched;
}

export function residualTroikaCspHazards(id: string, code: string): string[] {
  const normalized = id.replace(/\\/g, "/");
  const issues: string[] = [];
  const isText = normalized.includes("troika-three-text");
  const isWorker = normalized.includes("troika-worker-utils");
  if (!isText && !isWorker) return issues;
  // Broader than the exact current CDN constant so a troika URL bump fails
  // loudly here instead of shipping cdn.jsdelivr.net.
  if (code.includes("cdn.jsdelivr.net")) {
    issues.push("a CDN URL (cdn.jsdelivr.net)");
  }
  if (isText && code.includes(TROIKA_CDN_RETRY_MARKER)) {
    issues.push(`the '${TROIKA_CDN_RETRY_MARKER}' retry`);
  }
  if (isWorker && hasUnpatchedSupportsWorkers(code)) {
    issues.push("an unpatched supportsWorkers implementation");
  }
  return issues;
}

export function assertNoResidualTroikaCspHazards(
  id: string,
  code: string,
): void {
  const issues = residualTroikaCspHazards(id, code);
  if (issues.length === 0) return;
  throw new Error(
    `bobiverse-troika-csp: ${id} still contains ${issues.join(" and ")} after the transform.`,
  );
}

export function recordTroikaCspPatches(
  before: string,
  after: string,
  kind: "troika-three-text" | "troika-worker-utils",
  fired: Set<TroikaCspPatch>,
): void {
  if (kind === "troika-three-text") {
    if (
      before.includes(UNICODE_FONT_RESOLVER_CDN) &&
      !after.includes(UNICODE_FONT_RESOLVER_CDN)
    ) {
      fired.add("cdn-url");
    }
    if (
      before.includes(TROIKA_CDN_RETRY_MARKER) &&
      !after.includes(TROIKA_CDN_RETRY_MARKER)
    ) {
      fired.add("cdn-retry");
    }
  }
  if (
    kind === "troika-worker-utils" &&
    hasUnpatchedSupportsWorkers(before) &&
    !hasUnpatchedSupportsWorkers(after)
  ) {
    fired.add("supports-workers");
  }
}

export function assertExpectedTroikaCspPatchesFired(
  fired: Iterable<string>,
): void {
  const present = new Set(fired);
  const missing = EXPECTED_TROIKA_CSP_PATCHES.filter(
    (patch) => !present.has(patch),
  );
  if (missing.length === 0) return;
  throw new Error(
    `bobiverse-troika-csp: expected patch(es) did not fire at least once: ${missing.join(", ")}. A troika upgrade may have slipped the transform.`,
  );
}

export function assertEmittedJsHasNoJsdelivr(bundle: EmittedJsBundle): void {
  const hits: string[] = [];
  for (const output of Object.values(bundle)) {
    if (output.type !== "chunk" || typeof output.code !== "string") continue;
    if (output.code.includes("cdn.jsdelivr.net")) {
      hits.push(output.fileName ?? "unknown");
    }
  }
  if (hits.length === 0) return;
  throw new Error(
    `bobiverse-troika-csp: emitted JS still contains cdn.jsdelivr.net (${hits.join(", ")}).`,
  );
}

export function troikaCspPlugin(): Plugin {
  const fired = new Set<TroikaCspPatch>();
  let emitChecked = false;

  const assertBuild = (bundle?: EmittedJsBundle) => {
    if (bundle) assertEmittedJsHasNoJsdelivr(bundle);
    assertExpectedTroikaCspPatchesFired(fired);
  };

  return {
    name: "bobiverse-troika-csp",
    transform(code, id) {
      const normalized = id.replace(/\\/g, "/");
      const isText = normalized.includes("troika-three-text");
      const isWorker = normalized.includes("troika-worker-utils");
      if (!isText && !isWorker) return null;
      let next = code;
      if (isText) {
        next = disableTroikaUnicodeCdn(next);
        recordTroikaCspPatches(code, next, "troika-three-text", fired);
      }
      if (isWorker) {
        const beforeWorkers = next;
        next = forceTroikaMainThread(next);
        recordTroikaCspPatches(
          beforeWorkers,
          next,
          "troika-worker-utils",
          fired,
        );
      }
      assertNoResidualTroikaCspHazards(id, next);
      return next === code ? null : { code: next, map: null };
    },
    generateBundle(_options, bundle) {
      assertBuild(bundle);
      emitChecked = true;
    },
    closeBundle() {
      if (!emitChecked) assertBuild();
    },
  };
}
