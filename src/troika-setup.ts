import { configureTextBuilder } from "troika-three-text";
import notoSansRegularUrl from "./assets/fonts/NotoSans-Regular.ttf?url";

// Must run before the first troika Text typesets. Without a default font, a
// <Text> that omits `font` sends every character to unicode-font-resolver.
// useWorker: false is belt-and-suspenders with the Vite plugin that forces
// troika-worker-utils onto its main-thread fallback under script-src 'self'.
configureTextBuilder({
  defaultFontURL: notoSansRegularUrl,
  useWorker: false,
});
