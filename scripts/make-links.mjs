// Makes a new secret link for every restaurant in data/restaurants.json.
// Run:  npm run make-links
// Output: the RESTAURANT_TOKENS value to paste into Netlify, and each restaurant's link.
// Running it again makes NEW links (old links stop working once you update Netlify).
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const SITE = process.env.WHOLESALE_URL || "https://wholesale.shiwase.co.jp";
const { restaurants } = JSON.parse(readFileSync(new URL("../data/restaurants.json", import.meta.url)));

const pairs = restaurants.map((r) => ({ r, token: randomBytes(18).toString("base64url") }));
const envValue = pairs.map(({ r, token }) => `${r.id}:${token}`).join(";");
const links = pairs.map(({ r, token }) => `${r.name}\n${SITE}/#k=${token}\n`).join("\n");

const out = `RESTAURANT_TOKENS (paste into Netlify → Environment variables, tick "secret"):\n\n${envValue}\n\n--- Links to give each restaurant ---\n\n${links}`;
writeFileSync(new URL("../restaurant-links.txt", import.meta.url), out);
console.log(out);
console.log("Saved to restaurant-links.txt (not committed to git).");
