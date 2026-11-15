import { expect, test, type Page, type Request } from "@playwright/test";

const MISSING_GLYPH_TEXT = "Galactic center · +Xg 你好★";

function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "blob:" ||
      parsed.protocol === "data:" ||
      parsed.protocol === "about:"
    ) {
      return parsed.protocol.replace(":", "");
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

test("production bundle makes no non-self requests and no CSP violations", async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL ?? "http://127.0.0.1:4202").origin;
  const requests: {
    url: string;
    origin: string | null;
    isSelf: boolean;
    failed?: string;
  }[] = [];
  const consoleLogs: { type: string; text: string }[] = [];
  const pageErrors: string[] = [];

  const isSelf = (url: string) => {
    const requestOrigin = originOf(url);
    if (requestOrigin === "blob" || requestOrigin === "data") return true;
    return requestOrigin === origin;
  };

  await page.addInitScript(() => {
    const state = window as unknown as {
      __cspViolations?: unknown[];
      __r3fRoots?: Map<
        HTMLCanvasElement,
        { store?: { getState?: () => { scene?: unknown } } }
      >;
    };
    state.__cspViolations = [];
    const originalSet = Map.prototype.set;
    Map.prototype.set = function (this: Map<unknown, unknown>, key, value) {
      if (
        typeof HTMLCanvasElement !== "undefined" &&
        key instanceof HTMLCanvasElement &&
        value &&
        typeof value === "object" &&
        "store" in value
      ) {
        state.__r3fRoots = this as Map<
          HTMLCanvasElement,
          { store?: { getState?: () => { scene?: unknown } } }
        >;
      }
      return originalSet.call(this, key, value);
    };
    const store = (event: SecurityPolicyViolationEvent) => {
      state.__cspViolations!.push({
        effectiveDirective: event.effectiveDirective,
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        originalPolicy: event.originalPolicy,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
      });
    };
    document.addEventListener("securitypolicyviolation", store);
    window.addEventListener("securitypolicyviolation", store);
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
      JSON.stringify({
        furthestChapterRead: "1.20",
        viewChapter: "1.20",
        displayDate: null,
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  });

  page.on("request", (request: Request) => {
    requests.push({
      url: request.url(),
      origin: originOf(request.url()),
      isSelf: isSelf(request.url()),
    });
  });
  page.on("requestfailed", (request: Request) => {
    requests.push({
      url: request.url(),
      origin: originOf(request.url()),
      isSelf: isSelf(request.url()),
      failed: request.failure()?.errorText,
    });
  });
  page.on("console", (message) => {
    consoleLogs.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/", { waitUntil: "load", timeout: 60_000 });

  await expect(page.getByRole("button", { name: "What is this?" })).toBeVisible(
    {
      timeout: 30_000,
    },
  );
  await expect(
    page.locator('[data-testid="star-map-canvas"], canvas').first(),
  ).toBeVisible({
    timeout: 15_000,
  });

  const aboutLink = page
    .locator(".topbar-title")
    .getByRole("button", { name: "What is this?" });
  await expect(aboutLink).toBeVisible();
  await aboutLink.click();
  const about = page.getByRole("dialog", { name: "What is this?" });
  if (!(await about.isVisible().catch(() => false))) {
    await aboutLink.evaluate((element: HTMLElement) => element.click());
  }
  await expect(about).toBeVisible({ timeout: 10_000 });
  await about.getByRole("button", { name: "Close" }).click();
  await expect(about).toHaveCount(0);

  const sol = page.getByRole("button", { name: "Solar System" }).first();
  await expect(sol).toBeVisible({ timeout: 15_000 });
  await sol.click();
  await expect(
    page.getByRole("complementary", { name: "Object inspector" }),
  ).toBeVisible({
    timeout: 10_000,
  });

  const search = page.getByRole("searchbox", {
    name: "Search visible objects",
  });
  await expect(search).toBeVisible({ timeout: 15_000 });
  await search.fill("alpha centauri");
  const searchHit = page
    .locator(".left-rail")
    .getByRole("button", { name: "Alpha Centauri Rigil Kentaurus" });
  await expect(searchHit).toBeVisible({ timeout: 15_000 });
  await searchHit.click();
  await expect(
    page
      .locator(".right-rail")
      .getByRole("heading", { name: "Alpha Centauri" }),
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Date mode" }).click();
  await expect(page.getByRole("button", { name: "Date mode" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Chapter mode" }).click();
  await expect(
    page.getByRole("button", { name: "Chapter mode" }),
  ).toHaveAttribute("aria-pressed", "true");

  const inject = await injectMissingGlyph(page, MISSING_GLYPH_TEXT);
  expect(inject.updatedCount, JSON.stringify(inject)).toBeGreaterThan(0);
  await page.waitForTimeout(2500);

  const violations = await page.evaluate(
    () =>
      (window as unknown as { __cspViolations?: unknown[] }).__cspViolations ??
      [],
  );
  const nonSelf = requests.filter((request) => !request.isSelf);
  const cspConsole = consoleLogs.filter((entry) =>
    /content security policy|unsafe-eval|Function\(\) blocked|Refused to/i.test(
      entry.text,
    ),
  );

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(cspConsole, JSON.stringify(cspConsole, null, 2)).toEqual([]);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  expect(nonSelf, JSON.stringify(nonSelf, null, 2)).toEqual([]);
});

async function injectMissingGlyph(page: Page, missingText: string) {
  return page.evaluate((text) => {
    type TroikaText = {
      text: string;
      sync?: () => void;
      children?: unknown[];
    };
    type Hook = { memoizedState?: unknown; next?: Hook };
    const texts: TroikaText[] = [];
    const seenFibers = new Set<object>();
    const seenStores = new Set<object>();
    const seenObjects = new Set<object>();

    const isTroikaText = (value: unknown): value is TroikaText => {
      if (!value || typeof value !== "object") return false;
      const node = value as TroikaText;
      return typeof node.text === "string" && typeof node.sync === "function";
    };

    const walkObject3D = (obj: unknown, depth: number) => {
      if (!obj || typeof obj !== "object" || depth > 200) return;
      if (seenObjects.has(obj)) return;
      seenObjects.add(obj);
      if (isTroikaText(obj)) texts.push(obj);
      const children = (obj as TroikaText).children;
      if (Array.isArray(children)) {
        for (const child of children) walkObject3D(child, depth + 1);
      }
    };

    const considerStore = (value: unknown, depth = 0) => {
      if (!value || typeof value !== "object" || depth > 8) return;
      if (seenStores.has(value)) return;
      seenStores.add(value);
      const record = value as Record<string, unknown>;
      if (typeof record.getState === "function") {
        try {
          considerStore(record.getState(), depth + 1);
        } catch {
          // The hook value may not be a store.
        }
      }
      if (record.scene) walkObject3D(record.scene, 0);
      for (const key of [
        "current",
        "store",
        "root",
        "__r3f",
        "value",
        "0",
        "1",
      ]) {
        if (key in record) considerStore(record[key], depth + 1);
      }
    };

    const walkFiber = (fiber: unknown, depth: number) => {
      if (!fiber || typeof fiber !== "object" || depth > 8000) return;
      if (seenFibers.has(fiber)) return;
      seenFibers.add(fiber);
      const node = fiber as {
        stateNode?: unknown;
        memoizedState?: Hook;
        memoizedProps?: unknown;
        child?: unknown;
        sibling?: unknown;
      };
      if (isTroikaText(node.stateNode)) texts.push(node.stateNode);
      considerStore(node.stateNode);
      considerStore(node.memoizedProps);
      let hook = node.memoizedState;
      for (let i = 0; i < 60 && hook; i += 1) {
        considerStore(hook.memoizedState);
        hook = hook.next;
      }
      walkFiber(node.child, depth + 1);
      walkFiber(node.sibling, depth + 1);
    };

    const startFiber = (raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      const record = raw as { current?: object };
      const fiber =
        record.current && typeof record.current === "object"
          ? record.current
          : raw;
      let top: { return?: unknown } = fiber as { return?: unknown };
      for (let i = 0; i < 40; i += 1) {
        const parent = top.return;
        if (!parent || typeof parent !== "object") break;
        top = parent as { return?: unknown };
      }
      walkFiber(top, 0);
    };

    const r3fRoots = (
      window as unknown as {
        __r3fRoots?: Map<
          HTMLCanvasElement,
          { store?: { getState?: () => { scene?: unknown } } }
        >;
      }
    ).__r3fRoots;
    if (r3fRoots) {
      for (const entry of r3fRoots.values()) {
        const scene = entry.store?.getState?.()?.scene;
        if (scene) walkObject3D(scene, 0);
      }
    }

    const elements = [
      document.getElementById("root"),
      document.body,
      document.querySelector("[data-testid='star-map-canvas']"),
      ...Array.from(document.querySelectorAll("canvas")),
    ].filter((element, index, all): element is Element => {
      return element !== null && all.indexOf(element) === index;
    });

    for (const element of elements) {
      considerStore(element);
      considerStore((element as unknown as { __r3f?: unknown }).__r3f);
      const key = Object.keys(element).find(
        (name) =>
          name.startsWith("__reactFiber$") ||
          name.startsWith("__reactInternalInstance$") ||
          name.startsWith("__reactContainer$"),
      );
      if (key) startFiber((element as unknown as Record<string, unknown>)[key]);
    }

    const unique = [...new Set(texts)];
    for (const node of unique) {
      node.text = text;
      node.sync?.();
    }
    return {
      found: unique.map((node) => node.text),
      updatedCount: unique.length,
    };
  }, missingText);
}
