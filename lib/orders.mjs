import { itemIndex } from "./restaurants.mjs";
import { isAllowedDate, jstToday, labelFor } from "./calendar.mjs";

export const STATUS_LABELS = {
  received: "受付",
  preparing: "準備中",
  shipped: "出荷済",
  cancelled: "取消",
};

const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeOrderId(now = new Date()) {
  const d = jstToday(now).replaceAll("-", "").slice(2); // YYMMDD
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const b of bytes) s += ID_CHARS[b % ID_CHARS.length];
  return `WS${d}-${s}`;
}

export function blobKey(order) {
  return `${order.restaurantId}/${order.id}`;
}

function cleanText(v, max) {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function cleanQty(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 999) throw new OrderError("数量が大きすぎます（999まで）");
  return Math.round(n * 100) / 100;
}

export class OrderError extends Error {}

// Validates the browser's request and returns the order record to store.
export function buildOrder(restaurant, body, now = new Date()) {
  if (!body || typeof body !== "object") throw new OrderError("内容が読み取れません");

  if (!isAllowedDate(body.deliveryDate, now, restaurant.extraLeadDays)) {
    throw new OrderError("納品日が選択できない日付です。画面を更新して選び直してください。");
  }

  const idx = itemIndex(restaurant);
  const lines = [];
  const seen = new Set();
  for (const row of Array.isArray(body.items) ? body.items : []) {
    const it = idx.get(row?.id);
    if (!it || seen.has(it.id)) continue;
    const qty = cleanQty(row.qty);
    if (!qty) continue;
    seen.add(it.id);
    lines.push({
      itemId: it.id, name: it.name, spec: it.spec || "", unit: it.unit || "",
      section: it.section, qty, custom: false,
    });
  }
  for (const row of (Array.isArray(body.extras) ? body.extras : []).slice(0, 10)) {
    const name = cleanText(row?.name, 40);
    const qty = cleanQty(row?.qty);
    if (!name || !qty) continue;
    lines.push({
      itemId: null, name, spec: "", unit: cleanText(row?.unit, 8),
      section: "自由記入", qty, custom: true,
    });
  }
  if (!lines.length) throw new OrderError("注文する商品の数量を入力してください");

  const createdAt = now.toISOString();
  return {
    schemaVersion: 1,
    id: makeOrderId(now),
    channel: "wholesale",
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    createdAt,
    orderDate: jstToday(now),
    deliveryDate: body.deliveryDate,
    orderedBy: cleanText(body.orderedBy, 30),
    note: cleanText(body.note, 500),
    lines,
    status: "received",
    statusHistory: [{ status: "received", at: createdAt, by: "restaurant" }],
  };
}

export function orderEmail(order) {
  const rows = order.lines.map((l) =>
    `・${l.name}${l.spec ? `（${l.spec}）` : ""}　${l.qty}${l.unit}${l.custom ? "　※自由記入" : ""}`,
  );
  const text = [
    `【卸注文】${order.restaurantName}　納品日 ${labelFor(order.deliveryDate)}`,
    "",
    `注文番号：${order.id}`,
    `店舗：${order.restaurantName}`,
    `納品希望日：${labelFor(order.deliveryDate)}`,
    `発注者：${order.orderedBy || "（未入力）"}`,
    "",
    ...rows,
    "",
    order.note ? `備考：${order.note}` : "備考：なし",
    "",
    "注文管理：https://admin.shiwase.co.jp/",
  ].join("\n");
  return {
    subject: `【卸注文】${order.restaurantName} ${labelFor(order.deliveryDate)}納品 (${order.id})`,
    text,
  };
}
