param(
  [ValidateSet("Check","Install")]
  [string]$Mode = "Check"
)
$ErrorActionPreference = "Stop"
$PinnedCommit = "a19a171fa980a0785849596492e0af4db800c82f"
$Source = "https://github.com/Panniantong/Agent-Reach/archive/$PinnedCommit.zip"
$Venv = Join-Path $env:USERPROFILE ".agent-reach-venv"
Write-Host "Agent-Reach pinned:" $PinnedCommit
if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
  throw "Python Launcher 'py' is required. Install Python 3.10+ first."
}
if (-not (Test-Path $Venv)) {
  if ($Mode -eq "Check") {
    Write-Host "[CHECK] venv missing:" $Venv
    Write-Host "[CHECK] No system changes made. Re-run with -Mode Install after owner approval."
    exit 0
  }
  py -3 -m venv $Venv
}
$Python = Join-Path $Venv "Scripts\python.exe"
$AgentReach = Join-Path $Venv "Scripts\agent-reach.exe"
if ($Mode -eq "Install") {
  & $Python -m pip install --upgrade $Source
  & $AgentReach install --env=local
}
if (-not (Test-Path $AgentReach)) {
  Write-Host "[CHECK] Agent-Reach is not installed in the dedicated venv."
  exit 0
}
& $AgentReach version
& $AgentReach doctor --json
