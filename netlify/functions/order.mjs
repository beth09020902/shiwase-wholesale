import { json, authRestaurant, NOT_LOGGED_IN } from "../../lib/http.mjs";
import { buildOrder, blobKey, orderEmail, OrderError } from "../../lib/orders.mjs";
import { ordersStore } from "../../lib/store.mjs";
import { DEFAULT_NOTIFY_TO } from "../../lib/config.mjs";

async function sendEmail(order, restaurant) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.warn("Email not sent: RESEND_API_KEY or MAIL_FROM missing");
    return false;
  }
  const to = [process.env.ORDER_NOTIFY_TO || DEFAULT_NOTIFY_TO];
  if (restaurant.email) to.push(restaurant.email);
  const { subject, text } = orderEmail(order);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) console.error("Resend error", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Resend failed", e);
    return false;
  }
}

export async function handle(req, store, { send = sendEmail, now = new Date() } = {}) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const restaurant = authRestaurant(req);
  if (!restaurant) return json({ error: NOT_LOGGED_IN }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: "内容が読み取れません" }, 400); }

  let order;
  try {
    order = buildOrder(restaurant, body, now);
  } catch (e) {
    if (e instanceof OrderError) return json({ error: e.message }, 400);
    throw e;
  }

  // Saving is what matters; the email is a notification on top.
  await store.setJSON(blobKey(order), order);
  const emailed = await send(order, restaurant);
  return json({ ok: true, order, emailed });
}

export default (req) => handle(req, ordersStore());

export const config = { path: "/api/order" };
