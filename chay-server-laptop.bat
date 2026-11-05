@echo off
chcp 65001 >nul
title May Chu Co Dai Mat Ma - Pixel Puzzle Quest (Port 3000)
echo ================================================================
echo   KHOI DONG MAY CHU GAME TREN LAPTOP (PING THAP ~5-15ms)
echo ================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Laptop chua cai dat Node.js!
    echo Vui long tai va cai Node.js LTS tai: https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/3] Dang cai dat thu vien lan dau...
    call npm install --legacy-peer-deps
)

if not exist "dist\index.html" (
    echo [2/3] Dang dong goi do hoa Pixel va am thanh...
    call npm run build
)

echo.
echo [3/3] May chu dang chay tai:
echo   - Tren laptop nay: http://localhost:3000
echo   - Neu da bat Cloudflare Tunnel: https://game.hoangnhattuan.click
echo.
echo (De mo ket noi ra Internet voi ten mien game.hoangnhattuan.click,
echo  mo them 1 cua so CMD va chay: cloudflared tunnel run game-laptop)
echo ================================================================
set NODE_ENV=production
set PORT=3000
call npx tsx server.ts
pause
