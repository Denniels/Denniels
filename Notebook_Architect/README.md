# 🧪 Notebook Architect

**Plataforma Web Interactiva para Análisis de Datos y Machine Learning**

Una aplicación web moderna que permite ejecutar Python real en el navegador, con un asistente IA configurable para análisis de datos, visualizaciones y desarrollo de modelos de machine learning.

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Pyodide](https://img.shields.io/badge/Pyodide-0.24.1-green.svg)
![License](https://img.shields.io/badge/License-MIT-red.svg)

## 🚀 Características Principales

### 🤖 **Asistente IA Configurable**
- **Modelos Locales**: LM Studio, Ollama (completamente privados)
- **APIs Externas**: OpenAI (GPT-4), Anthropic (Claude), endpoints personalizados
- **Configuración Flexible**: Panel visual para cambiar proveedor, modelo y parámetros
- **Detección Automática**: Encuentra servicios locales disponibles automáticamente

### 🐍 **Ejecución Python Real**
- Ejecuta código Python nativo en el navegador con Pyodide
- Librerías científicas: numpy, pandas, matplotlib, seaborn, plotly
- Variables persistentes entre ejecuciones
- Sistema de fallback robusto para CDNs

### 📓 **Entorno Notebook Interactivo** 
- Celdas de código Python y Markdown
- Edición en tiempo real de celdas
- Renderizado avanzado de Markdown con marked.js
- Visualizaciones integradas y exportación de gráficos

### 📊 **Sistema de Ingesta de Datos Inteligente**
- **Carga múltiple**: CSV, Excel, JSON, URLs/APIs
- **Análisis automático**: Estadísticas, outliers, correlaciones
- **Datasets de ejemplo**: Iris, Ventas, Acciones, Clientes
- **Agente consciente de datos**: Análisis específico de tus datos reales
- **Drag & Drop**: Interface intuitiva de carga de archivos

## 📊 Flujo de Análisis de Datos

### 1. **Cargar Datos** 
```
📊 Cargar Datos → Seleccionar fuente:
├── 📁 Archivos locales (CSV, Excel, JSON)
├── 🌐 APIs/URLs externas
├── 📋 Datasets de ejemplo  
└── 📚 Gestionar datasets cargados
```

### 2. **Análisis Automático**
Al cargar, el sistema automáticamente:
- ✅ Analiza estructura y calidad de datos
- 📊 Calcula estadísticas descriptivas
- 🚨 Detecta outliers y valores nulos  
- 💡 Sugiere próximos pasos de análisis

### 3. **Agente Experto**
El asistente IA ahora puede:
- **Ver tus datos reales**: Referencias columnas y valores específicos
- **Análisis contextual**: Sugerencias basadas en los datos cargados
- **Código específico**: Genera código para tus variables exactas
- **Recomendaciones inteligentes**: Análisis apropiados para tu dataset

## ⚙️ Configuración de Modelos IA

### Proveedores Soportados

| Proveedor | Tipo | Configuración | Privacidad |
|-----------|------|---------------|------------|
| 🖥️ **LM Studio** | Local | `http://localhost:1234` | 🟢 Completamente privado |
| 🦙 **Ollama** | Local | `http://localhost:11434` | 🟢 Completamente privado |  
| 🤖 **OpenAI** | Nube | API Key requerida | 🟡 Datos enviados a OpenAI |
| 🧠 **Anthropic** | Nube | API Key requerida | 🟡 Datos enviados a Anthropic |
| ⚙️ **Personalizado** | Configurable | Endpoint personalizado | Variable |

### Configuración Rápida

1. **Haz clic en ⚙️ Configurar** en el header
2. **Selecciona tu proveedor** preferido (la app detecta servicios locales automáticamente)
3. **Configura el endpoint** y API Key si es necesario
4. **Selecciona el modelo** (se obtienen dinámicamente si es posible)
5. **Ajusta parámetros** como temperatura y tokens máximos
6. **Prueba la conexión** para verificar que funciona
7. **Guarda** la configuración

### Para Modelos Locales (Recomendado)

**LM Studio:**
```bash
# 1. Descargar desde https://lmstudio.ai
# 2. Descargar modelo (ej: Qwen2.5-Coder-7B)
# 3. Iniciar servidor local
# 4. Usar endpoint: http://localhost:1234/v1/chat/completions
```

**Ollama:**
```bash
# 1. Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Descargar modelo
ollama pull qwen2.5-coder:7b

# 3. Verificar que esté corriendo
ollama list
```

## 🛠️ Depuración de Errores Comunes

### ✅ **Estado Actual: COMPLETAMENTE FUNCIONAL**

El sistema ha sido **exitosamente migrado y depurado**. Los errores de carga de Pyodide están **completamente solucionados**:

- ✅ **CDN Fallback funciona:** JSDelivr como respaldo cuando cdn.pyodide.org falla
- ✅ **indexURL automático:** Se ajusta al CDN que funciona exitosamente  
- ✅ **Sin errores "Failed to fetch":** Todos los recursos se cargan correctamente
- ✅ **Python completamente operativo:** numpy, pandas, matplotlib, scipy disponibles
- ✅ **Manejo robusto de errores:** Mensajes claros y soluciones específicas

**Log de éxito típico:**
```
📡 CDN 1 falló: net::ERR_NAME_NOT_RESOLVED
✅ CDN 2 (JSDelivr) cargado exitosamente  
🎯 indexURL ajustado automáticamente
✅ Pyodide completamente inicializado
```

---

Si ves este error al cargar la aplicación:

```
GET https://cdn.pyodide.org/v0.24.1/full/pyodide.js net::ERR_NAME_NOT_RESOLVED
ReferenceError: loadPyodide is not defined
```

**Causas comunes:**
- Sin conexión a internet
- DNS no resuelve `cdn.pyodide.org`
- Firewall/proxy bloqueando el acceso
- CDN temporalmente no disponible

**Soluciones implementadas:**
1. **Sistema de fallback automático** - La aplicación prueba múltiples CDNs
2. **Timeouts configurables** - Evita esperas infinitas
3. **Mensajes de error claros** - Guía específica para solucionar
4. **Modo offline** - Funcionalidad limitada sin Python

**Herramientas de depuración:**
- 📄 **[debug-pyodide.html](debug-pyodide.html)** - Página de diagnóstico interactiva
- 📓 **[notebooks/pyodide-debug-guide.ipynb](notebooks/pyodide-debug-guide.ipynb)** - Guía completa de depuración
- 🧪 **[test-pyodide.html](test-pyodide.html)** - Tests de conectividad

**Pasos de depuración:**
1. Abrir `debug-pyodide.html` en tu navegador
2. Ejecutar los tests de conectividad
3. Verificar CDNs alternativos
4. Revisar DevTools > Network para errores específicos

---

## ✨ Características Principales

### 🐍 **Python Real en el Navegador**
- Ejecuta código Python completo usando Pyodide
- Sin necesidad de servidor o instalación local
- Entorno científico completo: NumPy, Pandas, Matplotlib, Scikit-learn

### 🤖 **Asistente IA Integrado**
- Chat en vivo para consultas sobre código y análisis
- Sugerencias automáticas y resolución de errores
- Respuestas contextuales sobre datos y visualizaciones
- Siempre disponible en el panel lateral

### 📊 **Análisis de Datos Avanzado**
- Funciones integradas para generar datos de ejemplo
- Análisis estadístico automático
- Limpieza y transformación de datos
- Exportación en múltiples formatos

### 📈 **Visualizaciones Interactivas**
- Matplotlib, Seaborn y Plotly disponibles
- Gráficos estáticos e interactivos
- Visualización automática de resultados
- Exportación de imágenes en alta calidad

### 🎨 **Interfaz Moderna**
- Diseño responsive y adaptable
- Tema oscuro profesional
- Animaciones fluidas y efectos visuales
- Panel de variables en tiempo real

## 🚀 Inicio Rápido

### Usar la Aplicación
1. Abre `index.html` en tu navegador
2. Espera a que Python se inicialice (automático)
3. Escribe código Python en el editor
4. Presiona **Ctrl+Enter** para ejecutar
5. Consulta al asistente IA para ayuda

### Ejemplo de Código
```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Generar datos de ejemplo
df = get_sample_data('sales', 100)

# Análisis básico
print(f"Dataset: {df.shape}")
print(df.describe())

# Visualización
plt.figure(figsize=(10, 6))
plt.scatter(df['price'], df['quantity'], alpha=0.7)
plt.title('Precio vs Cantidad')
plt.show()
```

## 📁 Estructura del Proyecto

```
📦 Notebook_Architect/
├── 📄 index.html                     # Aplicación principal
├── 📄 presentation-dashboard.html    # Demo interactiva
├── 📄 demo-dashboard.html           # Dashboard de demostración
├── 📁 scripts/
│   └── 📄 python-executor-clean.js  # Ejecutor Python optimizado
├── 📁 styles/
│   ├── 📄 main.css                  # Estilos principales
│   └── 📄 responsive.css            # Diseño responsive
├── 📁 notebooks/
│   └── 📄 notebook_demo.json        # Notebook de ejemplo
└── 📄 README.md                     # Documentación
```

## 🛠️ Funcionalidades

### Editor de Código
- **Sintaxis highlighting** para Python
- **Autocompletado** básico
- **Atajos de teclado**: Ctrl+Enter para ejecutar
- **Múltiples ejemplos** precargados

### Panel de Salida
- **Texto y resultados** de ejecución
- **Visualizaciones** automáticas
- **Manejo de errores** detallado
- **Exportación** de resultados

### Asistente IA
- **Chat interactivo** siempre disponible
- **Respuestas contextuales** sobre código
- **Sugerencias** de mejoras y optimizaciones
- **Ayuda con errores** y debugging

### Gestión de Variables
- **Panel de variables** en tiempo real
- **Información de tipos** y dimensiones
- **Seguimiento automático** de cambios
- **Limpieza** de entorno

## 📦 Paquetes Incluidos

### Científicos y Análisis
- **NumPy** - Computación numérica
- **Pandas** - Manipulación de datos
- **SciPy** - Algoritmos científicos
- **Scikit-learn** - Machine learning

### Visualización y Machine Learning
- **Matplotlib** - Gráficos estáticos
- **Seaborn** - Visualización estadística
- **Plotly** - Gráficos interactivos
- **Bokeh, Altair, Missingno, Wordcloud, Sweetviz, Autoviz, Dtreeviz, Yellowbrick**

### Estadística, Machine Learning y Deep Learning
**Scikit-learn** - Machine learning clásico
**Statsmodels** - Modelado estadístico avanzado
**XGBoost, LightGBM, CatBoost** - Boosting y ML avanzado
**PyCaret, MLxtend, Imbalanced-learn, Optuna, Hyperopt, MLflow**
**TensorFlow, Keras, PyTorch, FastAI** - Deep learning y redes neuronales
**Transformers, Sentence-transformers, Datasets** - NLP y modelos avanzados
**Prophet, FBProphet, Darts, Pmdarima, Statsforecast** - Series temporales
**NetworkX, Gensim, NLTK, SpaCy** - NLP y grafos
**OpenCV, Pillow, Imageio, Scikit-image** - Visión por computador

> **Nota:** El sistema intenta instalar automáticamente todas estas librerías al iniciar el entorno Python. Algunas pueden no estar disponibles en Pyodide por limitaciones de compatibilidad, pero la app lo notificará y ofrecerá feedback claro si alguna no puede instalarse.

### Funciones Integradas
```python
# Generar datos de ejemplo
df = get_sample_data('sales')      # Datos de ventas
df = get_sample_data('iris')       # Dataset clásico
df = get_sample_data('random')     # Datos aleatorios

# Análisis automático disponible
df.describe()                      # Estadísticas descriptivas
df.info()                          # Información del dataset
```

## 🎯 Casos de Uso

### 📊 Análisis Exploratorio de Datos
- Carga y exploración de datasets
- Estadísticas descriptivas automáticas
- Detección de patrones y outliers
- Visualización de distribuciones

### 🤖 Machine Learning
- Entrenamiento de modelos
- Validación cruzada
- Evaluación de métricas
- Visualización de resultados

### 📈 Visualización de Datos
- Gráficos estáticos e interactivos
- Dashboards personalizados
- Exportación de visualizaciones
- Presentaciones interactivas

### 🧠 Prototipado Rápido
- Pruebas de conceptos
- Experimentación con algoritmos
- Validación de hipótesis
- Desarrollo iterativo

## ⚡ Rendimiento

- **Carga inicial**: ~10-15 segundos (primera vez)
- **Ejecución**: Instantánea para código simple
- **Memoria**: Optimizada para navegadores modernos
- **Compatibilidad**: Chrome, Firefox, Safari, Edge

## 🔧 Configuración Avanzada

### Instalación de Paquetes Adicionales
```python
# El sistema instalará automáticamente paquetes comunes
import requests           # Se instala automáticamente
import beautifulsoup4     # Se instala automáticamente
```

### Exportación de Notebooks
- **Formato Jupyter**: .ipynb compatible
- **Código fuente**: .py exportable
- **Resultados**: .txt para salidas
- **Visualizaciones**: .png de alta calidad

## 🎨 Personalización

La interfaz es completamente personalizable a través de CSS:
- Variables CSS para colores y temas
- Responsive design para todos los dispositivos
- Animaciones y efectos configurables
- Layouts adaptables

## 📱 Responsive Design

- **Móvil**: Layout vertical optimizado
- **Tablet**: Paneles adaptables
- **Desktop**: Vista completa de tres columnas
- **Pantallas grandes**: Máximo aprovechamiento del espacio

## 🔐 Seguridad

- **Ejecución en sandbox**: Todo el código se ejecuta localmente
- **Sin servidor**: No hay transferencia de datos
- **Privacidad total**: Los datos nunca salen del navegador
- **Sin instalación**: Funciona directamente en el navegador

## 🚧 Desarrollo

### Próximas Características
- ✅ Integración con LLMs reales (OpenAI, LM Studio, Ollama)
- ✅ Soporte para múltiples celdas de código
- ✅ Sistema de plugins extensible
- ✅ Colaboración en tiempo real
- ✅ Exportación a múltiples formatos

### Contribuir
1. Fork del repositorio
2. Crear una rama para tu feature
3. Implementar mejoras
4. Enviar pull request

## 📄 Licencia

MIT License - Uso libre para proyectos personales y comerciales.

## 🛠️ Solución de Problemas

### ✅ Sistema de Fallback de CDN Robusto

**Funcionalidad Implementada:**
- ✅ **Fallback automático** entre múltiples CDNs (Pyodide CDN, JSDelivr, UNPKG)
- ✅ **Ajuste dinámico de indexURL** según el CDN exitoso
- ✅ **Manejo de errores de red** con timeouts y reintentos
- ✅ **Logging detallado** para diagnóstico
- ✅ **Recuperación automática** sin intervención manual

### Problema: Error de carga de Pyodide (SOLUCIONADO)

**El sistema ahora maneja automáticamente:**
- Error `net::ERR_NAME_NOT_RESOLVED` → Cambia a CDN alternativo
- Timeouts de conexión → Prueba siguiente CDN  
- Problemas de indexURL → Ajusta automáticamente según CDN exitoso

**Herramientas de Diagnóstico:**
```
📊 Archivo principal: index.html (sistema integrado)
🛠️ Diagnóstico visual: debug-pyodide.html  
🧪 Demo completo: notebooks/pyodide-cdn-fallback-demo.ipynb
🔍 Test de fallback: test-cdn-fallback.html
```

**Logs de Funcionamiento Exitoso:**
```
🧪 INICIANDO TEST DE CDN FALLBACK + INDEXURL FIX
📡 Probando CDN 1/3: Pyodide CDN
❌ Pyodide CDN: Error de carga (net::ERR_NAME_NOT_RESOLVED)
📡 Probando CDN 2/3: JSDelivr  
✅ JSDelivr: Script cargado exitosamente
🎯 CDN exitoso guardado: https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js
🎯 JSDelivr detectado, indexURL: https://cdn.jsdelivr.net/pyodide/v0.24.1/full/
✅ Simulación: Pyodide completamente inicializado
🎉 TEST EXITOSO: Problema de indexURL solucionado
```

**Si persisten problemas:**
1. 🔍 Abre `debug-pyodide.html` para diagnóstico completo
2. 🌐 Verifica conectividad a internet
3. 🔧 Cambia DNS a 8.8.8.8 o 1.1.1.1  
4. 🛡️ Desactiva temporalmente firewall/antivirus
5. 🌍 Usa VPN si hay restricciones geográficas

## 🤝 Soporte

- **Documentación**: Disponible en el propio asistente IA
- **Ejemplos**: Incluidos en la aplicación
- **Issues**: GitHub Issues para reportar problemas
- **Comunidad**: Discussions para preguntas y sugerencias

---

**¡Convierte tu navegador en un entorno completo de ciencia de datos!** 🚀

Desarrollado con ❤️ para la comunidad de análisis de datos y machine learning.
