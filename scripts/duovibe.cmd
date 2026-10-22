@echo off
REM Double-click friendly wrapper: bypasses the execution policy for this run only.
REM Usage:  duovibe.cmd doctor
REM         duovibe.cmd verify
REM         duovibe.cmd dev
setlocal
set SCRIPT=%~dp0duovibe.ps1
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=doctor
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %COMMAND%
if "%~1"=="" pause
endlocal
