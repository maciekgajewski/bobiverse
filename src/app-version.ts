import { appVersionLabel, type AppVersion } from "./version-resolution";

// Injected by vite.config.ts (`define`); absent under Vitest, which does not
// load that config, so each read is guarded.
declare const __APP_VERSION__: string | undefined;
declare const __APP_COMMIT__: string | undefined;

export const APP_VERSION: AppVersion = {
  version:
    typeof __APP_VERSION__ === "string" && __APP_VERSION__
      ? __APP_VERSION__
      : "0.0.0-dev",
  commit:
    typeof __APP_COMMIT__ === "string" && __APP_COMMIT__
      ? __APP_COMMIT__
      : null,
};

export const APP_VERSION_LABEL = appVersionLabel(APP_VERSION);
