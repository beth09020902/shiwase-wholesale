// Business rules for wholesale (卸) orders. Edit here, commit, push — Netlify redeploys.

// Orders placed before this hour (Japan time) can be delivered the next day.
export const CUTOFF_HOUR = 12;

// How many delivery dates to offer in the picker.
export const DATE_OPTIONS_DAYS = 14;

// Weekdays with no delivery. 0 = 日, 1 = 月 … 6 = 土. Empty = deliver every day.
// TODO: confirm with Ueda (e.g. [0] if no Sunday delivery).
export const NO_DELIVERY_WEEKDAYS = [];

// Individual dates with no delivery (YYYY-MM-DD).
// Pre-filled with the shop's year-end break (no dispatch 12/29–1/2). Confirm it applies to restaurant deliveries too.
export const NO_DELIVERY_DATES = [
  "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02",
];

// Netlify Blobs store the orders are written to (on the shop site — see docs/data-contract.md).
export const STORE_NAME = "wholesale-orders";

// Where the new-order email goes.
export const DEFAULT_NOTIFY_TO = "order@shiwase.co.jp";
