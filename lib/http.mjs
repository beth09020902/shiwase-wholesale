import { restaurantForToken } from "./restaurants.mjs";

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export const NOT_LOGGED_IN = "ログインしてください";

// The login token comes in the Authorization header: "Bearer <token>".
export function authRestaurant(req) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? restaurantForToken(h.slice(7)) : null;
}
