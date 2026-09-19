#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { PasspointPop as EsmPop, createCheckoutSession } from "../dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const cjs = require(join(root, "dist/index.cjs"));

if (typeof EsmPop !== "function") throw new Error("ESM export is not a constructor");
if (typeof EsmPop.setup !== "function") throw new Error("ESM PasspointPop.setup missing");
if (typeof cjs.PasspointPop !== "function") throw new Error("CJS named export missing");
if (typeof cjs.default !== "function" && typeof cjs !== "function") {
  throw new Error("CJS default export missing");
}
if (typeof createCheckoutSession !== "function") {
  throw new Error("ESM createCheckoutSession missing");
}
if (typeof cjs.createCheckoutSession !== "function") {
  throw new Error("CJS createCheckoutSession missing");
}

const iife = readFileSync(join(root, "dist/passpoint.min.js"), "utf8");
const ctx = /** @type {Record<string, unknown>} */ ({});
ctx.globalThis = ctx;
vm.runInNewContext(iife, ctx);
if (typeof ctx.PasspointPop !== "function") {
  throw new Error("IIFE did not attach PasspointPop on globalThis");
}

console.log("sdk smoke: esm + cjs + iife exports ok");
