#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
REPO="${HOME}/phanthuanxtra-v9"
echo "== PHAN THUAN XTRA · S21/Termux completion gate =="
command -v git >/dev/null || { echo "Missing git: pkg install git"; exit 2; }
command -v python >/dev/null || { echo "Missing python: pkg install python"; exit 2; }
if [ ! -d "$REPO/.git" ]; then
  echo "Repo missing at $REPO"
  echo "Clone the project repository into that path, then rerun."
  exit 2
fi
cd "$REPO"
echo "== Safe sync main =="
git fetch origin --prune
git switch main
git pull --ff-only origin main
git status --short
git log -3 --oneline
echo "== Agent-Reach isolated venv =="
VENV="$HOME/.agent-reach-venv"
PIN="a19a171fa980a0785849596492e0af4db800c82f"
[ -d "$VENV" ] || python -m venv "$VENV"
"$VENV/bin/python" -m pip install --upgrade "https://github.com/Panniantong/Agent-Reach/archive/$PIN.zip"
"$VENV/bin/agent-reach" install --env=local
echo "== Agent-Reach doctor =="
"$VENV/bin/agent-reach" doctor --json
echo "== COMPLETE: Termux gate finished =="
