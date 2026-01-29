# SnipShare

Share text and code snippets securely with password protection, auto-expiration, and burn-after-reading features. No login required.

![SnipShare](SnipShare.gif)

## Features

- 🔒 **Password Protection** — Encrypt snippets with AES-256-GCM via Web Crypto API
- ⏰ **Auto-Expiration** — Snippets expire after a configurable time
- 🔥 **Burn After Reading** — One-time view snippets
- 🎨 **Syntax Highlighting** — 25+ languages via highlight.js (dynamically loaded)
- 📱 **QR Code Sharing** — Share snippets via QR code
- 🚀 **Rate Limiting** — IP-based rate limiting for abuse prevention

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Hosting:** Cloudflare Pages via [@opennextjs/cloudflare](https://github.com/opennextjs/cloudflare)
- **Database:** Cloudflare D1 (SQLite) with Drizzle ORM
- **Encryption:** Web Crypto API (AES-256-GCM + PBKDF2)
- **Styling:** Tailwind CSS v4

## Getting Started

### Prerequisites

- Node.js 20+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- A Cloudflare account

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/homecity/SnipShare.git
   cd SnipShare
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create D1 database:**
   ```bash
   wrangler d1 create snipshare-db
   ```
   Update the `database_id` in `wrangler.toml` with the output.

4. **Run migrations:**
   ```bash
   npm run db:migrate:local   # for local dev
   npm run db:migrate:remote  # for production
   ```

5. **Start dev server:**
   ```bash
   npm run dev        # Next.js dev
   npm run preview    # Cloudflare preview
   ```

### Deploy

```bash
npm run deploy
```

## Environment Variables

See [.env.example](.env.example) for available environment variables.

## License

MIT
