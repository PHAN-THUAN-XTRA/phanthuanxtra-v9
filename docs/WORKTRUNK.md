# Worktrunk — isolated local Git worktrees

Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9` · Project config: [`.config/wt.toml`](../.config/wt.toml)

Worktrunk is a **developer-side Git worktree CLI**, not a GitHub Action, runtime dependency, or hosting service. This repository only includes a safe project configuration: two **manual** aliases and **no automatic hooks**. Committing this file does **not** install Worktrunk on Windows or run Git worktrees, builds, tests, merges, devices, or deployments.

## Windows 11 setup — on the developer's own host

In PowerShell, with a working Git installation and a local clone of this repository:

```powershell
winget install --id max-sixty.worktrunk --exact
git-wt config shell install
# Restart PowerShell so shell integration takes effect.
```

On Windows, use `git-wt` because `wt` may resolve to Windows Terminal. For other environments, Worktrunk may be available as `wt`. See [official Worktrunk documentation](https://worktrunk.dev/).

## Safe, opt-in workflow

Run these commands **from a local clone** of this repository, with no uncommitted work you might unintentionally mix into a new branch:

```powershell
git-wt config show
git-wt config alias show xtra-status
git-wt config alias dry-run xtra-check
git-wt list
# Create a dedicated branch/worktree only when beginning a reviewed task:
git-wt switch --create docs/example-isolated-task
git-wt xtra-status
git-wt xtra-check
```

Use a **different branch and worktree for each agent/task**. Codex and Work should independently inspect their own changes, reference the correct main-branch baseline, and open scoped PRs for review. The CLI does not launch ChatGPT Work or Codex by itself.

Do not put secrets, credentials, production `.env` files, raw backups or device data into a worktree. Worktrees share Git history/refs but **do not share untracked files**; do not use `copy-ignored` to replicate secret material. Do not automatically invoke `git-wt merge`, `git-wt remove`, force cleanup, or deployment: merging/removal can have consequential effects on branches and files.

## Repository-specific guardrails

This is a PUBLIC website repository. Keep Cloudflare Workers, D1 (especially remote migrations), production website, Telegram/Admin and car inventory untouched. Worktree branch isolation is for source review and local development only. Do not copy secrets, private documents, or vehicle/customer data into branches or PRs.

## Independent verification before adoption

- Review the PR containing only this documentation and `.config/wt.toml`.
- Parse `.config/wt.toml` as TOML; verify **no hooks** are configured and the manual aliases run only `git status` and `git diff --check`.
- On the owner's Windows 11 machine, check `git-wt --version`, `git-wt config show`, `git-wt config alias show xtra-status`, and `git-wt list` inside the clone. These host checks are **not yet performed** by a GitHub-only change.
- Merge only after scoped review. No production deployment or physical-device action follows from this documentation.
