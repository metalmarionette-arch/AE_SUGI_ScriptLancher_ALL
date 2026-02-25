@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_PATH=%SCRIPT_DIR%install.ps1"

echo =====================================
echo AE_SUGI_ScriptLancher Installer (AE 2026)
echo =====================================
echo.

if not exist "%SCRIPT_PATH%" goto :missing

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%" -AeVersion 2026 -Force -NonInteractive -CleanInstall %*
set "EXITCODE=%ERRORLEVEL%"

echo.
if "%EXITCODE%"=="0" (
  echo Installation completed.
) else (
  echo Installation failed. Please read the messages above.
)

goto :end

:missing
echo install.ps1 was not found:
echo %SCRIPT_PATH%
set "EXITCODE=1"

:end
echo.
pause
exit /b %EXITCODE%
