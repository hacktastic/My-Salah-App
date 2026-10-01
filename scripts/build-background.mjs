// The background runtimes cannot load modules, so each entry becomes one IIFE file.
// Vite copies public/ into dist/, and `npx cap sync` copies dist/ into the native apps.
import { build } from "esbuild";

const shared = {
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: true,
  logLevel: "info",
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ["src/background/runner.ts"],
    outfile: "public/runners/background.js",
  }),
  build({
    ...shared,
    entryPoints: ["src/background/androidPlanEntry.ts"],
    outfile: "public/runners/android-plan.js",
  }),
]);
