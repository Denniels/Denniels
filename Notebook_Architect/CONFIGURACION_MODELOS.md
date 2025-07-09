# Configuración de Modelos IA - Notebook Architect

## 🚀 Proveedores Soportados

### 🖥️ LM Studio (Local)
- **Endpoint por defecto**: `http://localhost:1234/v1/chat/completions`
- **Requiere API Key**: No
- **Descripción**: Ejecuta modelos locales con LM Studio
- **Modelos sugeridos**: Qwen2.5-Coder, Llama, CodeLlama
- **Instalación**: Descargar desde [lmstudio.ai](https://lmstudio.ai)

### 🦙 Ollama (Local)
- **Endpoint por defecto**: `http://localhost:11434/api/chat`
- **Requiere API Key**: No
- **Descripción**: Ejecuta modelos locales con Ollama
- **Modelos sugeridos**: `llama3.1`, `qwen2.5-coder`, `codellama`, `mistral`
- **Instalación**: `curl -fsSL https://ollama.ai/install.sh | sh`

### 🤖 OpenAI (Nube)
- **Endpoint por defecto**: `https://api.openai.com/v1/chat/completions`
- **Requiere API Key**: Sí
- **Descripción**: API de OpenAI (GPT-4, GPT-3.5, etc.)
- **Modelos disponibles**: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`, `gpt-4o`
- **Obtener API Key**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 🧠 Anthropic Claude (Nube)
- **Endpoint por defecto**: `https://api.anthropic.com/v1/messages`
- **Requiere API Key**: Sí
- **Descripción**: API de Anthropic (Claude 3)
- **Modelos disponibles**: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
- **Obtener API Key**: [console.anthropic.com](https://console.anthropic.com)

### ⚙️ Endpoint Personalizado
- **Endpoint**: Configuración manual
- **Requiere API Key**: Configurable
- **Descripción**: Para otros servicios compatibles con OpenAI API

## 🔧 Configuración

1. Haz clic en **⚙️ Configurar** en el header
2. Selecciona tu proveedor preferido
3. Configura el endpoint (se detecta automáticamente para servicios locales)
4. Ingresa tu API Key si es necesario
5. Selecciona o ingresa el nombre del modelo
6. Ajusta los parámetros (temperatura, max tokens, etc.)
7. **Probar Conexión** para verificar que funciona
8. **Guardar** la configuración

## 💡 Consejos

- **Para uso local**: Recomendamos LM Studio o Ollama con modelos optimizados para código como Qwen2.5-Coder
- **Para uso en producción**: OpenAI GPT-4 o Claude 3 Sonnet ofrecen excelente calidad
- **Temperatura baja (0.1-0.3)**: Mejor para código y respuestas precisas
- **Temperatura alta (0.7-1.0)**: Mejor para creatividad y exploración
- **Max Tokens**: 2000-4000 es ideal para la mayoría de casos de uso

## 🛠️ Solución de Problemas

### Error de conexión local
- Verifica que LM Studio/Ollama esté ejecutándose
- Comprueba que el puerto esté correcto (1234 para LM Studio, 11434 para Ollama)
- Verifica que no haya firewall bloqueando las conexiones

### Error de API Key
- Verifica que la API Key sea válida y activa
- Asegúrate de tener créditos/cuota disponible
- Comprueba que la API Key tenga los permisos correctos

### Error de modelo no encontrado
- Verifica que el modelo esté disponible en tu proveedor
- Para servicios locales, asegúrate de que el modelo esté descargado
- Usa "Probar Conexión" para obtener la lista de modelos disponibles

## 📊 Comparación de Rendimiento

| Proveedor | Velocidad | Calidad | Costo | Privacidad |
|-----------|-----------|---------|-------|------------|
| LM Studio | ⚡⚡⚡ | ⭐⭐⭐ | 🟢 Gratis | 🟢 Local |
| Ollama | ⚡⚡⚡ | ⭐⭐⭐ | 🟢 Gratis | 🟢 Local |
| OpenAI | ⚡⚡ | ⭐⭐⭐⭐⭐ | 🟡 Pago | 🟡 Nube |
| Anthropic | ⚡⚡ | ⭐⭐⭐⭐⭐ | 🟡 Pago | 🟡 Nube |
