@echo off
chcp 65001 >nul
title May Chu Laptop - Co Dai Mat Ma (Tu Dong Lien Ket Render 24/7)

if exist "cloudflared.exe" (
    for %%A in ("cloudflared.exe") do (
        if %%~zA LSS 10000000 (
            echo [Tu dong sua loi] Dang xoa file cloudflared.exe bi hong...
            del /f /q "cloudflared.exe"
        )
    )
)

node laptop-bridge.mjs
pause
