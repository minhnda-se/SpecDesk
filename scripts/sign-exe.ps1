param(
  [string]$ExePath = "dist-release\win-unpacked\Playwright Embedded Studio.exe"
)

$thumbprint = "B4127AF640CE91901058744ECDC3AE9718BE4482"
$cert = Get-Item "Cert:\CurrentUser\My\$thumbprint" -ErrorAction SilentlyContinue

if (-not $cert) {
  Write-Host "Creating new CodeSigning certificate..."
  $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Playwright Studio" -CertStoreLocation "Cert:\CurrentUser\My"
}

Write-Host "Cert found: $($cert.Thumbprint)"

# Sign executable
if (Test-Path $ExePath) {
  Write-Host "Signing $ExePath ..."
  $sig = Set-AuthenticodeSignature -FilePath $ExePath -Certificate $cert -HashAlgorithm SHA256
  Write-Host "Signature status: $($sig.Status) ($($sig.StatusMessage))"
} else {
  Write-Error "File not found: $ExePath"
}
