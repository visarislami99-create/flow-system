@echo off
set GIT="C:\Users\PcUser3\AppData\Local\GitHubDesktop\app-3.5.8\resources\app\git\cmd\git.exe"
cd /d "C:\Users\PcUser3\Desktop\autoflows-consulting\autoflows-consulting"
%GIT% add components/Copy.tsx app/globals.css tailwind.config.ts
%GIT% commit -m "Mobile: responsive layout for all viewports"
%GIT% push origin main
echo.
echo Done! Vercel will auto-deploy. Press any key to close.
pause
