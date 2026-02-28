---
name: deploy
description: Runs or guides deployment of MoshAvi to production (EC2). Use when the user asks to deploy, push and deploy, or run deployment.
---

# Deploy MoshAvi

## When to use

- User says "deploy", "push and deploy", "run deploy", or "deploy my changes".
- User asks how to deploy or what the deploy process is.

## What to do

1. **Commits first:** Encourage small, human-readable commits (one per logical change). Do not bundle everything into one huge commit. If there are uncommitted changes, suggest committing them in clear, separate commits (e.g. "feat: add date to home", "fix: carousel loading") before running the deploy script.
2. **Run the script:** From the repo root, run:
   ```bash
   ./scripts/deploy.sh
   ```
   If the user only wants steps, point them to [DEPLOYMENT.md](DEPLOYMENT.md) and [scripts/deploy.sh](scripts/deploy.sh).
3. **Prereqs:** All changes must be committed and pushed. Optional: local `.env` with `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN` for cache purge (see DEPLOYMENT.md); if missing, the script skips purge and continues.
4. **Verify:** After deploy, suggest checking:
   - https://moshavi.com/api/version — version and git SHA should match the just-deployed commit.
   - https://moshavi.com — spot-check the site.

## References

- Full guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Deploy script: [scripts/deploy.sh](scripts/deploy.sh)

The script handles: version bump (patch), push, SSH deploy to EC2, optional Cloudflare cache purge, and prints the new version for verification.
