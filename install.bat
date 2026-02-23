@echo off
setlocal

set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install.ps1" %*

if %ERRORLEVEL% neq 0 (
  echo.
  echo インストールに失敗しました。エラー内容を確認してください。
  exit /b %ERRORLEVEL%
)

echo.
echo インストールが完了しました。
endlocal
