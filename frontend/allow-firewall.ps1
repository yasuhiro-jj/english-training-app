# Windowsファイアウォールでポート3001を許可するスクリプト
# 管理者権限で実行してください

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Windowsファイアウォール設定" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 管理者権限チェック
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "このスクリプトは管理者権限が必要です" -ForegroundColor Red
    Write-Host ""
    Write-Host "手順:" -ForegroundColor Yellow
    Write-Host "1. PowerShellを右クリック -> 管理者として実行" -ForegroundColor Gray
    Write-Host "2. このスクリプトを実行: .\allow-firewall.ps1" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "ポート3001をファイアウォールで許可します..." -ForegroundColor Yellow
Write-Host ""

# 既存のルールを確認
$existingRule = Get-NetFirewallRule -DisplayName "Next.js dev (3001)" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "既にルールが存在します" -ForegroundColor Green
    Write-Host ""
    Write-Host "ルールの状態を確認中..." -ForegroundColor Yellow
    Get-NetFirewallRule -DisplayName "Next.js dev (3001)" | Format-Table DisplayName, Enabled, Direction, Action
} else {
    try {
        # 新しいルールを作成（プライベート＋パブリック両方で許可）
        New-NetFirewallRule -DisplayName "Next.js dev (3001)" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -Profile Any
        
        Write-Host "ファイアウォールルールを作成しました" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "エラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "手動で設定する場合:" -ForegroundColor Yellow
        Write-Host "1. Windowsの検索で「ファイアウォール」を検索" -ForegroundColor Gray
        Write-Host "2. 「詳細設定」->「受信の規則」->「新しい規則」" -ForegroundColor Gray
        Write-Host "3. 「ポート」を選択 -> TCP -> 3001 -> 「接続を許可する」" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "設定完了！" -ForegroundColor Green
Write-Host ""
Write-Host "次に確認すること:" -ForegroundColor Yellow
Write-Host "1. スマホとPCが同じWi-Fiに接続されているか" -ForegroundColor Gray
Write-Host "2. スマホのモバイルデータがオフになっているか" -ForegroundColor Gray
Write-Host "3. サーバーが起動しているか（npm run dev）" -ForegroundColor Gray
Write-Host ""
Write-Host "スマホからアクセスするURL:" -ForegroundColor Yellow
Write-Host "  http://192.168.150.69:3001" -ForegroundColor Green
Write-Host ""
