#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const banner = `/*! passpoint.js v${pkg.version} | MIT ${pkg.homepage.replace(/#readme$/, "")} */\n`;

mkdirSync(dist, { recursive: true });

const shared = {
  bundle: true,
  platform: "browser",
  target: ["es2020"],
  banner: { js: banner },
  legalComments: "none",
};

await Promise.all([
  esbuild.build({
    ...shared,
    entryPoints: [join(src, "index.ts")],
    format: "esm",
    outfile: join(dist, "index.js"),
  }),
  esbuild.build({
    ...shared,
    entryPoints: [join(src, "index.ts")],
    format: "cjs",
    outfile: join(dist, "index.cjs"),
  }),
  esbuild.build({
    ...shared,
    entryPoints: [join(src, "browser.ts")],
    format: "iife",
    outfile: join(dist, "passpoint.js"),
  }),
  esbuild.build({
    ...shared,
    entryPoints: [join(src, "browser.ts")],
    format: "iife",
    minify: true,
    outfile: join(dist, "passpoint.min.js"),
  }),
]);

const tsc = join(root, "node_modules/typescript/bin/tsc");
const dts = spawnSync(process.execPath, [tsc, "-p", join(root, "tsconfig.json")], { stdio: "inherit" });
if (dts.status !== 0) process.exit(dts.status ?? 1);

const required = ["index.js", "index.cjs", "index.d.ts", "passpoint.js", "passpoint.min.js"];
for (const file of required) {
  const bytes = readFileSync(join(dist, file));
  if (bytes.length < 64) throw new Error(`SDK build produced an empty file: ${file}`);
}

const iife = readFileSync(join(dist, "passpoint.min.js"), "utf8");
if (!iife.includes("PasspointPop")) {
  throw new Error("Minified IIFE is missing the PasspointPop global");
}

console.log(`passpoint.js v${pkg.version} → dist/`);
