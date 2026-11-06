import { json, authRestaurant } from "../../lib/http.mjs";
import { ordersStore } from "../../lib/store.mjs";

// GET /api/history — this restaurant's latest orders (newest first) with their status.
export async function handle(req, store, limit = 20) {
  const restaurant = authRestaurant(req);
  if (!restaurant) return json({ error: "このリンクは無効です。志和勢にお問い合わせください。" }, 401);

  const { blobs } = await store.list({ prefix: `${restaurant.id}/` });
  // Keys are "<restaurantId>/WSyymmdd-XXXX", so sorting keys sorts by order date.
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, limit);
  const orders = (await Promise.all(keys.map((k) => store.get(k, { type: "json" })))).filter(Boolean);
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json({ orders });
}

export default (req) => handle(req, ordersStore());

export const config = { path: "/api/history" };
