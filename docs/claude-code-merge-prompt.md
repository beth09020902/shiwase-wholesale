# Prompt: merge the two admin apps into admin.shiwase.co.jp

**Before you paste this:** copy the folder you zip-upload for admin.shiwase.co.jp into the shop repo as `C:\dev\shiwase-shop\admin\` (PowerShell steps are in the README, step 6). Also copy `docs\data-contract.md` from the Wholesale Order App folder into `C:\dev\shiwase-shop\docs\wholesale-data-contract.md`. Then open Claude Code in `C:\dev\shiwase-shop` and paste everything below the line.

---

I want to combine my two admin apps into one 注文管理 app at **admin.shiwase.co.jp**, and add wholesale (卸) orders to it. Start in plan mode: read the code first, show me the plan, and wait for my OK before changing anything.

**What exists now**

- `shop/` — the customer shop (shop.shiwase.co.jp). It includes an orders admin at `shop/orders/admin/` (お歳暮 and shop orders) with its Netlify functions. Order data is in this site's Netlify Blobs.
- `staff/` — the staff order app (order.shiwase.co.jp).
- `admin/` — I have just copied in the product-management app that runs at admin.shiwase.co.jp. Until now it was deployed by uploading a zip. It reads/writes the shop site's blobs using `BLOB_SITE_ID` + `NETLIFY_AUTH_TOKEN` and is protected by `ADMIN_PASSCODE`.
- A new, separate wholesale app (its own repo/site, wholesale.shiwase.co.jp) now writes restaurant orders into the shop site's blob store `wholesale-orders`. The format is in `docs/wholesale-data-contract.md` — follow it exactly.

**What I want**

1. **One admin app in `admin/`**, deployed from this repo (Netlify base directory `admin`), with one login (`ADMIN_PASSCODE`) and tabs:
   - **小売注文** — shop orders and staff-app orders (everything currently in `shop/orders/admin/`)
   - **お歳暮** — the お歳暮 orders section as it works now (picking list, Excel, statuses — keep every feature)
   - **卸注文** — new, see below
   - **商品管理** — the existing product management (sold-out toggles, image upload)
2. Move the order-admin UI and its functions from `shop/orders/admin/` into `admin/`. They must keep reading the same blobs on the shop site (via `BLOB_SITE_ID` + `NETLIFY_AUTH_TOKEN`) — **do not move or copy any data**.
3. After the move, `shop.shiwase.co.jp/orders/admin/*` should 301-redirect to `https://admin.shiwase.co.jp/`. Remove the old admin functions from `shop/` only once the admin site has them, and don't touch the customer-facing shop flow, Stripe, or the staff app.
4. **卸注文 tab**
   - List orders from the `wholesale-orders` store, grouped by **納品日** (default: today and the next 3 days; a date picker for others), filter by restaurant.
   - Each order: restaurant, order number, ordered time (JST), 発注者, lines (highlight `custom: true` lines as 自由記入), 備考, status.
   - Status buttons 受付 → 準備中 → 出荷済, and 取消 (with a confirm). Update per the contract: set `status`, append to `statusHistory` with `by: "admin"`, write back to the same key.
   - **仕込み表 (picking total) for a 納品日**: one printable table adding up quantities by item across all restaurants (same `itemId` + `unit` added together; 自由記入 lines listed separately), plus a per-restaurant print view (one page per restaurant, like their paper 発注書).
   - A badge on the tab showing how many orders are still 受付.
5. Keep the existing env var convention: secrets (`ADMIN_PASSCODE`, `NETLIFY_AUTH_TOKEN`, `RESEND_API_KEY`) ticked "secret", Production only, scoped to Functions. Tell me exactly which env vars the admin site needs after the merge.
6. Commit to `main` when I approve (I deploy straight to production). Do the redirect in step 3 in a **separate, later commit**, so the old admin at shop.shiwase.co.jp/orders/admin/ keeps working until I've checked the new one. Give me a checklist to test admin.shiwase.co.jp after I link it to the repo: log in, see shop orders, see お歳暮 orders, change a wholesale status, print the 仕込み表, toggle a product sold-out, upload an image. (If it's broken I'll roll back by re-publishing the last zip deploy in Netlify.)

Ask me if anything in the existing code contradicts this plan rather than guessing.
