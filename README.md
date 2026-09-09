# Sovereign Engineering

Website for Sovereign Engineering.

## Run locally

```sh
git clone https://github.com/soveng/v3.git
cd v3
npm ci
npm run dev
```

## Deploy to Vercel

1. Import [`soveng/v3`](https://github.com/soveng/v3) at
   [vercel.com/new](https://vercel.com/new).
2. Click **Deploy**.

`vercel.json` already configures Vite, `npm run build`, and the `dist` output.

Or deploy from a local clone:

```sh
npx vercel
npx vercel --prod
```
