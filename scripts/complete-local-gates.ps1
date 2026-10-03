$ErrorActionPreference = "Stop"
$Repo = Join-Path $env:USERPROFILE "Documents\phanthuanxtra-v9"
if (-not (Test-Path (Join-Path $Repo ".git"))) { throw "Không tìm thấy repo tại $Repo" }
Set-Location $Repo
Write-Host "== Sync main =="
git fetch origin --prune
git switch main
git pull --ff-only origin main
Write-Host "== Main =="
git log -3 --oneline
Write-Host "== Agent-Reach safe check =="
powershell -ExecutionPolicy Bypass -File .\scripts\agent-reach.ps1 -Mode Check
Write-Host "== Agent-Reach pinned install =="
powershell -ExecutionPolicy Bypass -File .\scripts\agent-reach.ps1 -Mode Install
Write-Host "== Final doctor =="
$Doctor = Join-Path $env:USERPROFILE ".agent-reach-venv\Scripts\agent-reach.exe"
& $Doctor doctor --json
Write-Host "== COMPLETE =="
