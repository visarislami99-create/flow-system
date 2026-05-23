@echo off
for /d %%i in ("C:\Users\PcUser3\AppData\Local\GitHubDesktop\app-*") do set GHDIR=%%i
echo Using GitHub Desktop git from: %GHDIR%
"%GHDIR%\resources\app\git\cmd\git.exe" -C "C:\Users\PcUser3\Desktop\autoflows-consulting\autoflows-consulting" add -A
"%GHDIR%\resources\app\git\cmd\git.exe" -C "C:\Users\PcUser3\Desktop\autoflows-consulting\autoflows-consulting" commit -m "feat: rapier physics coin, minimal copy, simplified camera dolly"
"%GHDIR%\resources\app\git\cmd\git.exe" -C "C:\Users\PcUser3\Desktop\autoflows-consulting\autoflows-consulting" push
echo.
echo Done! Press any key to close.
pause
