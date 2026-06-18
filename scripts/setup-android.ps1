param(
    [string]$SdkPath = "$env:LOCALAPPDATA\Android\Sdk"
)

Write-Host "=== Android SDK Setup for Turbo Drive ===" -ForegroundColor Cyan
Write-Host ""

# Check Java
Write-Host "[1/4] Checking Java 17+" -ForegroundColor Yellow
$javaTest = java -version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Java 17+ not found!" -ForegroundColor Red
    Write-Host "Download from: https://adoptium.net/temurin/releases/?version=17"
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

# Download command-line tools
$toolsZip = "$env:TEMP\cmdline-tools.zip"
if (-not (Test-Path $toolsZip)) {
    Write-Host "[2/4] Downloading Android command-line tools..." -ForegroundColor Yellow
    $url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    Invoke-WebRequest -Uri $url -OutFile $toolsZip -UseBasicParsing
    Write-Host "  Downloaded" -ForegroundColor Green
} else {
    Write-Host "[2/4] Android command-line tools already downloaded" -ForegroundColor Yellow
}

# Extract
Write-Host "[3/4] Extracting to $SdkPath..." -ForegroundColor Yellow
$extractDir = "$env:TEMP\android-cmdline-tools"
Expand-Archive -Path $toolsZip -DestinationPath $extractDir -Force

# Create proper directory structure
Remove-Item -Path "$SdkPath\cmdline-tools\latest" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -Path "$SdkPath\cmdline-tools\latest" -ItemType Directory -Force | Out-Null
Move-Item -Path "$extractDir\cmdline-tools\*" -Destination "$SdkPath\cmdline-tools\latest\" -Force
Write-Host "  Extracted" -ForegroundColor Green

# Set ANDROID_HOME
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $SdkPath, "User")
$env:ANDROID_HOME = $SdkPath

# Install required SDK packages
Write-Host "[4/4] Installing required Android SDK packages..." -ForegroundColor Yellow
$sdkManager = "$SdkPath\cmdline-tools\latest\bin\sdkmanager.bat"
if (Test-Path $sdkManager) {
    & $sdkManager --sdk_root=$SdkPath "platforms;android-34" "build-tools;34.0.0"
    Write-Host "  SDK packages installed" -ForegroundColor Green
} else {
    Write-Host "  WARNING: sdkmanager not found at $sdkManager" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Android SDK setup complete!" -ForegroundColor Cyan
Write-Host "Now run: npm run android:build"
