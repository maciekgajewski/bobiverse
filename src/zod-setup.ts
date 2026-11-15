import { config as configureZod } from "zod";

// Zod probes JIT with `new Function("")`. Even when that throw is caught,
// browsers still report a script-src 'unsafe-eval' CSP violation. Disable
// the probe (and JIT) in the production bundle before any schema is parsed.
if (import.meta.env.PROD) {
  configureZod({ jitless: true });
}
