# Starts/stops the local development PostgreSQL instance.
#
# The binaries live outside the repository so nothing database-related is committed.
# Usage:
#   powershell -File scripts/dev-db.ps1 start
#   powershell -File scripts/dev-db.ps1 stop
#   powershell -File scripts/dev-db.ps1 status
param(
  [Parameter(Position = 0)]
  [ValidateSet('start', 'stop', 'status')]
  [string]$Action = 'status'
)

$Root = if ($env:ZAMBUS_PG_ROOT) { $env:ZAMBUS_PG_ROOT } else { Join-Path $env:USERPROFILE '.zambus' }
$Bin = Join-Path $Root 'pgsql\bin'
$Data = Join-Path $Root 'data'
$Log = Join-Path $Root 'postgres.log'

if (-not (Test-Path (Join-Path $Bin 'pg_ctl.exe'))) {
  Write-Error "PostgreSQL binaries not found at $Bin. Set ZAMBUS_PG_ROOT or install PostgreSQL normally."
  exit 1
}

switch ($Action) {
  'start' {
    & (Join-Path $Bin 'pg_ctl.exe') -D $Data -l $Log -o '-p 5432 -c listen_addresses=localhost' -w start
  }
  'stop' {
    & (Join-Path $Bin 'pg_ctl.exe') -D $Data -m fast -w stop
  }
  'status' {
    & (Join-Path $Bin 'pg_ctl.exe') -D $Data status
  }
}
