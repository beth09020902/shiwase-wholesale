import { restaurantForKey } from "./restaurants.mjs";

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// The restaurant's secret key comes in the x-restaurant-key header.
export function authRestaurant(req) {
  return restaurantForKey(req.headers.get("x-restaurant-key"));
}
