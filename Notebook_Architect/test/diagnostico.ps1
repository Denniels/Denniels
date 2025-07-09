# Script de diagnóstico para Notebook Architect Web
# Verifica el estado de LM Studio y Ollama

Write-Host "🔧 Diagnóstico de Notebook Architect Web" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Función para probar conectividad
function Test-Service {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Timeout = 5
    )
    
    try {
        Write-Host "🔍 Probando $Name..." -ForegroundColor Yellow
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $Timeout -UseBasicParsing
        Write-Host "✅ $Name está disponible (Status: $($response.StatusCode))" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ $Name no está disponible: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Función para probar puerto específico
function Test-Port {
    param(
        [string]$ComputerName = "localhost",
        [int]$Port
    )
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.ConnectAsync($ComputerName, $Port)
        
        if ($connect.Wait(3000)) {
            $tcpClient.Close()
            return $true
        } else {
            return $false
        }
    }
    catch {
        return $false
    }
}

# Verificar procesos ejecutándose
Write-Host "📊 Verificando procesos..." -ForegroundColor Magenta
$lmstudioProcess = Get-Process | Where-Object {$_.ProcessName -like "*lm*studio*" -or $_.ProcessName -like "*lms*"}
$ollamaProcess = Get-Process | Where-Object {$_.ProcessName -like "*ollama*"}

if ($lmstudioProcess) {
    Write-Host "✅ Proceso LM Studio encontrado: $($lmstudioProcess.ProcessName)" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró proceso de LM Studio ejecutándose" -ForegroundColor Red
}

if ($ollamaProcess) {
    Write-Host "✅ Proceso Ollama encontrado: $($ollamaProcess.ProcessName)" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró proceso de Ollama ejecutándose" -ForegroundColor Red
}

Write-Host ""

# Verificar puertos
Write-Host "🌐 Verificando puertos..." -ForegroundColor Magenta
$port1234 = Test-Port -Port 1234
$port11434 = Test-Port -Port 11434

Write-Host "Puerto 1234 (LM Studio): $(if($port1234){'✅ Abierto'}else{'❌ Cerrado'})" -ForegroundColor $(if($port1234){'Green'}else{'Red'})
Write-Host "Puerto 11434 (Ollama): $(if($port11434){'✅ Abierto'}else{'❌ Cerrado'})" -ForegroundColor $(if($port11434){'Green'}else{'Red'})

Write-Host ""

# Probar servicios web
Write-Host "🔗 Probando endpoints..." -ForegroundColor Magenta
$lmstudioAvailable = Test-Service -Name "LM Studio" -Url "http://localhost:1234/v1/models"
$ollamaAvailable = Test-Service -Name "Ollama" -Url "http://localhost:11434/api/version"

Write-Host ""

# Instrucciones de solución
Write-Host "💡 Instrucciones de solución:" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

if (-not $lmstudioAvailable) {
    Write-Host ""
    Write-Host "Para LM Studio:" -ForegroundColor Yellow
    Write-Host "1. Abre LM Studio"
    Write-Host "2. Ve a la pestaña 'Local Server'"
    Write-Host "3. Carga un modelo (descarga uno si no tienes)"
    Write-Host "4. Haz clic en 'Start Server'"
    Write-Host "5. Verifica que el puerto sea 1234"
}

if (-not $ollamaAvailable) {
    Write-Host ""
    Write-Host "Para Ollama:" -ForegroundColor Yellow
    Write-Host "1. Instala Ollama desde https://ollama.com"
    Write-Host "2. Abre una terminal y ejecuta: ollama pull llama3.2"
    Write-Host "3. Ejecuta: ollama serve"
    Write-Host "4. Verifica que el puerto sea 11434"
}

Write-Host ""
Write-Host "🌐 Para probar la conectividad, abre:" -ForegroundColor Cyan
Write-Host "http://localhost:8080/debug.html" -ForegroundColor Blue
Write-Host ""

# Mostrar comandos útiles
Write-Host "📋 Comandos útiles:" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Ver procesos: Get-Process | Where-Object {`$_.ProcessName -like '*ollama*' -or `$_.ProcessName -like '*lm*'}"
Write-Host "Matar Ollama: taskkill /f /im ollama.exe"
Write-Host "Reiniciar Ollama: ollama serve"
Write-Host "Listar modelos Ollama: ollama list"
Write-Host ""

Read-Host "Presiona Enter para continuar..."