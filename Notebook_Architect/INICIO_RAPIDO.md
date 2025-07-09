# 🚀 Guía Rápida - Notebook Architect Web

## ⚡ Inicio Rápido (5 minutos)

### 1. Configura un Modelo Local

#### Opción A: LM Studio (Recomendado para principiantes)
1. Descarga LM Studio desde: https://lmstudio.ai
2. Instala y abre la aplicación
3. Ve a la pestaña "Discover" y descarga un modelo (ej: `phi-3-mini-4k-instruct`)
4. Ve a "Local Server" → "Start Server" (puerto 1234)
5. ✅ Listo!

#### Opción B: Ollama (Para usuarios avanzados)
1. Instala Ollama desde: https://ollama.com
2. Abre terminal y ejecuta:
   ```bash
   ollama pull llama3.2
   ollama serve
   ```
3. ✅ Listo!

### 2. Ejecuta la Aplicación
```bash
# En el directorio del proyecto
python -m http.server 8080
```

### 3. Abre en el Navegador
- **Aplicación principal**: http://localhost:8080
- **Página de diagnóstico**: http://localhost:8080/debug.html

## 🔧 Si algo no funciona...

### Paso 1: Diagnóstico Automático
1. **Windows**: Ejecuta `.\diagnostico.ps1`
2. **Web**: Abre http://localhost:8080/debug.html

### Paso 2: Verificaciones Manuales
```bash
# Verificar LM Studio
curl http://localhost:1234/v1/models

# Verificar Ollama
curl http://localhost:11434/api/version
```

### Paso 3: Problemas Comunes

| ❌ Error | ✅ Solución |
|----------|-------------|
| "No se puede conectar" | Asegúrate de que LM Studio/Ollama esté ejecutándose |
| "Failed to fetch" | Usa un servidor local (no abras el HTML directamente) |
| "CORS error" | Verifica que uses `http://localhost:8080` |
| "Sin respuesta" | Confirma que hay un modelo cargado |

## 💡 Consejos

- **Modelos recomendados**: phi-3-mini (rápido), llama3.2 (mejor calidad)
- **RAM necesaria**: Mínimo 8GB, recomendado 16GB
- **Navegadores**: Chrome, Firefox, Edge (actualizados)
- **SO**: Windows 10+, macOS 10.14+, Linux Ubuntu 18+

## 🎯 Primeros Pasos

1. **Verifica la conexión**: El estado debe mostrar "✅ Agente disponible"
2. **Crea tu primer notebook**: Botón "Nuevo Notebook"
3. **Prueba el agente**: Escribe "Hola, crea un gráfico simple con matplotlib"
4. **Explora**: Agrega celdas, ejecuta código Python, crea visualizaciones

## 📞 ¿Necesitas Ayuda?

- 📖 **Documentación completa**: Ver README.md
- 🔧 **Diagnóstico avanzado**: http://localhost:8080/debug.html
- 🐛 **Reportar problemas**: Crea un issue en GitHub
- 💬 **Chat con el agente**: Una vez conectado, pregunta cualquier cosa

---

**¡En 5 minutos ya deberías estar creando notebooks con IA!** 🎉