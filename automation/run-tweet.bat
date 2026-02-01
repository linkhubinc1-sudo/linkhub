@echo off
REM Close Brave first (Puppeteer needs exclusive access)
taskkill /f /im brave.exe >nul 2>&1
timeout /t 2 >nul
cd /d C:\Users\jamoo\projects\linkhub
call node automation/twitter-browser.js --tweet
REM Reopen Brave
start "" "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
