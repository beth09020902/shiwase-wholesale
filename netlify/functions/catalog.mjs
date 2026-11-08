import { json, authRestaurant, NOT_LOGGED_IN } from "../../lib/http.mjs";
import { publicView } from "../../lib/restaurants.mjs";
import { deliveryOptions } from "../../lib/calendar.mjs";
import { CUTOFF_HOUR } from "../../lib/config.mjs";

// GET /api/catalog — the restaurant's item list and the delivery dates it can pick.
export default async (req) => {
  const restaurant = authRestaurant(req);
  if (!restaurant) return json({ error: NOT_LOGGED_IN }, 401);
  return json({
    restaurant: publicView(restaurant),
    dates: deliveryOptions(new Date(), restaurant.extraLeadDays),
    cutoffHour: CUTOFF_HOUR,
  });
};

export const config = { path: "/api/catalog" };
