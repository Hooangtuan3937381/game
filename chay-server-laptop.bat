@echo off
chcp 65001 >nul
title May Chu Laptop - Co Dai Mat Ma (Tu Dong Lien Ket Render 24/7)
echo ================================================================
echo   KHOI DONG MAY CHU GAME TREN LAPTOP (PING THAP ~5-15ms)
echo   Tu dong ket noi voi game.hoangnhattuan.click (iNET + Render)
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

echo [3/3] Dang bat May Chu Laptop va lien ket tu dong voi Render...
call node laptop-bridge.mjs
pause
