# Mirrors StrategyTester.htm out of MetaTrader's AppData folder into Documents, because Chrome's
# File System Access API hard-blocks reading files from AppData/Program Files/Windows (a browser
# security policy, not something this app or Windows Explorer settings can change). Point the
# web app's Auto-upload file picker at the mirrored copy below instead of the original.
#
# Usage: double-click mirror-report.bat, or run this directly:
#   powershell -ExecutionPolicy Bypass -File mirror-report.ps1
# Leave the window open while you test; close it when you're done (nothing runs in the background
# otherwise). Edit $source below if your MetaTrader terminal ID folder differs.

$source = "C:\Users\Asus\AppData\Roaming\MetaQuotes\Terminal\1AF340F8DE8E6F423FD43A01B92AB736\StrategyTester.htm"
$destDir = "$env:USERPROFILE\Documents\MT4Reports"
$dest = Join-Path $destDir "StrategyTester.htm"

New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Write-Host "Mirroring:"
Write-Host "  $source"
Write-Host "  -> $dest"
Write-Host "Checking every 2 seconds. Press Ctrl+C to stop."
Write-Host ""

$lastWrite = $null
while ($true) {
    if (Test-Path $source) {
        $current = (Get-Item $source).LastWriteTimeUtc
        if ($current -ne $lastWrite) {
            Start-Sleep -Milliseconds 300 # let MT4 finish writing before we copy
            Copy-Item -Path $source -Destination $dest -Force
            $lastWrite = $current
            Write-Host "$(Get-Date -Format T)  copied StrategyTester.htm"
        }
    }
    Start-Sleep -Seconds 2
}
