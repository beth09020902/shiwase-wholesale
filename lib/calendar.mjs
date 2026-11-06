import {
  CUTOFF_HOUR, DATE_OPTIONS_DAYS, NO_DELIVERY_WEEKDAYS, NO_DELIVERY_DATES,
} from "./config.mjs";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// A Date shifted so its UTC getters read Japan local time.
export function toJst(date = new Date()) {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

export function ymd(jstDate) {
  return jstDate.toISOString().slice(0, 10);
}

export function jstToday(now = new Date()) {
  return ymd(toJst(now));
}

export function labelFor(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEKDAYS[d.getUTCDay()]}）`;
}

export function isDeliveryDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return !NO_DELIVERY_WEEKDAYS.includes(d.getUTCDay()) && !NO_DELIVERY_DATES.includes(dateStr);
}

// Earliest date: tomorrow if ordered before the cutoff, otherwise the day after.
// extraLeadDays adds days for a restaurant that needs more time (e.g. far away).
export function earliestDate(now = new Date(), extraLeadDays = 0) {
  const jst = toJst(now);
  const lead = (jst.getUTCHours() < CUTOFF_HOUR ? 1 : 2) + (extraLeadDays || 0);
  const d = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + lead));
  return ymd(d);
}

export function deliveryOptions(now = new Date(), extraLeadDays = 0) {
  const out = [];
  const start = new Date(earliestDate(now, extraLeadDays) + "T00:00:00Z");
  for (let i = 0; out.length < DATE_OPTIONS_DAYS && i < 60; i++) {
    const d = ymd(new Date(start.getTime() + i * 86400000));
    if (isDeliveryDay(d)) out.push({ date: d, label: labelFor(d) });
  }
  return out;
}

export function isAllowedDate(dateStr, now = new Date(), extraLeadDays = 0) {
  return deliveryOptions(now, extraLeadDays).some((o) => o.date === dateStr);
}
