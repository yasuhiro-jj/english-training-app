# Show URL for smartphone (run in frontend folder: .\show-url.ps1)
# Finds 192.168 / 10.x / 100.64 (common LAN or mobile hotspot)

$all = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
  $_.IPAddress -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Docker|WSL|Bluetooth'
}
$private = $all | Where-Object {
  $a = $_.IPAddress
  ($a -like '192.168.*') -or ($a -like '10.*') -or ($a -like '100.64.*')
} | Select-Object -First 1

$ip = $null
$adapter = $null
if ($private) { $ip = $private.IPAddress; $adapter = $private.InterfaceAlias }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Open this URL on your smartphone:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if ($ip) {
  $url = "http://${ip}:3000"
  Write-Host ""
  Write-Host "  $url" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Adapter: $adapter" -ForegroundColor Gray
  Write-Host ""
  Write-Host "  Turn OFF mobile data on phone, use same Wi-Fi as PC." -ForegroundColor Yellow
  Write-Host ""
} else {
  Write-Host "  No 192.168 / 10.x / 100.64 address found." -ForegroundColor Red
  Write-Host ""
  Write-Host "  Your PC's IPv4 addresses:" -ForegroundColor Yellow
  $all | ForEach-Object { Write-Host "    $($_.IPAddress)  ($($_.InterfaceAlias))" -ForegroundColor Gray }
  Write-Host ""
  Write-Host "  If you see an address above, try: http://THAT_IP:3000" -ForegroundColor Yellow
  Write-Host "  Or run: ipconfig" -ForegroundColor Gray
  Write-Host ""
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
