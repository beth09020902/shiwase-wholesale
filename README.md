# 志和勢 卸注文アプリ (Wholesale Order App)

Restaurants (北鈴蘭台, 肉重北斎 心斎橋, 肉重北斎 河原町 …) order from their phone or tablet at wholesale.shiwase.co.jp, logging in with their restaurant's own password (remembered on that device for 30 days). Each order is:

1. saved into the **shop site's** Netlify Blobs (store `wholesale-orders`) so it shows up in 注文管理 at admin.shiwase.co.jp, and
2. emailed to order@shiwase.co.jp.

Restaurants see their own item list (copied from their paper/Sheets 発注書), pick a 納品日 (12:00 cutoff for next day), and can see their past orders with status and re-order in one tap. No prices are shown.

```
Wholesale Order App/
├─ public/              the screen restaurants use (index.html, app.js, style.css, icons)
├─ netlify/functions/   login.mjs (password → 30-day login), catalog.mjs (item list + dates), order.mjs (place order), history.mjs
├─ lib/                 config.mjs (cutoff, closed days) and shared logic
├─ data/restaurants.json   ← each restaurant's item list — edit this to change what they can order
├─ scripts/make-passwords.mjs  makes each restaurant's password
├─ tests/               npm test
└─ docs/                data contract, the Claude Code prompt for the admin merge, reference files
```

---

## Do I need GitHub?

Yes — set it up the same way as `shiwase-shop`: a private GitHub repo, and Netlify deploys automatically every time you push to `main`. It is a **separate repo** (`shiwase-wholesale`) because it's a separate site; the two connect through the shared blob store, not through shared code.

---

## Setup — step by step (PowerShell)

### 1. Check the tools are there

```powershell
git --version
node -v        # needs v22 or newer
```

If `node -v` shows v20 or older, install the current LTS from nodejs.org first.

### 2. Tidy the folder and install

The product list and order-sheet photos you saved are reference material, so they go in `docs\reference`:

```powershell
cd "C:\dev\Wholesale Order App"
New-Item -ItemType Directory -Force docs\reference | Out-Null
Move-Item "products_prices.csv","Kitasuzu Order List.jpg","Order List.jpg","Order List2.jpg" docs\reference\
npm install
npm test
```

`npm test` should finish with `# pass 6` and `# fail 0`.

### 3. Start git

```powershell
git init -b main
git add .
git commit -m "Wholesale order app: first version"
```

### 4. Put it on GitHub (private)

**Option A — on the website:** github.com → **New repository** → name `shiwase-wholesale` → **Private** → do *not* tick README/.gitignore → **Create**. Then:

```powershell
git remote add origin https://github.com/beth09020902/shiwase-wholesale.git
git push -u origin main
```

**Option B — if you have the GitHub CLI (`gh`):**

```powershell
gh repo create beth09020902/shiwase-wholesale --private --source . --push
```

### 5. Make the restaurants' passwords

```powershell
npm run make-passwords
```

This prints (and saves to `restaurant-passwords.txt`, which is **not** pushed to GitHub):

- one long line starting `kitasuzu:…;hokusai-shinsaibashi:…` — the value for `RESTAURANT_PASSWORDS` in the next step
- each restaurant's password, to give to that restaurant

Running it with no names makes **new** passwords for every restaurant. To replace just one restaurant's password (staff left, password shared too widely):

```powershell
npm run make-passwords -- kitasuzu
```

then edit only that part of `RESTAURANT_PASSWORDS` in Netlify and **Trigger deploy**. Every device logged in with that restaurant's old password is logged out at once; the other restaurants aren't affected.

### 6. Create the Netlify site

Netlify → **Add new project → Import an existing project → GitHub** → choose `shiwase-wholesale`.
Leave base directory, build command and publish directory as they are — `netlify.toml` sets them (`publish = public`).

Before the first deploy, or straight after it, go to **Project configuration → Environment variables** and add:

| Key | Value | Secret? |
|---|---|---|
| `BLOB_SITE_ID` | the **shop** site's Site ID — copy the same value the admin site already uses | no |
| `NETLIFY_AUTH_TOKEN` | same personal access token the admin site uses | **yes** |
| `RESEND_API_KEY` | same as the shop site | **yes** |
| `MAIL_FROM` | the same "from" address the shop's emails use, e.g. `志和勢 <order@shiwase.co.jp>` | no |
| `RESTAURANT_PASSWORDS` | the long line from step 5 | **yes** |
| `ORDER_NOTIFY_TO` | optional — defaults to `order@shiwase.co.jp` | no |

Same convention as the other three sites: ticked "secret" → Production value only, scoped to Functions.
After adding or changing variables: **Deploys → Trigger deploy → Deploy project**.

### 7. Give it its address

1. Netlify → **Domain management → Add a domain** → `wholesale.shiwase.co.jp`.
2. お名前.com → DNS設定 for shiwase.co.jp → add a record: **CNAME**, host `wholesale`, value `<your-site-name>.netlify.app`.
3. Wait for Netlify to show the HTTPS certificate as active (usually under an hour).

### 8. Test it yourself

1. Open wholesale.shiwase.co.jp and log in with one restaurant's password from `restaurant-passwords.txt`.
2. Place a small test order (write テスト in 備考).
3. Check: the email arrives at order@shiwase.co.jp, and the order shows in that restaurant's 注文履歴 tab.
4. Once the admin merge (step 10) is done, mark the test order 取消 in 注文管理.

If the email doesn't arrive but the order is in 注文履歴, the order is safe — check `RESEND_API_KEY` / `MAIL_FROM`, and the function log under Netlify → **Logs → Functions → order**.

### 9. Give each restaurant its password

Send the address (wholesale.shiwase.co.jp) by LINE or email, and the password separately (in person, or a separate message). On the restaurant's iPad/iPhone: open the address in **Safari → 共有 → ホーム画面に追加**; Android: Chrome → ⋮ → **ホーム画面に追加**. They log in once and stay logged in on that device for 30 days. The **ログアウト** button (top right) is for shared devices.

### 10. Combine the two admin apps

This is done in the `shiwase-shop` repo, in Claude Code.

```powershell
# 1) Copy the admin.shiwase.co.jp source (the folder you've been zipping) into the shop repo
#    — change the first path to wherever that folder is
Copy-Item -Recurse "C:\path\to\your\admin-app-folder" "C:\dev\shiwase-shop\admin"

# 2) Copy the data contract across so Claude Code can read it
New-Item -ItemType Directory -Force "C:\dev\shiwase-shop\docs" | Out-Null
Copy-Item "C:\dev\Wholesale Order App\docs\data-contract.md" "C:\dev\shiwase-shop\docs\wholesale-data-contract.md"

# 3) Open Claude Code there
cd "C:\dev\shiwase-shop"
claude
```

Paste the prompt from `docs\claude-code-merge-prompt.md`. When the code is committed:

Netlify → the **admin** site → **Project configuration → Build & deploy → Link repository** → `shiwase-shop`, **base directory `admin`**. Your last zip deploy stays in the Deploys list, so you can roll back by opening it and clicking **Publish deploy**.

---

## Everyday changes

**Add / remove / rename an item, or add a restaurant** — edit `data\restaurants.json`, then:

```powershell
cd "C:\dev\Wholesale Order App"
npm test
git add .
git commit -m "Update 北鈴蘭台 items"
git push
```

Netlify publishes it in about a minute. Keep each item's `id` the same once it's been ordered (history and 再注文 use it). A new restaurant also needs a password: `npm run make-passwords -- newid`, add `newid:PASSWORD` to `RESTAURANT_PASSWORDS` in Netlify, and Trigger deploy.

**Cutoff time, no-delivery weekdays, holidays** — `lib\config.mjs`, same commit/push.

---

## Still to confirm (please check and edit)

- **北鈴蘭台 units** — its sheet has no units, so most items show just a number. Fill in `"unit"` in `data\restaurants.json` (パック? kg? 本?).
- **北鈴蘭台** — is this the name the restaurant should see, or does it have a shop name?
- **Delivery days** — `NO_DELIVERY_WEEKDAYS` is empty (every day offered). Set e.g. `[0]` if there's no Sunday delivery.
- **Year-end** — 12/29–1/2 is blocked, copied from the shop's dispatch break. Confirm it applies to restaurant deliveries.
- **河原町 (Kyoto)** — next-day delivery OK, or does it need an extra day? Set `"extraLeadDays": 1` if so.
- **Restaurant emails** — put an address in `"email"` if a restaurant should get a copy of its own order.
