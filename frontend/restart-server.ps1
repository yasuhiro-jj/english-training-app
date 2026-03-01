# Next.js開発サーバー再起動スクリプト

Write-Host "🛑 実行中のNode.jsプロセスを停止中..." -ForegroundColor Yellow

# ポート3000と3001を使用しているプロセスを終了
$ports = @(3000, 3001)
foreach ($port in $ports) {
    $connections = netstat -ano | findstr ":$port" | findstr "LISTENING"
    if ($connections) {
        $pid = ($connections -split '\s+')[-1]
        if ($pid) {
            Write-Host "ポート $port を使用しているプロセス (PID: $pid) を終了中..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

# 少し待機
Start-Sleep -Seconds 2

Write-Host "🧹 .nextフォルダをクリーンアップ中..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "✅ クリーンアップ完了" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 開発サーバーを起動します..." -ForegroundColor Cyan
Write-Host ""

# 開発サーバーを起動
npm run dev
