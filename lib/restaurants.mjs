import data from "../data/restaurants.json" with { type: "json" };

export const restaurants = data.restaurants;

// RESTAURANT_TOKENS env var: "kitasuzu:TOKEN1;hokusai-shinsaibashi:TOKEN2;..."
export function parseTokens(raw = process.env.RESTAURANT_TOKENS || "") {
  const map = new Map();
  for (const pair of raw.split(/[;\n,]/)) {
    const [id, token] = pair.split(":").map((s) => (s || "").trim());
    if (id && token && token.length >= 16) map.set(token, id);
  }
  return map;
}

export function restaurantForKey(key, raw) {
  if (!key) return null;
  const id = parseTokens(raw).get(String(key).trim());
  return id ? restaurants.find((r) => r.id === id) || null : null;
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
