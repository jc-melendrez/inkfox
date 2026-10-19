# Build the Redraft frontend for production on your laptop (Windows) and print
# the upload commands. Run:  powershell -ExecutionPolicy Bypass -File deploy\build-frontend.ps1
# Vite gives already-set environment variables highest priority, so these win over
# any .env.local (which defaults to mock mode).
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot

$env:VITE_API_MODE = "real"
$env:VITE_ENABLE_GOOGLE_AUTH = "false"
$env:VITE_API_BASE_URL = "/api"

Push-Location $repo
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed ($LASTEXITCODE)" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed ($LASTEXITCODE)" }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Built: $repo\dist" -ForegroundColor Green
Write-Host ""
Write-Host "Upload it to the server (replace <PUBLIC_IP>):"
Write-Host "  ssh ec2-user@<PUBLIC_IP> `"rm -rf /srv/foxtutor/frontend/dist`""
Write-Host "  scp -r `"$repo\dist`" ec2-user@<PUBLIC_IP>:/srv/foxtutor/frontend/"
Write-Host "  ssh ec2-user@<PUBLIC_IP> `"chmod -R a+rX /srv/foxtutor/frontend/dist`""
Write-Host "  ssh ec2-user@<PUBLIC_IP> `"sudo restorecon -R /srv/foxtutor/frontend/dist`""
