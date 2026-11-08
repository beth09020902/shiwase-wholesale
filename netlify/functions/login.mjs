import { json } from "../../lib/http.mjs";
import { login } from "../../lib/restaurants.mjs";

// POST /api/login { password } → { token, exp, name }
export async function handle(req, { delay = 600 } = {}) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const r = login(body?.password);
  if (!r) {
    await new Promise((ok) => setTimeout(ok, delay)); // slows down guessing
    return json({ error: "パスワードが違います" }, 401);
  }
  return json({ token: r.token, exp: r.exp, name: r.restaurant.name });
}

export default (req) => handle(req);

export const config = { path: "/api/login" };
