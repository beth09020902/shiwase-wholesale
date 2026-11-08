// Makes restaurant passwords for the wholesale app.
//
//   npm run make-passwords                  → a new password for EVERY restaurant
//   npm run make-passwords -- kitasuzu      → a new password for just that restaurant
//
// Prints the RESTAURANT_PASSWORDS value to paste into Netlify, and each restaurant's password.
// Also saved to restaurant-passwords.txt (never committed to git).
// After changing RESTAURANT_PASSWORDS in Netlify: Deploys → Trigger deploy. Devices logged in with
// a restaurant's old password are logged out straight away.
import { readFileSync, writeFileSync } from "node:fs";
import { randomInt } from "node:crypto";

const SITE = "https://wholesale.shiwase.co.jp";
const CHARS = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i — easy to read out and type
const LEN = 10;
const { restaurants } = JSON.parse(readFileSync(new URL("../data/restaurants.json", import.meta.url)));

const only = process.argv.slice(2);
const unknown = only.filter((id) => !restaurants.some((r) => r.id === id));
if (unknown.length) {
  console.error(`Unknown restaurant id: ${unknown.join(", ")}\nIds: ${restaurants.map((r) => r.id).join(", ")}`);
  process.exit(1);
}

const make = () => Array.from({ length: LEN }, () => CHARS[randomInt(CHARS.length)]).join("");
const chosen = only.length ? restaurants.filter((r) => only.includes(r.id)) : restaurants;
const used = new Set();
const pairs = chosen.map((r) => {
  let pw;
  do pw = make(); while (used.has(pw));
  used.add(pw);
  return { r, pw };
});

const lines = [];
if (only.length) {
  lines.push("In Netlify, edit RESTAURANT_PASSWORDS and replace ONLY these parts (keep the others):", "");
  for (const { r, pw } of pairs) lines.push(`${r.id}:${pw}`);
} else {
  lines.push('RESTAURANT_PASSWORDS (paste into Netlify → Environment variables, tick "Contains secret values"):', "");
  lines.push(pairs.map(({ r, pw }) => `${r.id}:${pw}`).join(";"));
}
lines.push("", "--- Give each restaurant ---", "", `アプリ：${SITE}`, "");
for (const { r, pw } of pairs) lines.push(`${r.name}`, `パスワード：${pw}`, "");
lines.push("Then: Netlify → Deploys → Trigger deploy.");

const out = lines.join("\n");
writeFileSync(new URL("../restaurant-passwords.txt", import.meta.url), out + "\n");
console.log(out);
console.log("\nSaved to restaurant-passwords.txt (not committed to git).");
