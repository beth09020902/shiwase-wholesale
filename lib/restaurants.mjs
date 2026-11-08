import crypto from "node:crypto";
import data from "../data/restaurants.json" with { type: "json" };

export const restaurants = data.restaurants;

// How long a login lasts on one device.
export const LOGIN_DAYS = 30;
const DAY_MS = 86400000;
const MIN_PASSWORD = 8;

// RESTAURANT_PASSWORDS env var: "kitasuzu:PASSWORD1;hokusai-shinsaibashi:PASSWORD2;..."
// Each restaurant has its own password; the password decides which restaurant is logging in.
export function parsePasswords(raw = process.env.RESTAURANT_PASSWORDS || "") {
  const map = new Map(); // restaurantId -> password
  const seen = new Set();
  for (const pair of raw.split(/[;\n]/)) {
    const i = pair.indexOf(":");
    if (i < 0) continue;
    const id = pair.slice(0, i).trim();
    const pw = pair.slice(i + 1).trim();
    if (!id || pw.length < MIN_PASSWORD || seen.has(pw)) continue; // too short or shared by two restaurants → ignored
    if (!restaurants.some((r) => r.id === id)) continue;
    seen.add(pw);
    map.set(id, pw);
  }
  return map;
}

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

// Signed with that restaurant's own password, so changing its password logs out every device.
function sign(id, exp, pw) {
  return crypto.createHmac("sha256", pw).update(`wholesale|${id}|${exp}`).digest("base64url");
}

// Password → { restaurant, token, exp } or null.
export function login(password, { raw, now = Date.now() } = {}) {
  const typed = String(password ?? "").trim();
  if (!typed) return null;
  let found = null;
  for (const [id, pw] of parsePasswords(raw)) {
    if (same(typed, pw)) found = { id, pw }; // check them all, same time either way
  }
  if (!found) return null;
  const exp = now + LOGIN_DAYS * DAY_MS;
  return {
    restaurant: restaurants.find((r) => r.id === found.id),
    token: `${found.id}.${exp}.${sign(found.id, exp, found.pw)}`,
    exp,
  };
}

// Token from the browser → restaurant, or null if wrong / expired / password changed.
export function restaurantForToken(token, { raw, now = Date.now() } = {}) {
  const m = /^([a-z0-9-]+)\.(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(String(token ?? "").trim());
  if (!m) return null;
  const [, id, expStr, sig] = m;
  const exp = Number(expStr);
  if (exp < now || exp > now + (LOGIN_DAYS + 1) * DAY_MS) return null;
  const pw = parsePasswords(raw).get(id);
  if (!pw || !same(sig, sign(id, exp, pw))) return null;
  return restaurants.find((r) => r.id === id) || null;
}

export function itemIndex(restaurant) {
  const idx = new Map();
  for (const s of restaurant.sections) {
    for (const it of s.items) idx.set(it.id, { ...it, section: s.title });
  }
  return idx;
}

// What the browser gets: no emails, no internal fields.
export function publicView(restaurant) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    sections: restaurant.sections.map((s) => ({
      title: s.title,
      items: s.items.map(({ id, name, spec, unit, par }) => ({ id, name, spec, unit, par })),
    })),
  };
}
