@echo off
chcp 65001 >nul
title May Chu Laptop - Co Dai Mat Ma (Tu Dong Lien Ket Render 24/7)
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"

echo ================================================================
echo   KHOI DONG MAY CHU GAME TREN LAPTOP (PING THAP ~5-15ms)
echo   Tu dong ket noi voi game.hoangnhattuan.click (iNET + Render)
echo ================================================================
echo.

if not exist "server-standalone.cjs" (
    echo [1/2] Dang cai dat thu vien va dong goi lan dau...
    call npm install --legacy-peer-deps
    call npm run build
)

echo [Khoi chay] Dang bat May Chu Laptop va lien ket tu dong voi Render...
node laptop-bridge.mjs
pause
