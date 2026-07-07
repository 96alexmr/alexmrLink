# link.alexmr.me

Cloudflare Worker link shortener backed by Workers KV, with a
password-protected admin UI for creating/deleting short links (custom or
random slugs) and managing scoped API tokens for automations (e.g. a Stream
Deck plugin).

## Local development

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create `.dev.vars` (gitignored) with a local admin password:

   ```
   ADMIN_PASSWORD=whatever-you-want-locally
   ```

3. Run the dev server — Wrangler simulates KV locally, so no real Cloudflare
   resources are needed yet:

   ```sh
   npm run dev
   ```

4. Visit `http://127.0.0.1:8787/admin`, log in with `admin` / whatever you
   put in `.dev.vars`.

## One-time Cloudflare setup

You'll need a Cloudflare account with `alexmr.me` on it, and to be logged
into Wrangler locally for the steps below:

```sh
npx wrangler login
```

1. **Create the KV namespace:**

   ```sh
   npx wrangler kv namespace create LINKS
   ```

   Copy the returned `id` into [wrangler.toml](wrangler.toml), replacing
   `REPLACE_WITH_KV_NAMESPACE_ID`. This id isn't sensitive — it's fine to
   commit.

2. **Set the real admin password** (this never touches the repo — it's
   stored encrypted by Cloudflare):

   ```sh
   npx wrangler secret put ADMIN_PASSWORD
   ```

   Use a long, random password (20+ characters) since this is now your only
   line of defense against a random person hitting `/admin` or `/api/*`.

3. **Add DNS.** Make sure `link.alexmr.me` exists as a DNS record in the
   `alexmr.me` zone (any proxied placeholder record works — the Worker route
   in `wrangler.toml` intercepts the request before it reaches an origin).

4. **Consider a Cloudflare Rate Limiting rule** on `link.alexmr.me/admin*`
   and `link.alexmr.me/api/*` (Security → WAF → Rate limiting rules in the
   dashboard) to slow down password-guessing attempts. Not required, but
   recommended before this is public.

5. **First deploy**, to confirm everything above is wired correctly:

   ```sh
   npm run deploy
   ```

## GitHub + CI/CD setup

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) deploys
automatically on every push to `main` via `wrangler-action`. To wire it up:

1. **Create the GitHub repo** (github.com → New repository, or `gh repo
   create` if you have the CLI), then push this code:

   ```sh
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Create a Cloudflare API token** the Action can deploy with: Cloudflare
   dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare
   Workers" template (scope it to your account/zone if prompted).

3. **Add two repo secrets** (GitHub repo → Settings → Secrets and variables
   → Actions → New repository secret):
   - `CLOUDFLARE_API_TOKEN` — the token from step 2
   - `CLOUDFLARE_ACCOUNT_ID` — found on the Cloudflare dashboard's right
     sidebar on any domain's overview page

None of these credentials live in the code — the KV namespace id in
`wrangler.toml` is the only Cloudflare-account-specific value in the repo,
and it isn't sensitive on its own (it can't be used to authenticate as you).

After that, every push to `main` redeploys automatically. `ADMIN_PASSWORD`
is set once via `wrangler secret put` (step 2 above) and isn't touched by
CI — redeploys don't overwrite it.

## Usage

- Visit `https://link.alexmr.me/admin` — browser will prompt for the admin
  username/password (HTTP Basic Auth), then you can create/delete links and
  create/revoke API tokens.
- Short links redirect via `https://link.alexmr.me/<slug>` (302).
- Leave the slug field blank when creating a link to get a random 6-character
  code.
- **API tokens** are scoped to creating links only (not listing, deleting,
  or managing other tokens) — safe to embed in something like a Stream Deck
  plugin. Create one in the admin UI (the raw token is shown once, at
  creation), then:

  ```sh
  curl -X POST https://link.alexmr.me/api/links \
    -H "Authorization: Bearer amtok_..." \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com"}'
  ```
