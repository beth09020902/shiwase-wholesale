import { test } from "node:test";
import assert from "node:assert/strict";
import { earliestDate, deliveryOptions, isAllowedDate } from "../lib/calendar.mjs";
import { buildOrder, blobKey, OrderError, orderEmail } from "../lib/orders.mjs";
import { restaurants, restaurantForKey, publicView } from "../lib/restaurants.mjs";
import { handle as orderHandle } from "../netlify/functions/order.mjs";
import { handle as historyHandle } from "../netlify/functions/history.mjs";

const jst = (s) => new Date(s + "+09:00");
const TOKENS = "kitasuzu:aaaaaaaaaaaaaaaaaaaa;hokusai-shinsaibashi:bbbbbbbbbbbbbbbbbbbb";
process.env.RESTAURANT_TOKENS = TOKENS;

function memStore() {
  const m = new Map();
  return {
    m,
    async setJSON(k, v) { m.set(k, JSON.parse(JSON.stringify(v))); },
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}
const req = (path, key, body) => new Request("https://x" + path, {
  method: body ? "POST" : "GET",
  headers: { "x-restaurant-key": key, "content-type": "application/json" },
  body: body ? JSON.stringify(body) : undefined,
});

test("cutoff at 12:00 JST", () => {
  assert.equal(earliestDate(jst("2026-11-06T11:59:59")), "2026-11-07");
  assert.equal(earliestDate(jst("2026-11-06T12:00:00")), "2026-11-08");
  assert.equal(earliestDate(jst("2026-11-06T23:30:00")), "2026-11-08");
  // 01:00 JST is still the previous day in UTC — must use JST date
  assert.equal(earliestDate(jst("2026-11-07T01:00:00")), "2026-11-08");
});

test("year-end dates are skipped", () => {
  const opts = deliveryOptions(jst("2026-12-27T09:00:00")).map((o) => o.date);
  assert.equal(opts[0], "2026-12-28");
  assert.equal(opts[1], "2027-01-03");
  assert.equal(opts.length, 14);
  assert.match(deliveryOptions(jst("2026-11-06T09:00:00"))[0].label, /^11\/7（土）$/);
});

test("tokens map to restaurants; short/unknown tokens rejected", () => {
  assert.equal(restaurantForKey("aaaaaaaaaaaaaaaaaaaa").id, "kitasuzu");
  assert.equal(restaurantForKey("nope"), null);
  assert.equal(restaurantForKey("short", "kitasuzu:short"), null);
  assert.equal(restaurantForKey(""), null);
});

test("public view hides email", () => {
  const v = publicView(restaurants[0]);
  assert.equal(v.email, undefined);
  assert.ok(v.sections[0].items[0].name);
});

test("buildOrder validates and cleans", () => {
  const r = restaurants.find((x) => x.id === "hokusai-shinsaibashi");
  const now = jst("2026-11-06T10:00:00");
  const o = buildOrder(r, {
    deliveryDate: "2026-11-07",
    items: [{ id: "wagyu-yaki-suki-block", qty: 2 }, { id: "wagyu-rare-steak", qty: "1" },
      { id: "unknown", qty: 5 }, { id: "sushi", qty: 0 }, { id: "wagyu-rare-steak", qty: 9 }],
    extras: [{ name: "牛タン", qty: 1, unit: "本" }, { name: "", qty: 3 }],
    orderedBy: "山田", note: "午前中\u0007希望",
  }, now);
  assert.match(o.id, /^WS261106-[A-Z2-9]{4}$/);
  assert.equal(blobKey(o), `hokusai-shinsaibashi/${o.id}`);
  assert.equal(o.lines.length, 3);
  assert.deepEqual(o.lines.map((l) => l.qty), [2, 1, 1]);
  assert.equal(o.lines[2].custom, true);
  assert.equal(o.note, "午前中 希望");
  assert.equal(o.status, "received");
  assert.match(orderEmail(o).subject, /肉重北斎（心斎橋） 11\/7（土）納品/);

  assert.throws(() => buildOrder(r, { deliveryDate: "2026-11-06", items: [{ id: "sushi", qty: 1 }] }, now), OrderError);
  assert.throws(() => buildOrder(r, { deliveryDate: "2026-11-07", items: [] }, now), OrderError);
  assert.throws(() => buildOrder(r, { deliveryDate: "2026-11-07", items: [{ id: "sushi", qty: 5000 }] }, now), OrderError);
});

test("order + history endpoints, restaurants can't see each other's orders", async () => {
  const store = memStore();
  const now = jst("2026-11-06T10:00:00");
  let sent = 0;
  const send = async () => { sent++; return true; };

  const bad = await orderHandle(req("/api/order", "wrongwrongwrongwrong", { deliveryDate: "2026-11-07" }), store, { send, now });
  assert.equal(bad.status, 401);

  const res = await orderHandle(req("/api/order", "aaaaaaaaaaaaaaaaaaaa",
    { deliveryDate: "2026-11-07", items: [{ id: "karubi", qty: 3 }] }), store, { send, now });
  assert.equal(res.status, 200);
  const { order } = await res.json();
  assert.equal(order.restaurantId, "kitasuzu");
  assert.equal(sent, 1);
  assert.ok(store.m.has(`kitasuzu/${order.id}`));

  const res2 = await orderHandle(req("/api/order", "bbbbbbbbbbbbbbbbbbbb",
    { deliveryDate: "2026-11-07", items: [{ id: "sushi", qty: 1 }] }), store, { send, now });
  assert.equal(res2.status, 200);

  const h1 = await (await historyHandle(req("/api/history", "aaaaaaaaaaaaaaaaaaaa"), store)).json();
  assert.equal(h1.orders.length, 1);
  assert.equal(h1.orders[0].id, order.id);
  const h2 = await (await historyHandle(req("/api/history", "bbbbbbbbbbbbbbbbbbbb"), store)).json();
  assert.equal(h2.orders.length, 1);
  assert.equal(h2.orders[0].restaurantId, "hokusai-shinsaibashi");
});
