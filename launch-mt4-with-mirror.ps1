# Launches MT4 and, alongside it, the report-mirroring helper (mirror-report.ps1) — needed
# because Chrome hard-blocks the browser from reading files directly out of MT4's AppData /
# Program Files location (see README "If the file picker refuses your report"). The mirror runs
# hidden in the background only while MT4 is open, and stops automatically the moment you close
# MT4 — nothing keeps running afterward.
#
# Point a desktop shortcut at this script (instead of directly at MT4's terminal.exe) so opening
# MT4 the way you already do also starts the mirror, with no extra manual step.

$mt4Path = "C:\Program Files (x86)\MetaTrader 4 - Demo\terminal.exe"
$mirrorScript = Join-Path $PSScriptRoot "mirror-report.ps1"

$mirrorProcess = Start-Process powershell -ArgumentList @(
    "-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", "`"$mirrorScript`""
) -WindowStyle Hidden -PassThru

try {
    $mt4Process = Start-Process -FilePath $mt4Path -PassThru
    $mt4Process.WaitForExit()
} finally {
    if ($mirrorProcess -and -not $mirrorProcess.HasExited) {
        Stop-Process -Id $mirrorProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
