@echo off
chcp 65001 >nul
cd /d "%~dp0"

where py >nul 2>&1
if %errorlevel%==0 (
  py -3 "%~dp0git_commit_helper.py"
  if errorlevel 1 goto :failed
  goto :eof
)

where python >nul 2>&1
if %errorlevel%==0 (
  python "%~dp0git_commit_helper.py"
  if errorlevel 1 goto :failed
  goto :eof
)

echo 未找到 Python。请先安装 Python 3，并勾选 "Add python.exe to PATH"。
pause
goto :eof

:failed
echo.
echo 工具异常退出。若刚弹出错误窗口，请看其中的 Git 输出。
echo 详细记录：%~dp0git_commit_last_error.txt
pause
