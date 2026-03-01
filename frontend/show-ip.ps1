# 簡単にIPアドレスを表示するスクリプト
# 実行方法: .\show-ip.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PCのIPアドレス確認" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ipconfigでIPv4アドレスを取得
$ipconfig = ipconfig | Select-String "IPv4"
$ips = @()

if ($ipconfig) {
    Write-Host "見つかったIPアドレス:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($line in $ipconfig) {
        $parts = $line -split ':'
        if ($parts.Length -gt 1) {
            $ip = $parts[1].Trim()
            if ($ip -and $ip -notlike "169.254.*") {
                $ips += $ip
                Write-Host "  $ip" -ForegroundColor Green
            }
        }
    }
    
    Write-Host ""
    Write-Host "スマホからアクセスするURL:" -ForegroundColor Yellow
    Write-Host ""
    
    # プライベートIPアドレスを優先表示（172.16-31.x.xも含む）
    $privateIPs = $ips | Where-Object {
        ($_ -match '^192\.168\.') -or 
        ($_ -match '^10\.') -or 
        ($_ -match '^100\.64\.') -or
        ($_ -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.')
    }
    
    if ($privateIPs) {
        foreach ($ip in $privateIPs) {
            Write-Host "  http://${ip}:3001" -ForegroundColor Green -BackgroundColor Black
        }
    } else {
        # プライベートIPが見つからない場合は最初のIPを表示
        if ($ips.Count -gt 0) {
            Write-Host "  http://$($ips[0]):3001" -ForegroundColor Green -BackgroundColor Black
            Write-Host ""
            Write-Host "  ※ このIPが正しくない場合は、上記のIPアドレス一覧から適切なものを選んでください" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "注意: 環境が変わるとIPアドレスも変わります" -ForegroundColor Gray
    Write-Host "      Wi-Fiを切り替えたら、このスクリプトを再実行してください" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "IPアドレスが見つかりませんでした" -ForegroundColor Red
    Write-Host ""
    Write-Host "手動で確認する場合:" -ForegroundColor Yellow
    Write-Host "  ipconfig" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
