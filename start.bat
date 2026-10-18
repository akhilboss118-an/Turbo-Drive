@echo off
cd /d "%~dp0server"
pip install -r requirements.txt
uvicorn shoot_server:app --host 0.0.0.0 --port 8001
