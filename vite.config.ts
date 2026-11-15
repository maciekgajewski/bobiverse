import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { troikaCspPlugin } from "./vite.troika-csp-plugin";
import { resolveAppVersion } from "./src/version-resolution";

/** One git command's trimmed output, or null (no git, not a repository). */
function git(args: string[]): string | null {
  try {
    return (
      execFileSync("git", args, {
        cwd: import.meta.dirname,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || null
    );
  } catch {
    return null;
  }
}

const packageVersion = (
  JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version;
const releaseVersion = process.env.VITE_APP_VERSION?.trim();
const appVersion = resolveAppVersion({
  envVersion: releaseVersion,
  envCommit: process.env.BOBIVERSE_COMMIT,
  packageVersion,
  describe: releaseVersion
    ? null
    : git(["describe", "--tags", "--long", "--dirty", "--always"]),
  headCommit: process.env.BOBIVERSE_COMMIT ? null : git(["rev-parse", "HEAD"]),
});

export default defineConfig({
  plugins: [react(), troikaCspPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion.version),
    __APP_COMMIT__: JSON.stringify(appVersion.commit ?? ""),
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: ["bobiverse.local"],
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
    allowedHosts: ["bobiverse.local"],
  },
});
