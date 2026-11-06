# Wholesale orders — data contract

How the wholesale app (wholesale.shiwase.co.jp) hands orders to 注文管理 (admin.shiwase.co.jp). Both apps must follow this. If you change it, change both.

## Where orders are stored

- **Netlify Blobs**, store name **`wholesale-orders`**, on the **shop site** (the same site the shop and お歳暮 orders live on).
- The wholesale site reaches it with `BLOB_SITE_ID` (the shop site's Site ID) and `NETLIFY_AUTH_TOKEN`, the same way the admin site already does.
- **Key:** `<restaurantId>/<orderId>` — for example `kitasuzu/WS261106-K7QM`.
  - `orderId` = `WS` + order date in Japan time as `YYMMDD` + `-` + 4 random characters.
  - To list everything: `store.list()` (no prefix). To list one restaurant: `store.list({ prefix: "kitasuzu/" })`.
- Value is JSON (`store.setJSON` / `store.get(key, { type: "json" })`).

## Order record (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "id": "WS261106-K7QM",
  "channel": "wholesale",
  "restaurantId": "hokusai-shinsaibashi",
  "restaurantName": "肉重北斎（心斎橋）",
  "createdAt": "2026-11-06T01:23:45.000Z",
  "orderDate": "2026-11-06",
  "deliveryDate": "2026-11-07",
  "orderedBy": "山田",
  "note": "午前中希望",
  "lines": [
    { "itemId": "wagyu-yaki-suki-block", "name": "焼き肉・すき焼きブロック", "spec": "約15kg",
      "unit": "箱", "section": "和牛", "qty": 2, "custom": false },
    { "itemId": null, "name": "牛タン", "spec": "", "unit": "本",
      "section": "自由記入", "qty": 1, "custom": true }
  ],
  "status": "received",
  "statusHistory": [ { "status": "received", "at": "2026-11-06T01:23:45.000Z", "by": "restaurant" } ]
}
```

- Dates (`orderDate`, `deliveryDate`) are `YYYY-MM-DD` in **Japan time**. `createdAt` is UTC ISO.
- `qty` is a number (can be a decimal, e.g. 1.5). It is a count of `unit`, not a weight.
- `custom: true` lines were typed in by the restaurant (not on their list) — show them highlighted.

## Status — the admin app owns this

| value | 表示 | set by |
|---|---|---|
| `received` | 受付 | wholesale app, on creation |
| `preparing` | 準備中 | admin |
| `shipped` | 出荷済 | admin |
| `cancelled` | 取消 | admin |

When admin changes status it must: read the record, set `status`, **append** to `statusHistory` (`{ status, at: new Date().toISOString(), by: "admin" }`), and write the whole record back with `setJSON` to the same key. The restaurant sees the new status in its 注文履歴 tab.

## Fields reserved for admin (later — invoicing)

The admin app may add these without breaking the wholesale app (it ignores fields it doesn't know):

- on a line: `actualKg` (number — weight actually shipped), `unitPrice` (¥ per kg or per unit, tax incl.), `priceRef` (product name in `products_prices.csv`)
- on the order: `invoiceNo`, `shippedAt`, `adminNote`

Do **not** rename or remove existing fields — restaurants' history screens read them.
