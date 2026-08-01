# Myapp — Cloudflare Worker AI agent

This repo includes a minimal Cloudflare Workers backend (src/worker.js) and a static chat UI served at `/`.

What was added
- src/worker.js — Cloudflare Worker that serves a simple static UI and exposes POST /api/chat which forwards the prompt to the Hugging Face Inference API.
- wrangler.toml — Cloudflare Workers configuration (account_id left as a placeholder). Do not commit secrets.

Quick setup
1. Install wrangler: https://developers.cloudflare.com/workers/cli
2. Configure wrangler.toml:
   - Replace `account_id` with your Cloudflare account ID.

Secrets & tokens (DO NOT commit these to the repo)
- CF_API_TOKEN (GitHub repo secret) — used by the GitHub Action to publish the Worker. You already added this.
- HF_API_KEY — Hugging Face API key. Important: adding HF_API_KEY as a GitHub secret does NOT automatically make it available to the Worker runtime.
  Options to make the secret available to the Worker:
  - Add HF_API_KEY as a Worker secret in the Cloudflare dashboard (Workers > your Worker > Variables & secrets).
  - Or run locally: `wrangler secret put HF_API_KEY` (this stores the secret in your Cloudflare account for the Worker to read via env.HF_API_KEY).

Deploy locally
- Run: `wrangler dev` to test locally (after installing wrangler and setting account_id).

Deploy via GitHub Actions
- The repository includes a GitHub Action that runs `wrangler publish` on pushes to `main`. The Action requires the `CF_API_TOKEN` secret to be set in the repository settings.

Notes and next steps
- The Worker forwards chat messages to the Hugging Face Inference API. You can change the default model in `src/worker.js`.
- Never store API keys or tokens in the repository. Use Cloudflare secrets for HF_API_KEY and GitHub Actions secrets for CF_API_TOKEN.
- If you want the GitHub Action to also write the HF_API_KEY into Cloudflare at deploy time, I can update the workflow to install wrangler and run `wrangler secret put HF_API_KEY` using the GitHub secret — but that requires the `account_id` in wrangler.toml to be correct.

Troubleshooting
- If the UI returns an error about HF_API_KEY missing, ensure the secret is set in Cloudflare (not just GitHub secrets) or run `wrangler secret put HF_API_KEY` before publishing.
