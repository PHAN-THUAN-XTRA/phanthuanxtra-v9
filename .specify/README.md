# PhanThuầnXtra — GitHub Spec Kit (Codex)

Pinned from [github/spec-kit v0.12.11](https://github.com/github/spec-kit/tree/v0.12.11) official core templates and PowerShell scripts. Codex skill files in `.agents/skills/`. Assembled through GitHub source review; the official `specify init` CLI and Windows/Codex runtime verification were not executed in this chat. This PR stages **documentation and coding-agent tooling only**: no Cloudflare deployment, DB changes, Telegram commands or vehicle edits.

Read `.specify/memory/constitution.md` and inspect the current website/admin code before writing a spec. Use `$speckit-constitution`, `$speckit-specify`, `$speckit-plan`, `$speckit-tasks` then only approved implementation. New artifacts belong under `specs/<number>-<slug>/`.

To later run official CLI in a **disposable checkout**, review the diff before `specify init --here --force --non-interactive --integration codex --script ps`; force can overwrite files. Do not run against production.
