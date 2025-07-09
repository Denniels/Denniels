#!/bin/bash
# Script de verificación de estado para Notebook Architect Web (Linux/macOS)

echo "🔧 Verificación de Estado - Notebook Architect Web"
echo "================================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar estado
show_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Verificar herramientas necesarias
echo -e "${BLUE}📋 Verificando herramientas...${NC}"
command -v python3 >/dev/null 2>&1
show_status $? "Python3 disponible"

command -v curl >/dev/null 2>&1
show_status $? "cURL disponible"

echo ""

# Verificar puertos
echo -e "${BLUE}🌐 Verificando puertos...${NC}"

# Puerto 1234 (LM Studio)
if nc -z localhost 1234 2>/dev/null; then
    echo -e "${GREEN}✅ Puerto 1234 (LM Studio): Abierto${NC}"
else
    echo -e "${RED}❌ Puerto 1234 (LM Studio): Cerrado${NC}"
fi

# Puerto 11434 (Ollama)
if nc -z localhost 11434 2>/dev/null; then
    echo -e "${GREEN}✅ Puerto 11434 (Ollama): Abierto${NC}"
else
    echo -e "${RED}❌ Puerto 11434 (Ollama): Cerrado${NC}"
fi

echo ""

# Verificar servicios
echo -e "${BLUE}🔗 Verificando servicios...${NC}"

# LM Studio
if curl -s http://localhost:1234/v1/models >/dev/null 2>&1; then
    echo -e "${GREEN}✅ LM Studio: Disponible${NC}"
    models=$(curl -s http://localhost:1234/v1/models | grep -o '"id":[^,]*' | wc -l)
    echo -e "   📊 Modelos cargados: $models"
else
    echo -e "${RED}❌ LM Studio: No disponible${NC}"
fi

# Ollama
if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama: Disponible${NC}"
    version=$(curl -s http://localhost:11434/api/version | grep -o '"version":"[^"]*' | cut -d'"' -f4)
    echo -e "   📊 Versión: $version"
    
    # Listar modelos de Ollama
    if command -v ollama >/dev/null 2>&1; then
        models=$(ollama list | tail -n +2 | wc -l)
        echo -e "   📊 Modelos instalados: $models"
    fi
else
    echo -e "${RED}❌ Ollama: No disponible${NC}"
fi

echo ""

# Verificar servidor web
echo -e "${BLUE}🌍 Verificando aplicación web...${NC}"
if curl -s http://localhost:8080 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor web en puerto 8080: Funcionando${NC}"
    echo -e "   🔗 Aplicación: http://localhost:8080"
    echo -e "   🔧 Debug: http://localhost:8080/debug.html"
else
    echo -e "${RED}❌ Servidor web en puerto 8080: No disponible${NC}"
    echo -e "${YELLOW}💡 Ejecuta: python3 -m http.server 8080${NC}"
fi

echo ""

# Instrucciones finales
echo -e "${BLUE}💡 Instrucciones:${NC}"
echo "1. Si LM Studio está ❌: Abre LM Studio → Local Server → Start Server"
echo "2. Si Ollama está ❌: Ejecuta 'ollama serve' en terminal"
echo "3. Si el servidor web está ❌: Ejecuta 'python3 -m http.server 8080'"
echo "4. Para diagnóstico avanzado: abre http://localhost:8080/debug.html"

echo ""
echo -e "${GREEN}🚀 ¡Todo listo? Abre http://localhost:8080 y comienza a crear!${NC}"