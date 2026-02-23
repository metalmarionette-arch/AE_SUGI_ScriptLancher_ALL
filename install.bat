@echo off
setlocal

set SCRIPT_DIR=%~dp0
set SCRIPT_PATH=%SCRIPT_DIR%install.ps1

echo ================================
echo AE_SUGI_ScriptLancher Installer
echo ================================
echo.

if not exist "%SCRIPT_PATH%" (
  echo install.ps1 が見つかりません: %SCRIPT_PATH%
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%" %*
set EXITCODE=%ERRORLEVEL%

echo.
if %EXITCODE% neq 0 (
  echo インストールに失敗しました。上のエラー内容を確認してください。
) else (
  echo インストールが完了しました。
)

echo.
pause
exit /b %EXITCODE%
