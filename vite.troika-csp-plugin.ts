import type { Plugin } from "vite";

export const UNICODE_FONT_RESOLVER_CDN =
  "https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data";

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
    /(?:var|let) supportsWorkers = (?:function \(\)|\(\) =>) \{/g,
    (match) => `${match} return false;`,
  );
}

export function troikaCspPlugin(): Plugin {
  return {
    name: "bobiverse-troika-csp",
    transform(code, id) {
      const normalized = id.replace(/\\/g, "/");
      let next = code;
      if (normalized.includes("troika-three-text")) {
        next = disableTroikaUnicodeCdn(next);
      }
      if (normalized.includes("troika-worker-utils")) {
        next = forceTroikaMainThread(next);
      }
      return next === code ? null : { code: next, map: null };
    },
  };
}
