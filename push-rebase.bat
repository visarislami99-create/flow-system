@echo off
cd /d "C:\Users\PcUser3\Desktop\autoflows-consulting\autoflows-consulting"

set GIT="C:\Users\PcUser3\AppData\Local\GitHubDesktop\app-3.5.8\resources\app\git\cmd\git.exe"

echo === Pulling remote changes (rebase) ===
%GIT% pull --rebase origin main

echo === Pushing ===
%GIT% push origin main

echo.
echo Done! Press any key to close.
pause
