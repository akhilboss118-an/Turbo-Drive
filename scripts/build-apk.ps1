param(
    [switch]$SkipJavaCheck
)

Write-Host "=== Turbo Drive - APK Build Script ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check Java
if (-not $SkipJavaCheck) {
    Write-Host "[1/5] Checking Java 17+" -ForegroundColor Yellow
    $javaVersion = java -version 2>&1
    if ($LASTEXITCODE -ne 0 -or (-not $javaVersion)) {
        Write-Host "ERROR: Java 17+ is required. Install from:" -ForegroundColor Red
        Write-Host "  https://adoptium.net/temurin/releases/?version=17"
        exit 1
    }
    Write-Host "  Java found: $javaVersion" -ForegroundColor Green
}

# 2. Check ANDROID_HOME
Write-Host "[2/5] Checking Android SDK" -ForegroundColor Yellow
if (-not $env:ANDROID_HOME) {
    $defaultSdk = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $defaultSdk) {
        $env:ANDROID_HOME = $defaultSdk
    } else {
        Write-Host "WARNING: ANDROID_HOME not set." -ForegroundColor Yellow
        Write-Host "  Install Android Studio or set ANDROID_HOME manually."
        Write-Host "  Continuing anyway..."
    }
}
if ($env:ANDROID_HOME) {
    Write-Host "  ANDROID_HOME = $env:ANDROID_HOME" -ForegroundColor Green
}

# 3. Install npm dependencies
Write-Host "[3/5] Installing npm dependencies" -ForegroundColor Yellow
npm install
Write-Host "  Done" -ForegroundColor Green

# 4. Sync Capacitor
Write-Host "[4/5] Syncing Capacitor web assets to Android" -ForegroundColor Yellow
npx cap sync android
Write-Host "  Done" -ForegroundColor Green

# 5. Build APK
Write-Host "[5/5] Building APK (this may take a while)..." -ForegroundColor Yellow
# Unset JAVA_HOME to avoid using the wrong directory
if ($env:JAVA_HOME) {
    Write-Host "  Unsetting JAVA_HOME to avoid using wrong directory" -ForegroundColor Yellow
    Remove-Item env:JAVA_HOME
}
Push-Location android
try {
    .\gradlew.bat assembleDebug --no-daemon
    if ($LASTEXITCODE -eq 0) {
        $apk = Get-ChildItem -Path "app\build\outputs\apk\debug" -Filter "*.apk" | Select-Object -First 1
        if ($apk) {
            $dest = Join-Path (Resolve-Path "..") "dist-electron\Turbo-Drive-1.0.0.apk"
            Copy-Item -Path $apk.FullName -Destination $dest -Force
            Write-Host "APK built successfully: $dest" -ForegroundColor Green
            Write-Host "  Size: $('{0:N2} MB' -f ($apk.Length / 1MB))" -ForegroundColor Green
        }
    } else {
        Write-Host "ERROR: Gradle build failed" -ForegroundColor Red
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== Build complete! ===" -ForegroundColor Cyan
