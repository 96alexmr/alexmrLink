# Link Shortener (Cloudflare Workers + KV)

A self-hosted link shortener that runs entirely on Cloudflare Workers and
Workers KV — no other infrastructure. Includes a password-protected admin
UI for creating/deleting short links (custom or random slugs) and managing
scoped API tokens for automations (e.g. a Stream Deck plugin, a CLI script,
etc).

This README uses `link.example.com` / `example.com` as placeholders —
swap them for your own subdomain and Cloudflare zone throughout.

## Configuration

Before deploying, edit these to use your own domain:

- **`wrangler.toml`** — change `name` (the Worker's name) and the `routes`
  pattern (currently `link.example.com`) to your subdomain. The domain must
  already be on Cloudflare as a zone.
- **`src/admin-page.ts`** (optional) — the `<title>` and heading text are
  cosmetic; change them if you want the admin UI branded differently.

## Local development

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.dev.vars.example` to `.dev.vars` (gitignored) and set a local admin
   password:

   ```sh
   cp .dev.vars.example .dev.vars
   ```

3. Run the dev server — Wrangler simulates KV locally, so no real Cloudflare
   resources are needed yet:

   ```sh
   npm run dev
   ```

4. Visit `http://127.0.0.1:8787/admin`, log in with `admin` / whatever you
   put in `.dev.vars`.

## One-time Cloudflare setup

You'll need a Cloudflare account with your domain on it, and to be logged
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

2. **Push this repo to GitHub** (if you haven't already).

3. **Connect the repo in the Cloudflare dashboard** — this is what deploys
   the Worker, both now and on every future push to `main`:

   Workers & Pages → Create → **Import a repository** → pick your GitHub
   repo → Cloudflare auto-detects `wrangler.toml` (build command/output
   aren't needed for Workers) → Deploy. It provisions the Worker, the
   Custom Domain (DNS + TLS) for whatever hostname you set in step 1, and
   the KV binding entirely from `wrangler.toml` — no GitHub Actions file,
   no Cloudflare API token living in GitHub.

4. **Set the real admin password** (this never touches the repo — it's
   stored encrypted by Cloudflare, and survives future deploys either
   method):

   ```sh
   npx wrangler secret put ADMIN_PASSWORD
   ```

   Use a long, random password (20+ characters) since this is now your only
   line of defense against a random person hitting `/admin` or `/api/*`.

5. **Consider a Cloudflare Rate Limiting rule** on `link.example.com/admin*`
   and `link.example.com/api/*` (Security → WAF → Rate limiting rules in the
   dashboard) to slow down password-guessing attempts. Not required, but
   recommended before this is public.

Need to ship a change outside of pushing to `main`? `npm run deploy` still
works for a one-off manual deploy from your machine.

## Usage

- Visit `https://link.example.com/admin` — browser will prompt for the
  admin username/password (HTTP Basic Auth), then you can create/delete
  links and create/revoke API tokens.
- Short links redirect via `https://link.example.com/<slug>` (302).
- Leave the slug field blank when creating a link to get a random 6-character
  code.
- **API tokens** are scoped to creating links only (not listing, deleting,
  or managing other tokens) — safe to embed in something like a Stream Deck
  plugin. Create one in the admin UI (the raw token is shown once, at
  creation), then:

  ```sh
  curl -X POST https://link.example.com/api/links \
    -H "Authorization: Bearer amtok_..." \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com"}'
  ```

## Built with

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) + [Workers KV](https://developers.cloudflare.com/kv/)
- [Hono](https://hono.dev/) for routing

## License

[MIT](LICENSE)
