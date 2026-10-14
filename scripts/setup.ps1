$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$taskPython = (Get-ChildItem .runtime/python -Recurse -Filter python.exe | Select-Object -First 1).FullName
& .runtime/uv/uv.exe venv --python $taskPython .runtime/venv
if ($LASTEXITCODE -ne 0) { throw 'Virtual environment setup failed' }
& .runtime/uv/uv.exe pip install --python .runtime/venv/Scripts/python.exe -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed' }
