# V2C Education Bank: Setup & Running Guide

*உதவுகின்றோம் உங்களிற்கு, உதவிடுங்கள் பிறருக்கு*

Follow these steps in order. Allow about 30–45 minutes the first time.

---

## Part 0: What you need

| Tool | Why | Get it |
|---|---|---|
| **Node.js 20 or newer** | Runs the website | https://nodejs.org (choose "LTS") |
| **A Supabase account** (free) | Database, login, file storage | https://supabase.com |
| A code editor (optional) | To edit text, colours, etc. | https://code.visualstudio.com |
| Google Cloud account (optional) | Only for "Continue with Google" | https://console.cloud.google.com |

Check Node is installed. Open a terminal (Windows: **PowerShell**, Mac: **Terminal**):

```bash
node -v
```

It should print `v20.x` or higher.

---

## Part 1: Unzip and install

1. Unzip `v2c-education-bank.zip` to a folder, for example `Documents/v2c-education-bank`.
2. Open a terminal **in that folder**:

```bash
cd Documents/v2c-education-bank
```

3. Install the dependencies (one time, takes 1–2 minutes):

```bash
npm install
```

---

## Part 2: Create the Supabase project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Name: `v2c-education-bank`. Choose a strong database password and save it. For Region, pick **Singapore** or **Mumbai**; they are closest to Sri Lanka.
3. Wait about 2 minutes for the project to start.

### 2a. Copy your keys

Go to **Project Settings → API** (in newer dashboards: **Project Settings → API Keys**). Copy:

- **Project URL**, for example `https://abcdxyz.supabase.co`
- **anon / public key**, or the **publishable key** (`sb_publishable_...`)

> ⚠️ Never use the **service_role** or **secret** key in the website.

### 2b. Put the keys in the project

In the project folder, copy `.env.example` to a new file named `.env`:

```bash
cp .env.example .env
```

On Windows PowerShell, use this instead:

```bash
copy .env.example .env
```

Open `.env` and fill in your values:

```
VITE_SUPABASE_URL=https://abcdxyz.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

---

## Part 3: Create the database (tables, security, storage)

1. In Supabase, open **SQL Editor → New query**.
2. Open this file from the project in a text editor:
   `supabase/migrations/20261121000000_v2c_education_bank.sql`
3. Select all of it, copy it, paste it into the SQL Editor and click **Run**.
4. You should see **"Success. No rows returned."**

This creates:

- **Tables:** `profiles`, `user_roles`, `item_types` (7 items seeded), `deposits`, `distributions`, `notifications`, `app_settings`
- **Security:** Row-Level Security policies and triggers, including the rule that a distribution can never exceed a donor's balance
- **Storage buckets:** `receipts` and `proofs`, both private

Check that it worked: **Table Editor → item_types** should list 7 items (Exercise Books, Textbooks …).

> Run the migration **only once**. Running it again gives "already exists" errors, which are harmless.

---

## Part 4: Login settings

Go to **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:5173` (change this to your real domain when you go live; see Part 9)
- **Redirect URLs:** add both of these:
  - `http://localhost:5173/dashboard`
  - `http://localhost:5173/**`

### 4a. Email login

Go to **Authentication → Providers → Email** and make sure it is **enabled**.

- "Confirm email" ON (recommended): new users must click the link in their email.
- For quick local testing, you can switch it OFF.

> The free Supabase email service sends only a few emails per hour. For real use, set up custom SMTP in **Authentication → Emails → SMTP Settings**. Gmail SMTP, Brevo and Resend all work.

### 4b. Bilingual email templates (optional but recommended)

Go to **Authentication → Emails → Templates**:

| Template | Subject | Body (paste the whole file) |
|---|---|---|
| Confirm signup | `Confirm your V2C Education Bank account / உங்கள் கணக்கை உறுதிப்படுத்துங்கள்` | `supabase/templates/confirmation.html` |
| Reset password | `Reset your password / கடவுச்சொல்லை மீட்டமைக்கவும்` | `supabase/templates/recovery.html` |

### 4c. Google sign-in (optional)

1. Go to https://console.cloud.google.com → **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - If asked, first configure the **OAuth consent screen**: External, add the app name and your email.
   - Application type: **Web application**.
   - **Authorized redirect URI:** `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
2. Copy the **Client ID** and **Client Secret**.
3. In Supabase, go to **Authentication → Providers → Google**. Enable it, paste both values and click **Save**.

If you skip this step, the Google button just shows an error; email login still works.

---

## Part 5: Run the website

```bash
npm run dev
```

Open **http://localhost:5173** in your browser. 🎉

- The **தமிழ் / English** button (top right) switches the language.
- To stop the server, press `Ctrl + C` in the terminal.

---

## Part 6: Make yourself the admin

Ordinary sign-ups are **always donors**. That is a deliberate security rule, so the first admin has to be created by hand.

1. On the website, click **Sign in → Register** and create your account. Confirm the email if asked.
2. In Supabase, open **SQL Editor → New query** and paste this, using **your** email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com'
on conflict (user_id, role) do nothing;
```

3. Click **Run**.
4. On the website, **Sign out and sign in again**. An **Admin** menu now appears.

To add more admins later, repeat step 2 with their email.

---

## Part 7: Set your real details (Admin → Settings)

Open **Admin → Settings** and fill in:

- **Bank name, branch, account name, account number, SWIFT.** Donors see these when they deposit.
- **Physical drop-off** instructions, in English and Tamil.
- **WhatsApp and email** contact details, shown on the About page.
- **Exercise books required for membership** (default **6**).
- **Item catalogue:** unit prices in LKR, which items count toward membership, and Active on/off.

---

## Part 8: Try the full workflow

1. **As a donor** (use a second email or a private browser window): register, then go to **My Account → Deposit items**. Choose *Exercise Books × 6*, upload any image as the slip, and submit.
2. **As admin:** go to **Admin → Verify deposits**, then **View receipt → Approve**.
3. **As the donor:** the balance now shows *6 available* and a gold **Club Member** badge. A notification appears.
4. **As admin:** go to **Admin → Record distribution**. Pick the donor, *Exercise Books*, quantity 4, a school and a village, and upload a photo.
5. **As the donor:** **Impact & proofs** shows the timeline and photo. The balance is now *2 available*.
6. **As admin:** **Donors & members → Export CSV** downloads the donor list.
7. The **Home page** counters and live ticker update automatically.

---

## Part 9: Put it online (free)

### Option A: Vercel (easiest)

1. Push the folder to a GitHub repository. Alternatively, install the CLI and run `vercel` in the folder (`npm i -g vercel`).
2. At https://vercel.com, click **Add New → Project** and import the repository.
3. Framework: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Click **Deploy**. You get a URL such as `https://v2c-education-bank.vercel.app`.

### Option B: Netlify

Same idea: build command `npm run build`, publish directory `dist`, and the same environment variables. The `public/_redirects` file is already included.

### After deploying (important)

In Supabase, go to **Authentication → URL Configuration**:

- Set **Site URL** to `https://your-domain`.
- Add `https://your-domain/dashboard` and `https://your-domain/**` to the **Redirect URLs**.

If you use Google sign-in, nothing needs to change in Google; its redirect URI points at Supabase, not at your site.

---

## Part 10: MCP server for AI agents (optional)

This lets an AI assistant read a donor's own balances and deposits.

```bash
npm i -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy mcp
```

- **Endpoint:** `https://YOUR-PROJECT.supabase.co/functions/v1/mcp`
- **Header:** `Authorization: Bearer <the donor's login access token>`
- **Tools:** `my_item_balances`, `my_recent_deposits`. Both are read-only and only ever see the caller's own data.

---

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the local site at http://localhost:5173 |
| `npm run build` | Make the production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Check the code for type errors |
| `npm run test:db` | Run the database rule tests. Needs PostgreSQL installed locally (Linux/Mac); optional. |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Yellow bar: *"Supabase is not configured"* | `.env` is missing or wrong. Fix it, then stop (`Ctrl+C`) and run `npm run dev` again. |
| `npm` is not recognised | Install Node.js LTS, then close and reopen the terminal. |
| Sign-up works but the email never arrives | Check spam. The free email limit is very low, so set up custom SMTP (Part 4a) or turn off "Confirm email" while testing. |
| "Invalid login credentials" right after sign-up | The email isn't confirmed yet. Click the link in the email first. |
| The Admin menu doesn't appear | Run the Part 6 SQL with the **exact** email, then sign out and sign in again. |
| "Insufficient balance" when recording a distribution | Working as intended: the donor doesn't have that many approved items. |
| A page shows 404 after deploying | Make sure `vercel.json` or `public/_redirects` was deployed. |
| Google login says "redirect_uri_mismatch" | The Google redirect URI must be exactly `https://YOUR-PROJECT.supabase.co/auth/v1/callback`. |
| Upload fails | Receipts: JPG, PNG, WebP or PDF up to 5 MB. Photos: JPG, PNG or WebP up to 8 MB. |

---

## Where to change things

| What | File |
|---|---|
| All English and Tamil text | `src/i18n/dictionary.ts` |
| Colours and fonts | `src/index.css` |
| Logo | `public/v2c-logo.jpg` (replace it, keeping the same name) |
| About page team names | `src/i18n/dictionary.ts` → `about.team` |
| Membership interest categories | `src/i18n/dictionary.ts` → `categories` |
| Database rules | `supabase/migrations/…sql` |
