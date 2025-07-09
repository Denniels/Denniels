# Diagnóstico de Paquetes - Notebook Architect
# Script para verificar y solucionar problemas con paquetes Python

Write-Host "🔬 Diagnóstico de Paquetes Python - Notebook Architect" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package-diagnostics.html")) {
    Write-Host "❌ Error: No se encontró package-diagnostics.html" -ForegroundColor Red
    Write-Host "💡 Asegúrate de ejecutar desde el directorio raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Función para mostrar el estado
function Show-Status {
    param($Message, $Status)
    if ($Status -eq "OK") {
        Write-Host "✅ $Message" -ForegroundColor Green
    } elseif ($Status -eq "WARNING") {
        Write-Host "⚠️ $Message" -ForegroundColor Yellow
    } else {
        Write-Host "❌ $Message" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔍 Verificando archivos del sistema..." -ForegroundColor Yellow

# Verificar archivos clave
$requiredFiles = @(
    "scripts/package-manager.js",
    "scripts/python-executor-clean.js",
    "scripts/data-ui.js",
    "index.html"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Show-Status "Archivo encontrado: $file" "OK"
    } else {
        Show-Status "Archivo faltante: $file" "ERROR"
    }
}

Write-Host ""
Write-Host "🌐 Iniciando servidor de diagnóstico..." -ForegroundColor Yellow

# Verificar si Python está disponible
$pythonAvailable = $false
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python") {
        Show-Status "Python disponible: $pythonVersion" "OK"
        $pythonAvailable = $true
    }
} catch {
    Show-Status "Python no encontrado" "WARNING"
}

# Verificar si Node.js está disponible
$nodeAvailable = $false
try {
    $nodeVersion = node --version 2>&1
    if ($nodeVersion -match "v") {
        Show-Status "Node.js disponible: $nodeVersion" "OK"
        $nodeAvailable = $true
    }
} catch {
    Show-Status "Node.js no encontrado" "WARNING"
}

Write-Host ""
Write-Host "🚀 Opciones de servidor disponibles:" -ForegroundColor Cyan

if ($pythonAvailable) {
    Write-Host "1. Servidor Python (recomendado)" -ForegroundColor Green
    Write-Host "   python -m http.server 8000" -ForegroundColor Gray
}

if ($nodeAvailable) {
    Write-Host "2. Servidor Node.js" -ForegroundColor Green
    Write-Host "   npx http-server -p 8000" -ForegroundColor Gray
}

Write-Host "3. Servidor manual" -ForegroundColor Yellow
Write-Host "   Abre package-diagnostics.html directamente en el navegador" -ForegroundColor Gray

Write-Host ""
$choice = Read-Host "Selecciona una opción (1-3) o presiona Enter para usar Python"

switch ($choice) {
    "1" {
        if ($pythonAvailable) {
            Write-Host "🌐 Iniciando servidor Python en puerto 8000..." -ForegroundColor Green
            Write-Host "📊 Abre http://localhost:8000/package-diagnostics.html" -ForegroundColor Cyan
            python -m http.server 8000
        } else {
            Write-Host "❌ Python no está disponible" -ForegroundColor Red
        }
    }
    "2" {
        if ($nodeAvailable) {
            Write-Host "🌐 Iniciando servidor Node.js en puerto 8000..." -ForegroundColor Green
            Write-Host "📊 Abre http://localhost:8000/package-diagnostics.html" -ForegroundColor Cyan
            npx http-server -p 8000
        } else {
            Write-Host "❌ Node.js no está disponible" -ForegroundColor Red
        }
    }
    "3" {
        $fullPath = Resolve-Path "package-diagnostics.html"
        Write-Host "📊 Abriendo archivo en navegador..." -ForegroundColor Green
        Start-Process $fullPath
    }
    default {
        if ($pythonAvailable) {
            Write-Host "🌐 Iniciando servidor Python por defecto..." -ForegroundColor Green
            Write-Host "📊 Abre http://localhost:8000/package-diagnostics.html" -ForegroundColor Cyan
            python -m http.server 8000
        } else {
            Write-Host "❌ Python no está disponible, abriendo archivo..." -ForegroundColor Yellow
            $fullPath = Resolve-Path "package-diagnostics.html"
            Start-Process $fullPath
        }
    }
}

Write-Host ""
Write-Host "🎯 Diagnóstico completado!" -ForegroundColor Green
Write-Host "💡 Si hay problemas, revisa el log en la página de diagnóstico" -ForegroundColor Yellow
