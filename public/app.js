// 志和勢 発注 — restaurant ordering screen.
const $ = (id) => document.getElementById(id);
const STATUS = { received: "受付", preparing: "準備中", shipped: "出荷済", cancelled: "取消" };

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// The secret key arrives as #k=... in the link; remember it for the home-screen icon.
function readKey() {
  const m = location.hash.match(/k=([A-Za-z0-9_-]+)/);
  if (m) { store.set("ws-key", m[1]); return m[1]; }
  return store.get("ws-key");
}
const KEY = readKey();

const state = {
  restaurant: null,
  dates: [],
  date: null,
  qty: {},        // itemId -> number
  extras: [],     // {name, qty, unit}
  history: [],
};

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "x-restaurant-key": KEY || "", "content-type": "application/json", ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `エラーが発生しました (${res.status})`);
  return data;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const fmtQty = (n) => String(Math.round(n * 100) / 100);
const draftKey = () => `ws-draft-${state.restaurant.id}`;

function saveDraft() {
  store.set(draftKey(), JSON.stringify({ qty: state.qty, extras: state.extras }));
}
function loadDraft() {
  try {
    const d = JSON.parse(store.get(draftKey()) || "null");
    if (d) { state.qty = d.qty || {}; state.extras = d.extras || []; }
  } catch {}
}

function showError(msg) {
  $("loading").hidden = true;
  $("error").hidden = false;
  $("error").textContent = msg;
}

// ---------- rendering ----------
function renderDates() {
  const box = $("dates");
  box.innerHTML = "";
  for (const d of state.dates) {
    const b = document.createElement("button");
    b.className = "date";
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(d.date === state.date));
    const [md, wd] = d.label.split("（");
    b.innerHTML = `${esc(md)}<small>（${esc(wd)}</small>`;
    b.onclick = () => { state.date = d.date; renderDates(); updateBar(); };
    box.append(b);
  }
}

function itemRow(it) {
  const row = document.createElement("div");
  row.className = "item";
  const meta = [it.spec, it.par ? `適正在庫 ${it.par}` : ""].filter(Boolean).join("・");
  row.innerHTML = `
    <div><div class="name">${esc(it.name)}</div>${meta ? `<div class="meta">${esc(meta)}</div>` : ""}</div>
    <div class="stepper">
      <button type="button" aria-label="${esc(it.name)} を1減らす">−</button>
      <input inputmode="decimal" aria-label="${esc(it.name)} の数量" value="">
      <button type="button" aria-label="${esc(it.name)} を1増やす">＋</button>
      <span class="unit">${esc(it.unit || "")}</span>
    </div>`;
  const [minus, input, plus] = row.querySelectorAll("button, input");
  const sync = () => {
    const v = state.qty[it.id] || 0;
    input.value = v ? fmtQty(v) : "";
    row.classList.toggle("has-qty", v > 0);
  };
  const set = (v) => {
    v = Math.max(0, Math.min(999, Number(v) || 0));
    if (v) state.qty[it.id] = v; else delete state.qty[it.id];
    sync(); saveDraft(); updateBar();
  };
  minus.onclick = () => set((state.qty[it.id] || 0) - 1);
  plus.onclick = () => set((state.qty[it.id] || 0) + 1);
  input.onchange = () => set(input.value.replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
  input.onfocus = () => input.select();
  row._sync = sync;
  sync();
  return row;
}

function renderItems() {
  const box = $("sections");
  box.innerHTML = "";
  for (const s of state.restaurant.sections) {
    const h = document.createElement("h3");
    h.className = "section";
    h.textContent = s.title;
    const list = document.createElement("div");
    list.className = "list";
    for (const it of s.items) list.append(itemRow(it));
    box.append(h, list);
  }
}

function renderExtras() {
  const box = $("extras");
  box.innerHTML = "";
  state.extras.forEach((ex, i) => {
    const row = document.createElement("div");
    row.className = "extra";
    row.innerHTML = `
      <input placeholder="商品名" maxlength="40" value="${esc(ex.name)}" aria-label="商品名">
      <input placeholder="数量" inputmode="decimal" value="${ex.qty ? esc(fmtQty(ex.qty)) : ""}" aria-label="数量">
      <input placeholder="単位" maxlength="8" value="${esc(ex.unit)}" aria-label="単位">
      <button type="button" class="x" aria-label="この行を削除">×</button>`;
    const [name, qty, unit, del] = row.children;
    name.oninput = () => { ex.name = name.value; saveDraft(); updateBar(); };
    qty.oninput = () => { ex.qty = Number(qty.value) || 0; saveDraft(); updateBar(); };
    unit.oninput = () => { ex.unit = unit.value; saveDraft(); };
    del.onclick = () => { state.extras.splice(i, 1); renderExtras(); saveDraft(); updateBar(); };
    box.append(row);
  });
}

function chosenLines() {
  const lines = [];
  for (const s of state.restaurant.sections) {
    for (const it of s.items) {
      if (state.qty[it.id] > 0) lines.push({ ...it, qty: state.qty[it.id] });
    }
  }
  for (const ex of state.extras) {
    if (ex.name?.trim() && ex.qty > 0) lines.push({ name: ex.name.trim(), qty: ex.qty, unit: ex.unit, custom: true });
  }
  return lines;
}

function updateBar() {
  const n = chosenLines().length;
  const d = state.dates.find((x) => x.date === state.date);
  $("summary").textContent = `${n}品目${d ? `・${d.label}納品` : ""}`;
  $("toConfirm").disabled = !n || !state.date;
}

function renderHistory() {
  const box = $("historyList");
  if (!state.history.length) { box.innerHTML = `<p class="empty">まだ注文はありません</p>`; return; }
  box.innerHTML = "";
  for (const o of state.history) {
    const card = document.createElement("div");
    card.className = "card order-card";
    const d = new Date(o.deliveryDate + "T00:00:00Z");
    const wd = "日月火水木金土"[d.getUTCDay()];
    card.innerHTML = `
      <div class="head">
        <h2>${d.getUTCMonth() + 1}/${d.getUTCDate()}（${wd}）納品</h2>
        <span class="badge ${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span>
      </div>
      <div class="meta">${esc(o.id)}　${esc(new Date(o.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }))} 注文${o.orderedBy ? `・${esc(o.orderedBy)}` : ""}</div>
      <ul>${o.lines.map((l) => `<li>${esc(l.name)}${l.spec ? `（${esc(l.spec)}）` : ""}　<b>${esc(fmtQty(l.qty))}${esc(l.unit)}</b></li>`).join("")}</ul>
      ${o.note ? `<div class="meta">備考：${esc(o.note)}</div>` : ""}
      <div class="toolbar"><button class="ghost">この内容で再注文</button></div>`;
    card.querySelector("button").onclick = () => { copyOrder(o); switchTab("order"); };
    box.append(card);
  }
}

function copyOrder(o) {
  const known = new Set(state.restaurant.sections.flatMap((s) => s.items.map((i) => i.id)));
  state.qty = {};
  state.extras = [];
  for (const l of o.lines) {
    if (l.itemId && known.has(l.itemId)) state.qty[l.itemId] = l.qty;
    else state.extras.push({ name: l.name, qty: l.qty, unit: l.unit || "" });
  }
  renderItems(); renderExtras(); saveDraft(); updateBar();
  window.scrollTo({ top: 0 });
}

function switchTab(tab) {
  for (const b of document.querySelectorAll(".tab")) b.classList.toggle("active", b.dataset.tab === tab);
  $("orderView").hidden = tab !== "order";
  $("historyView").hidden = tab !== "history";
  $("bar").hidden = tab !== "order";
  if (tab === "history") loadHistory();
}

async function loadHistory() {
  try {
    state.history = (await api("/api/history")).orders;
    renderHistory();
    $("repeatLast").hidden = !state.history.length;
  } catch (e) {
    $("historyList").innerHTML = `<p class="empty">${esc(e.message)}</p>`;
  }
}

// ---------- confirm & send ----------
function openConfirm() {
  const lines = chosenLines();
  const d = state.dates.find((x) => x.date === state.date);
  const note = $("note").value.trim();
  $("confirmBody").innerHTML = `
    <p><b>${esc(state.restaurant.name)}</b>　納品日 <b>${esc(d?.label || "")}</b></p>
    <table>${lines.map((l) => `<tr><td>${esc(l.name)}${l.spec ? `<div class="meta">${esc(l.spec)}</div>` : ""}${l.custom ? `<div class="meta">自由記入</div>` : ""}</td><td class="q">${esc(fmtQty(l.qty))} ${esc(l.unit || "")}</td></tr>`).join("")}</table>
    ${note ? `<p class="meta">備考：${esc(note)}</p>` : ""}`;
  $("confirm").returnValue = "";
  $("confirm").showModal();
}

async function send() {
  const btn = $("sendBtn");
  btn.disabled = true;
  btn.textContent = "送信中…";
  try {
    store.set("ws-orderedBy", $("orderedBy").value.trim());
    const { order } = await api("/api/order", {
      method: "POST",
      body: JSON.stringify({
        deliveryDate: state.date,
        items: Object.entries(state.qty).map(([id, qty]) => ({ id, qty })),
        extras: state.extras,
        orderedBy: $("orderedBy").value.trim(),
        note: $("note").value.trim(),
      }),
    });
    $("confirm").close();
    state.qty = {}; state.extras = [];
    $("note").value = "";
    store.del(draftKey());
    renderItems(); renderExtras(); updateBar();
    const d = state.dates.find((x) => x.date === order.deliveryDate);
    $("doneId").textContent = order.id;
    $("doneText").textContent = `${d?.label || order.deliveryDate} 納品で受け付けました。変更がある場合は志和勢までご連絡ください。`;
    $("done").showModal();
    loadHistory();
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "注文を送信";
  }
}

// ---------- start ----------
async function start() {
  if (!KEY) return showError("このリンクは無効です。志和勢から届いたリンクを開いてください。");
  let data;
  try { data = await api("/api/catalog"); } catch (e) { return showError(e.message); }

  state.restaurant = data.restaurant;
  state.dates = data.dates;
  state.date = data.dates[0]?.date || null;
  document.title = `志和勢 発注｜${data.restaurant.name}`;
  $("shopName").textContent = data.restaurant.name;
  $("cutoffHint").textContent = `${data.cutoffHour}時までのご注文は翌日納品できます。`;
  $("orderedBy").value = store.get("ws-orderedBy") || "";

  loadDraft();
  renderDates(); renderItems(); renderExtras(); updateBar();

  $("loading").hidden = true;
  $("tabs").hidden = false;
  $("orderView").hidden = false;
  $("bar").hidden = false;

  for (const b of document.querySelectorAll(".tab")) b.onclick = () => switchTab(b.dataset.tab);
  $("toConfirm").onclick = openConfirm;
  $("confirm").addEventListener("close", () => { if ($("confirm").returnValue === "ok") send(); });
  $("doneOk").onclick = () => $("done").close();
  $("addExtra").onclick = () => { state.extras.push({ name: "", qty: 0, unit: "" }); renderExtras(); };
  $("clearAll").onclick = () => {
    if (!confirm("入力した数量をすべてクリアしますか？")) return;
    state.qty = {}; state.extras = []; renderItems(); renderExtras(); saveDraft(); updateBar();
  };
  $("repeatLast").onclick = () => state.history[0] && copyOrder(state.history[0]);

  loadHistory();
}

start();
