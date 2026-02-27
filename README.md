This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deployment (EC2)

The app is configured to run on an EC2 instance with PM2.

- **App path:** `/var/www/moshavi` (clone the repo there or deploy via your preferred method).
- **Build and run:**
  ```bash
  cd /var/www/moshavi
  npm ci
  npm run build
  pm2 start ecosystem.config.js
  # or to restart after updates:
  pm2 restart moshavi
  ```
- **Database:** Run the setup script once to create tables: `npx ts-node db/setup.ts` (or equivalent from the project root).
- **YouTube sync (admin):** The admin "YouTube playlist sync" feature requires **yt-dlp** installed on the server (e.g. `sudo apt update && sudo apt install -y yt-dlp`, or install from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)). Without it, "Fetch preview" will fail with an error.

## Environment variables

Set these on the server (e.g. in `ecosystem.config.js` `env` or a `.env` file). **Do not commit secrets.**

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_PASSWORD` | Yes | Bearer token for admin panel and protected API (e.g. carousel POST). |
| `NEXT_PUBLIC_GA_ID` | No | Google Analytics ID; omit to disable GA. |
| `YOUTUBE_CHANNEL_PLAYLISTS_URL` | No | URL for YouTube channel playlists page (e.g. `https://www.youtube.com/@avivais/playlists`). Defaults to @avivais playlists if unset. |
| `NODE_ENV` | Yes (prod) | Set to `production` for production. |
| `PORT` | No | Server port (default 3000; set in PM2 config). |
