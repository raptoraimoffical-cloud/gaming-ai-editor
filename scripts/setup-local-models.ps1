$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.runtime\ollama'
$modelRoot = Join-Path $projectRoot '.runtime\ollama-models'
$logRoot = Join-Path $projectRoot 'workspace\local-models'
New-Item -ItemType Directory -Force -Path $runtimeRoot,$modelRoot,$logRoot | Out-Null
$executable = Join-Path $runtimeRoot 'ollama.exe'
if (!(Test-Path -LiteralPath $executable)) {
    $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/ollama/ollama/releases/latest'
    $asset = $release.assets | Where-Object name -eq 'ollama-windows-amd64.zip'
    if (!$asset -or $asset.size -gt 2200000000) { throw 'Unexpected portable runtime release; inspect its download size first.' }
    $archive = Join-Path $runtimeRoot 'portable.zip'
    Write-Output "Downloading official portable Ollama $($release.tag_name), $([Math]::Round($asset.size/1MB)) MB"
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -UseBasicParsing -Uri $asset.browser_download_url -OutFile $archive
    if ($asset.digest -and $asset.digest.StartsWith('sha256:')) {
        $expected = $asset.digest.Substring(7)
        if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'Runtime checksum mismatch' }
    }
    Expand-Archive -LiteralPath $archive -DestinationPath $runtimeRoot -Force
    $release | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $logRoot 'runtime-release.json') -Encoding UTF8
}
# These variables apply to this process and its child only, never Windows settings.
$env:OLLAMA_HOST = '127.0.0.1:11535'
$env:OLLAMA_MODELS = $modelRoot
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
$env:OLLAMA_KEEP_ALIVE = '0'
$env:OLLAMA_CONTEXT_LENGTH = '4096'
$ready = $false
try { $null = Invoke-RestMethod -Uri 'http://127.0.0.1:11535/api/version'; $ready = $true } catch {}
if (!$ready) {
    $process = Start-Process -FilePath $executable -ArgumentList 'serve' -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot 'server-out.log') -RedirectStandardError (Join-Path $logRoot 'server-error.log')
    $process.Id | Set-Content -LiteralPath (Join-Path $logRoot 'server.pid')
    for ($i=0; $i -lt 60; $i++) {
        try { $null = Invoke-RestMethod -Uri 'http://127.0.0.1:11535/api/version'; $ready = $true; break } catch { Start-Sleep -Seconds 1 }
    }
    if (!$ready) { throw 'Portable model server did not start; check workspace/local-models/server-error.log' }
}
foreach ($modelName in @('qwen3.5:4b','qwen3.5:2b-q4_K_M')) {
    Write-Output "Downloading/verifying authorized model: $modelName"
    $response = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:11535/api/pull' -ContentType 'application/json' -Body (@{model=$modelName;stream=$false} | ConvertTo-Json) -TimeoutSec 3600
    if ($response.status -ne 'success') { throw "Model pull failed: $modelName" }
    Write-Output "Model ready: $modelName"
}
Invoke-RestMethod -Uri 'http://127.0.0.1:11535/api/tags' | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $logRoot 'installed-models.json') -Encoding UTF8
Write-Output 'Portable runtime and actual local models ready. No Windows PATH, service, driver, or firewall settings were changed.'
$configuration = @{url='http://127.0.0.1:11535';models=@{reasoning='qwen3.5:4b';planning='qwen3.5:2b-q4_K_M';vision='qwen3.5:2b-q4_K_M';review='qwen3.5:2b-q4_K_M'};contextLength=4096;processingPreference='auto';memoryLimitGB=16;candidateLimit=12;alternatives=2;reviewPasses=2;maxRevisions=2;keepAliveSeconds=120;compactLayouts=$true}
$settingsFile=Join-Path $projectRoot 'workspace/local-ai-settings.json'
if (Test-Path -LiteralPath $settingsFile) { $previous=Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json; foreach($property in $previous.PSObject.Properties){if (!$configuration.ContainsKey($property.Name)){$configuration[$property.Name]=$property.Value}} }
[IO.File]::WriteAllText($settingsFile,($configuration | ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false))
Write-Output 'Ultra configured: 4B reasoning and laptop-friendly 2B Q4 planning/vision.'
