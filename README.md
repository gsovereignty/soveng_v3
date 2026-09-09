# Sovereign Engineering

Website for Sovereign Engineering.

## Run locally

If you only want to run the website:

```sh
git clone https://github.com/soveng/v3.git
cd v3
npm ci
npm run dev
```

## Contribute

Use a fork so you can make changes without editing the original repository.

- **Fork:** your copy of this repository on GitHub.
- **Origin:** your fork after you clone it.
- **Upstream:** the original [`soveng/v3`](https://github.com/soveng/v3) repository.
- **Branch:** a separate place for one change.
- **Pull request:** a request to add your change to the upstream repository.

### 1. Fork the repository

Sign in to GitHub, open [`soveng/v3`](https://github.com/soveng/v3), click
**Fork**, then click **Create fork**.

### 2. Clone your fork

Replace `YOUR-USERNAME` with your GitHub username:

```sh
git clone https://github.com/YOUR-USERNAME/v3.git
cd v3
npm ci
```

### 3. Add the upstream repository

This only needs to be done once:

```sh
git remote add upstream https://github.com/soveng/v3.git
git remote -v
```

`origin` should point to your fork. `upstream` should point to `soveng/v3`.

### 4. Pull the latest changes

Do this before starting new work:

```sh
git switch main
git pull upstream main
git push origin main
```

This downloads upstream changes and updates your fork.

### 5. Create a branch

Use a short name describing the problem:

```sh
git switch -c short-problem-name
```

Keep the branch focused on one problem. Make changes here, not on `main`.

### 6. Test and commit

Run the site and check your change. Press `Ctrl+C` to stop it:

```sh
npm run dev
```

Then build, review, and commit your files:

```sh
npm run build
git status
git add .
git commit -m "problem: describe unwanted behavior"
```

Check `git status` before `git add .` so you know which files will be saved.

### 7. Push your branch

```sh
git push -u origin short-problem-name
```

### 8. Open a pull request

1. Open your fork on GitHub.
2. Click **Compare & pull request**.
3. Confirm the base repository is `soveng/v3` and the base branch is `main`.
4. Explain the problem, your change, and how you tested it.
5. Click **Create pull request**.

For your next contribution, pull upstream again and create a new branch.

This workflow is adapted from
[Blockrazor's contribution guide](https://github.com/Blockrazor/blockrazor#contributing-to-blockrazor).

## Deploy to Vercel

1. Import [`soveng/v3`](https://github.com/soveng/v3) at
   [vercel.com/new](https://vercel.com/new).
2. Click **Deploy**.

`vercel.json` configures Vite, `npm run build`, and the `dist` output.

Or deploy from a local clone:

```sh
npx vercel
npx vercel --prod
```
