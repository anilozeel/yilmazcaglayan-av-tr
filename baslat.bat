@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  node build.js
  start "" http://localhost:8080
  node server.js
) else (
  echo Node.js bulunamadi, Python ile baslatiliyor...
  start "" http://localhost:8080
  cd dist
  python -m http.server 8080
)
