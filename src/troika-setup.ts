import { configureTextBuilder } from "troika-three-text";
import notoSansRegularUrl from "./assets/fonts/NotoSans-Regular.ttf?url";

// Must run before the first troika Text typesets. Without a default font, a
// <Text> that omits `font` sends every character to unicode-font-resolver.
configureTextBuilder({
  defaultFontURL: notoSansRegularUrl,
});
