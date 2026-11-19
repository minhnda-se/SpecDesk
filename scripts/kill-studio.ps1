Get-Process | Where-Object { $_.Path -like "*dist-release*" -or $_.Name -like "*Playwright Embedded Studio*" } | ForEach-Object {
  Write-Host "Killing $($_.Id) $($_.Name)"
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1
if (Test-Path "dist-release") {
  Remove-Item -Recurse -Force "dist-release" -ErrorAction SilentlyContinue
  Write-Host "dist-release removed: $(!(Test-Path 'dist-release'))"
}
