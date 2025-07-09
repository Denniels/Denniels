import { onPyodideLoading, onPyodideReady, onPyodideError } from './pyodide-loader.js';
import { NotebookExecutor } from './notebook-executor.js';

let conversationHistory = []; // Memoria del agente
let notebookExecutor = null;
let datasetChangeTimer = null; // Timer para detectar cambios en datasets

// Función para obtener contexto de datos para el agente
async function getDatasetContext() {
  try {
    if (!window.dataLoader || !window.dataLoader.currentDataset) {
      return `📊 DATOS DISPONIBLES: Ningún dataset cargado actualmente.
      
💡 SUGERENCIAS:
- Usar el botón "📊 Cargar Datos" para cargar CSV, Excel o JSON
- Cargar datos de ejemplo (Iris, Ventas, Acciones, Clientes)
- Conectar con APIs externas`;
    }


    const dataset = window.dataLoader.currentDataset;
    const loadedDatasets = window.dataLoader.getLoadedDatasets();

    // Obtener resumen real y estructurado del dataset activo
    let summary = null;
    if (window.dataLoader.getDatasetSummaryForAgent) {
      try {
        summary = await window.dataLoader.getDatasetSummaryForAgent();
      } catch (e) {
        summary = null;
      }
    }

    // Compactar el resumen para el prompt
    let resumen = '';
    if (summary && summary.summary) {
      const s = summary.summary;
      resumen = `\n---\nRESUMEN REAL DEL DATASET\n- Nombre: ${s.nombre}\n- Forma: ${JSON.stringify(s.forma)}\n- Columnas: ${JSON.stringify(s.nombres_columnas)}\n- Tipos: ${JSON.stringify(s.tipos)}\n- Estadísticas: ${s.estadisticas ? JSON.stringify(s.estadisticas) : 'N/A'}\n- Muestra: ${s.muestra ? JSON.stringify(s.muestra) : 'N/A'}\n- Valores únicos: ${s.valores_unicos ? JSON.stringify(s.valores_unicos) : 'N/A'}\n- Datos faltantes: ${s.datos_faltantes ? JSON.stringify(s.datos_faltantes) : 'N/A'}\n- Recomendaciones: ${s.recomendaciones ? JSON.stringify(s.recomendaciones) : 'N/A'}\n---\n`;
    }

    return `📊 DATASET ACTIVO: "${dataset.name}"
- Archivo: ${dataset.file || dataset.source || 'generado'}
- Formato: ${dataset.format}
- Dimensiones: ${dataset.rows} filas × ${dataset.columns} columnas
- Cargado: ${dataset.loadedAt ? dataset.loadedAt.toLocaleString() : 'N/A'}

📚 TOTAL DATASETS CARGADOS: ${loadedDatasets.length}
${resumen}
💡 ACCIONES DISPONIBLES:
- Analizar datos específicos del dataset activo
- Crear visualizaciones basadas en las columnas reales
- Detectar patrones y outliers
- Sugerir transformaciones apropiadas`;

  } catch (error) {
    console.warn('Error obteniendo contexto de datos:', error);
    return `📊 DATOS: Error obteniendo información de datos. 
    
💡 Puedes cargar datos usando el botón "📊 Cargar Datos" en el header.`;
  }
}

export function initializeAgent() {
  const chatRoot = document.getElementById('agent-chat');
  if (!chatRoot) return;
  chatRoot.innerHTML = '';
  
  // Mensaje de bienvenida con información de configuración y datos
  const welcome = document.createElement('div');
  welcome.className = 'chat-message message-agent';
  
  const config = window.modelConfig ? window.modelConfig.getConfig() : null;
  const configInfo = config ? 
    `\n\n🔧 Configuración actual: ${window.modelConfig.providers[config.provider]?.name || 'Desconocido'} - ${config.model}` :
    '\n\n⚙️ Para configurar tu modelo IA, haz clic en "⚙️ Configurar" en el header.';
  
  welcome.innerHTML = `
    <div class="message-header">🤖 Asistente Experto en Datos</div>
    <div>¡Hola! Soy tu analista de datos personal especializado en Python. Puedo ayudarte con:
    
📊 <strong>Análisis de Datos:</strong> Exploración, limpieza, estadísticas
📈 <strong>Visualizaciones:</strong> Gráficos interactivos y dashboards  
🔬 <strong>Estadística:</strong> Pruebas, correlaciones, regresiones
🤖 <strong>Machine Learning:</strong> Modelos predictivos básicos

💡 <strong>Para empezar:</strong> Haz clic en "📊 Cargar Datos" para subir tu CSV, Excel o JSON, o prueba con nuestros datasets de ejemplo.${configInfo}</div>
  `;
  chatRoot.appendChild(welcome);
  
  // Inicializar ejecutor de notebook
  initializeNotebookExecutor();
  
  setupPyodideListeners();
  setupAgentEventListeners(); // Configurar eventos del agente
  setupDatasetChangeListener(); // Configurar detector de cambios en datasets
  document.dispatchEvent(new Event('agent-ready'));
}

// Nuevas funciones para proactividad del agente

// Configurar detector de cambios en datasets
function setupDatasetChangeListener() {
  // Verificar periódicamente si hay cambios en el dataset
  setInterval(checkForDatasetChanges, 2000);
  
  // Crear un evento personalizado para detectar la carga de nuevos datasets
  document.addEventListener('dataset-loaded', handleDatasetLoaded);
}

// Verificar si hay cambios en el dataset actual
function checkForDatasetChanges() {
  if (!window.dataLoader) return;
  
  const currentDataset = window.dataLoader.currentDataset;
  if (currentDataset && currentDataset._lastNotifiedAt === undefined) {
    // Marcar como notificado para evitar análisis duplicados
    currentDataset._lastNotifiedAt = new Date();
    
    // Notificar que se ha detectado un nuevo dataset
    document.dispatchEvent(new CustomEvent('dataset-loaded', { 
      detail: { dataset: currentDataset } 
    }));
  }
}

// Manejar evento de carga de dataset
async function handleDatasetLoaded(event) {
  const dataset = event.detail?.dataset || window.dataLoader?.currentDataset;
  if (!dataset) return;
  
  console.log('📊 Detectado nuevo dataset:', dataset.name);
  
  // Esperar un momento para asegurar que los datos estén completamente cargados
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Realizar análisis automático proactivo
  performProactiveAnalysis(dataset);
}

// Realizar análisis proactivo y generar recomendaciones
async function performProactiveAnalysis(dataset) {
  if (!notebookExecutor || !dataset) return;
  
  // Mostrar mensaje de análisis en progreso
  const analysisMessage = addAgentMessage(`🔍 Analizando dataset "${dataset.name}"...`);
  
  try {
    // Verificar que el dataset esté accesible en Python
    const varName = dataset.name;
    const checkCode = `
import pandas as pd
try:
    if '${varName}' in globals():
        print("✅ Dataset '${varName}' encontrado")
        if isinstance(${varName}, pd.DataFrame):
            print("✅ Es un DataFrame con forma " + str(${varName}.shape))
        else:
            print("⚠️ La variable existe pero no es un DataFrame, es " + str(type(${varName})))
    else:
        print("❌ Dataset '${varName}' no encontrado en el entorno global")
except Exception as e:
    print("❌ Error verificando dataset: " + str(e))
`;
    
    const checkResult = await notebookExecutor.executeCode(checkCode, 'check_dataset');
    if (!checkResult.success || checkResult.output?.includes('no encontrado')) {
      analysisMessage.innerHTML = `
        <div class="message-header">🤖 Asistente</div>
        <div>⚠️ No puedo acceder al dataset "${varName}". Por favor, verifica que se haya cargado correctamente.</div>
      `;
      return;
    }
    
    // Generar y mostrar un resumen rápido del dataset
    const summaryCode = `
import pandas as pd
import numpy as np
try:
    # Información básica
    print("📊 Resumen de " + str(${varName}.shape[0]) + " filas × " + str(${varName}.shape[1]) + " columnas")
    # Tipos de datos
    print("\n📋 Tipos de datos:")
    for col, dtype in ${varName}.dtypes.items():
        print(f"  • {col}: {dtype}")
    # Estadísticas numéricas
    numeric_cols = ${varName}.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        print("\n📉 Estadísticas numéricas:")
        stats = ${varName}[numeric_cols].describe()
        for col in numeric_cols[:5]:  # Limitar a 5 columnas
            print("  • " + col + ": min=" + str(round(stats[col]['min'], 2)) + ", max=" + str(round(stats[col]['max'], 2)) + ", mean=" + str(round(stats[col]['mean'], 2)))
        if len(numeric_cols) > 5:
            print("  • ... y " + str(len(numeric_cols)-5) + " columnas numéricas más")
    # Valores nulos
    nulls = ${varName}.isnull().sum()
    null_cols = nulls[nulls > 0]
    if len(null_cols) > 0:
        print("\n⚠️ Valores nulos detectados:")
        for col, count in null_cols.items():
            percent = count / len(${varName}) * 100
            print("  • " + col + ": " + str(count) + " (" + str(round(percent, 1)) + "%)")
    else:
        print("\n✅ No se detectaron valores nulos")
    # Categorías para variables categóricas
    cat_cols = ${varName}.select_dtypes(include=['object', 'category']).columns
    if len(cat_cols) > 0:
        print("\n🏷️ Variables categóricas:")
        for col in cat_cols[:3]:  # Limitar a 3 columnas
            values = ${varName}[col].unique()
            print("  • " + col + ": " + str(len(values)) + " valores únicos, ejemplos: " + ", ".join([str(v) for v in values[:3]]))
        if len(cat_cols) > 3:
            print("  • ... y " + str(len(cat_cols)-3) + " variables categóricas más")
    # Si no hay nada más, evitar bloque vacío
    if len(numeric_cols) == 0 and len(cat_cols) == 0 and (not null_cols.any()):
        pass
except Exception as e:
    print("❌ Error analizando dataset: " + str(e))
`;
    
    const summaryResult = await notebookExecutor.executeCode(summaryCode, 'quick_summary');
    
    // Identificar problemas y oportunidades en el dataset
    const issuesCode = `
import pandas as pd
import numpy as np
try:
    issues = []
    opportunities = []
    # Verificar valores nulos
    null_percent = ${varName}.isnull().sum() / len(${varName}) * 100
    high_null_cols = null_percent[null_percent > 20]
    if len(high_null_cols) > 0:
        issues.append("📉 " + str(len(high_null_cols)) + " columnas tienen >20% de valores nulos")
    # Verificar valores duplicados
    duplicates = ${varName}.duplicated().sum()
    if duplicates > 0:
        dup_percent = duplicates / len(${varName}) * 100
        issues.append("🔄 " + str(duplicates) + " filas duplicadas (" + str(round(dup_percent, 1)) + "%)")
    # Detectar outliers en columnas numéricas
    numeric_cols = ${varName}.select_dtypes(include=[np.number]).columns
    outlier_cols = []
    for col in numeric_cols:
        q1 = ${varName}[col].quantile(0.25)
        q3 = ${varName}[col].quantile(0.75)
        iqr = q3 - q1
        outliers = ((${varName}[col] < (q1 - 1.5 * iqr)) | (${varName}[col] > (q3 + 1.5 * iqr))).sum()
        if outliers > len(${varName}) * 0.05:  # Más del 5% son outliers
            outlier_cols.append(col)
    if outlier_cols:
        issues.append("⚠️ Posibles outliers detectados en: " + ", ".join(outlier_cols[:3]))
        if len(outlier_cols) > 3:
            issues.append("   y " + str(len(outlier_cols)-3) + " columnas más")
    # Identificar oportunidades de análisis
    # Series temporales
    date_cols = []
    for col in ${varName}.columns:
        if 'date' in col.lower() or 'time' in col.lower() or 'año' in col.lower() or 'mes' in col.lower():
            try:
                pd.to_datetime(${varName}[col])
                date_cols.append(col)
            except Exception:
                pass
    if date_cols:
        opportunities.append("📅 Posible análisis de series temporales con columnas: " + ", ".join(date_cols))
    # Análisis de correlación
    if len(numeric_cols) >= 2:
        opportunities.append("📊 Potencial para análisis de correlación entre variables numéricas")
    # Potencial para clasificación o regresión
    cat_cols = ${varName}.select_dtypes(include=['object', 'category']).columns
    if len(cat_cols) > 0 and len(numeric_cols) > 1:
        opportunities.append("🤖 Potencial para modelos de clasificación")
    elif len(numeric_cols) > 2:
        opportunities.append("📈 Potencial para modelos de regresión")
    # Imprimir hallazgos
    if issues:
        print("⚠️ PROBLEMAS DETECTADOS:")
        for issue in issues:
            print("  • " + issue)
    else:
        print("✅ No se detectaron problemas significativos en los datos")
    if opportunities:
        print("\n💡 OPORTUNIDADES DE ANÁLISIS:")
        for opp in opportunities:
            print("  • " + opp)
except Exception as e:
    print("❌ Error identificando problemas y oportunidades: " + str(e))
`;
    
    const issuesResult = await notebookExecutor.executeCode(issuesCode, 'issues_opportunities');
    
    // Compilar mensaje de análisis completo
    let analysisOutput = `
<div class="message-header">🤖 Asistente</div>
<div>
  <h3>📊 Análisis Automático: ${dataset.name}</h3>
  
  ${summaryResult.output ? `<pre>${summaryResult.output}</pre>` : ''}
  
  ${issuesResult.output ? `<pre>${issuesResult.output}</pre>` : ''}
  
  <h4>💡 ¿Qué quieres hacer ahora?</h4>
  <ul>
    <li><strong>Exploración:</strong> "Muéstrame las primeras filas del dataset"</li>
    <li><strong>Visualización:</strong> "Genera gráficos para visualizar las variables principales"</li>
    <li><strong>Análisis:</strong> "Haz un análisis de correlación entre las variables numéricas"</li>
    <li><strong>Limpieza:</strong> "Ayúdame a tratar los valores nulos y outliers"</li>
  </ul>
</div>`;
    
    // Actualizar mensaje de análisis
    analysisMessage.innerHTML = analysisOutput;
    
    // Generar y mostrar un notebook automáticamente
    generateAutomaticNotebook(dataset, summaryResult.output, issuesResult.output);
    
  } catch (error) {
    console.error('Error en análisis proactivo:', error);
    analysisMessage.innerHTML = `
      <div class="message-header">🤖 Asistente</div>
      <div>❌ Error durante el análisis automático: ${error.message}</div>
    `;
  }
}

// Generar notebook automático con análisis exploratorio básico
async function generateAutomaticNotebook(dataset, summary, issues) {

  // Robustecer: asegurar integración real con los datos cargados y ejecución real de notebooks
  if (!notebookExecutor || !dataset) return;


  try {
    // --- Notebook JSON structure ---
    const safeVarName = dataset.name;
    let fsPath = '';
    let fileFormat = dataset.format || 'csv';
    // Para Pyodide, usar solo el nombre del archivo cargado (sin rutas)
    if (dataset.file) {
      fsPath = dataset.file;
    } else if (dataset.source) {
      const urlParts = dataset.source.split('/');
      const fileName = urlParts[urlParts.length - 1] || `dataset_${Date.now()}.${fileFormat}`;
      fsPath = fileName;
    } else {
      fsPath = `${safeVarName}.${fileFormat}`;
    }

    // Notebook cells array
    const cells = [];

    // 1. Portada ejecutiva
    cells.push({
      cell_type: "markdown",
      metadata: { language: "markdown" },
      source: [
        `# Informe Ejecutivo: ${safeVarName}`,
        `Este notebook fue generado automáticamente tras la carga de datos desde '${fsPath}'.\n\nIncluye resumen ejecutivo, análisis exploratorio, visualizaciones y recomendaciones.`
      ]
    });

    // 2. Librerías y carga de datos (siempre la primera celda de código)
    let loadCode = [];
    let needsCleaning = false;
    // Detectar si el dataset tiene solo una columna sospechosa (CSV mal parseado)
    if (dataset.summary && dataset.summary.nombres_columnas && dataset.summary.nombres_columnas.length === 1) {
      const colName = dataset.summary.nombres_columnas[0];
      if (/[,;]/.test(colName)) {
        needsCleaning = true;
      }
    }
    if (fileFormat === 'json' || fsPath.endsWith('.json')) {
      loadCode = [
        "import pandas as pd",
        "import matplotlib.pyplot as plt",
        "import seaborn as sns",
        "import json",
        "plt.style.use('ggplot')",
        "sns.set(style='whitegrid')",
        "plt.rcParams['figure.figsize'] = (12, 6)",
        `with open(r'${fsPath}', 'r', encoding='utf-8') as f:`,
        "    data = json.load(f)",
        `if isinstance(data, list):`,
        `    ${safeVarName} = pd.DataFrame(data)`,
        "else:",
        "    for v in data.values():",
        "        if isinstance(v, list) and len(v) > 0:",
        `            ${safeVarName} = pd.DataFrame(v)`,
        "            break",
        "    else:",
        `        ${safeVarName} = pd.DataFrame([data])`,
        `print('✅ Datos cargados desde ${fsPath}')`
      ];
    } else if (needsCleaning) {
      // Carga + limpieza automática para CSV mal parseado
      loadCode = [
        "import pandas as pd",
        "import matplotlib.pyplot as plt",
        "import seaborn as sns",
        "plt.style.use('ggplot')",
        "sns.set(style='whitegrid')",
        "plt.rcParams['figure.figsize'] = (12, 6)",
        "import io",
        `# Cargar texto crudo de la columna única`,
        `${safeVarName}_raw = pd.read_csv(r'${fsPath}')`,
        `raw_text = '\n'.join(${safeVarName}_raw.iloc[:,0].astype(str).tolist())`,
        `# Reparsing usando pandas, ajustando separador y decimal`,
        `${safeVarName} = pd.read_csv(io.StringIO(raw_text), sep=',', quotechar='\"', doublequote=True, decimal=',')`,
        `print('✅ Datos cargados y limpiados automáticamente desde ${fsPath}')`
      ];
      // Insertar advertencia en el notebook
      cells.push({
        cell_type: "markdown",
        metadata: { language: "markdown" },
        source: [
          "⚠️ **El archivo CSV fue cargado como una sola columna. Se aplicó limpieza automática para dejar el DataFrame listo para análisis y visualización.**"
        ]
      });
    } else {
      loadCode = [
        "import pandas as pd",
        "import matplotlib.pyplot as plt",
        "import seaborn as sns",
        "plt.style.use('ggplot')",
        "sns.set(style='whitegrid')",
        "plt.rcParams['figure.figsize'] = (12, 6)",
        `# Cargar datos desde el FS virtual`,
        `${safeVarName} = pd.read_csv(r'${fsPath}')`,
        `print('✅ Datos cargados desde ${fsPath}')`
      ];
    }
    // La celda de carga de librerías y datos siempre es la primera de código
    cells.push({
      cell_type: "code",
      metadata: { language: "python" },
      source: loadCode
    });

    // 3. Resumen ejecutivo y recomendaciones
    let resumen = "";
    if (dataset.summary) {
      const s = dataset.summary;
      resumen = `**Forma:** ${JSON.stringify(s.forma)}\n\n**Columnas:** ${JSON.stringify(s.nombres_columnas)}\n\n**Tipos:** ${JSON.stringify(s.tipos)}\n\n**Muestra:**\n\n\`${JSON.stringify(s.muestra, null, 2)}\``;
      if (s.recomendaciones) {
        resumen += `\n\n**Recomendaciones:**\n\n- ${(Array.isArray(s.recomendaciones) ? s.recomendaciones.join('\n- ') : JSON.stringify(s.recomendaciones))}`;
      }
    }
    cells.push({
      cell_type: "markdown",
      metadata: { language: "markdown" },
      source: [
        "## Resumen Ejecutivo",
        resumen || "No se pudo generar resumen."
      ]
    });

    // 4. Estadísticas descriptivas y exploración
    cells.push({
      cell_type: "code",
      metadata: { language: "python" },
      source: [
        "# Estadísticas descriptivas y exploración",
        `print('Dimensiones:', ${safeVarName}.shape)`,
        `print('Primeras filas:')`,
        `${safeVarName}.head()`,
        `print('Tipos de datos:')`,
        `${safeVarName}.dtypes`,
        `print('Estadísticas descriptivas:')`,
        `${safeVarName}.describe()`
      ]
    });

    // 5. Visualizaciones automáticas
    cells.push({
      cell_type: "code",
      metadata: { language: "python" },
      source: [
        "# Visualizaciones automáticas",
        "import matplotlib.pyplot as plt",
        "import seaborn as sns",
        "plt.style.use('ggplot')",
        "sns.set(style='whitegrid')",
        "plt.rcParams['figure.figsize'] = (12, 6)",
        `numeric_cols = ${safeVarName}.select_dtypes(include=['number']).columns.tolist()`,
        "if numeric_cols:",
        "    for col in numeric_cols[:5]:",
        `        plt.figure()`,
        `        sns.histplot(${safeVarName}[col].dropna(), kde=True)`,
        `        plt.title(f'Histograma de ${col}')`,
        `        plt.show()`,
        "else:",
        "    print('No hay columnas numéricas para graficar')"
      ]
    });

    // 6. Visualización de variables categóricas
    cells.push({
      cell_type: "code",
      metadata: { language: "python" },
      source: [
        "# Visualización de variables categóricas",
        `cat_cols = ${safeVarName}.select_dtypes(include=['object', 'category']).columns.tolist()`,
        "if cat_cols:",
        "    for col in cat_cols[:3]:",
        `        plt.figure()`,
        `        ${safeVarName}[col].value_counts().head(10).plot(kind='bar')`,
        `        plt.title(f'Distribución de ${col}')`,
        `        plt.show()`,
        "else:",
        "    print('No hay columnas categóricas para graficar')"
      ]
    });

    // 7. Correlación y matriz de calor
    cells.push({
      cell_type: "code",
      metadata: { language: "python" },
      source: [
        "# Matriz de correlación",
        `numeric_cols = ${safeVarName}.select_dtypes(include=['number']).columns.tolist()`,
        "if len(numeric_cols) > 1:",
        "    plt.figure(figsize=(10, 8))",
        `    corr = ${safeVarName}[numeric_cols].corr()`,
        "    sns.heatmap(corr, annot=True, cmap='coolwarm')",
        "    plt.title('Matriz de Correlación')",
        "    plt.show()",
        "else:",
        "    print('No hay suficientes columnas numéricas para correlación')"
      ]
    });

    // 8. Recomendaciones y próximos pasos
    cells.push({
      cell_type: "markdown",
      metadata: { language: "markdown" },
      source: [
        "## Recomendaciones y próximos pasos",
        "- Revisa las visualizaciones y estadísticas generadas.\n- Considera limpiar valores nulos y outliers.\n- Explora relaciones entre variables relevantes.\n- Aplica técnicas de reducción de dimensionalidad o modelado si es pertinente.\n- Consulta con el equipo de negocio para definir hipótesis y siguientes análisis."
      ]
    });

    // --- Insertar notebook JSON profesional en la UI ---
    const notebook = { cells };
    if (window.renderNotebookJSON) {
      window.renderNotebookJSON(notebook);
    }

    // Ejecutar notebook completo automáticamente para obtener outputs reales
    if (notebookExecutor && typeof notebookExecutor.executeNotebookJSON === 'function') {
      try {
        const execResult = await notebookExecutor.executeNotebookJSON(notebook);
        if (execResult && execResult.success) {
          addAgentMessage('✅ Notebook profesional generado y ejecutado automáticamente. Los resultados y visualizaciones se han generado con los datos reales.');
        } else {
          addAgentMessage('⚠️ El notebook fue generado pero no se pudo ejecutar automáticamente. Puedes ejecutar las celdas manualmente.');
        }
      } catch (err) {
        addAgentMessage('⚠️ El notebook fue generado pero ocurrió un error al intentar ejecutarlo automáticamente. Puedes ejecutar las celdas manualmente.');
      }
    } else {
      addAgentMessage(`✅ Notebook exploratorio generado en formato JSON. Puedes ejecutar las celdas para ver los resultados. El notebook incluye: presentación, carga de datos, resumen ejecutivo, análisis, visualizaciones y recomendaciones.`);
    }

    return notebook;
    
    // Exploración básica
    addNotebookCell('markdown', `
## 2. Exploración Básica

Analizaremos la estructura del dataset, tipos de datos y estadísticas básicas.
    `);
    
    // Código para exploración básica
    addNotebookCell('python', `
# Tipos de datos
print("Tipos de datos:")
${dataset.name}.dtypes

# Estadísticas descriptivas para columnas numéricas
print("\\nEstadísticas descriptivas:")
${dataset.name}.describe()
    `);
    
    // Análisis de datos faltantes
    addNotebookCell('markdown', `
## 3. Análisis de Datos Faltantes

Identificaremos valores faltantes en el dataset y visualizaremos su distribución.
    `);
    
    // Código para análisis de datos faltantes
    addNotebookCell('python', `
# Verificar valores nulos
missing_values = ${dataset.name}.isnull().sum()
missing_percent = missing_values / len(${dataset.name}) * 100

# Crear DataFrame para visualizar
missing_df = pd.DataFrame({
    'Valores Faltantes': missing_values,
    'Porcentaje (%)': missing_percent
})

# Mostrar solo columnas con valores faltantes
missing_df = missing_df[missing_df['Valores Faltantes'] > 0].sort_values('Porcentaje (%)', ascending=False)

if len(missing_df) > 0:
    print("Se encontraron valores faltantes en " + str(len(missing_df)) + " columnas:")
    display(missing_df)
    
    # Visualizar valores faltantes
    plt.figure(figsize=(12, 6))
    sns.heatmap(${dataset.name}.isnull(), cbar=False, cmap='viridis', yticklabels=False)
    plt.title('Distribución de Valores Faltantes')
    plt.tight_layout()
    plt.show()
else:
    print("✅ No se encontraron valores faltantes en el dataset")
    `);
    
    // Visualizaciones exploratorias
    addNotebookCell('markdown', `
## 4. Visualizaciones Exploratorias

Generaremos visualizaciones básicas para explorar la distribución de las variables y sus relaciones.
    `);
    
    // Código para visualizaciones exploratorias (variables numéricas)
    addNotebookCell('python', `
# Obtener columnas numéricas
numeric_cols = ${dataset.name}.select_dtypes(include=['int64', 'float64']).columns.tolist()

if len(numeric_cols) > 0:
    # Limitar a 5 columnas para las visualizaciones
    plot_cols = numeric_cols[:5]
    
    # Histogramas para variables numéricas
    plt.figure(figsize=(15, 10))
    for i, col in enumerate(plot_cols, 1):
        plt.subplot(len(plot_cols), 2, i*2-1)
        sns.histplot(${dataset.name}[col].dropna(), kde=True)
        plt.title('Distribución de ' + col)
        
        plt.subplot(len(plot_cols), 2, i*2)
        sns.boxplot(y=${dataset.name}[col].dropna())
        plt.title('Boxplot de ' + col)
    
    plt.tight_layout()
    plt.show()
    
    # Matriz de correlación si hay más de una columna numérica
    if len(numeric_cols) > 1:
        plt.figure(figsize=(12, 10))
        correlation = ${dataset.name}[numeric_cols].corr()
        mask = np.triu(np.ones_like(correlation, dtype=bool))
        sns.heatmap(correlation, annot=True, fmt='.2f', cmap='coolwarm', mask=mask)
        plt.title('Matriz de Correlación - Variables Numéricas')
        plt.tight_layout()
        plt.show()
else:
    print("⚠️ No se encontraron variables numéricas en el dataset para visualizar")
    `);
    
    // Código para visualizaciones exploratorias (variables categóricas)
    addNotebookCell('python', `
# Obtener columnas categóricas
cat_cols = ${dataset.name}.select_dtypes(include=['object', 'category']).columns.tolist()

if len(cat_cols) > 0:
    # Limitar a 3 columnas categóricas para las visualizaciones
    plot_cat_cols = cat_cols[:3]
    
    # Diagramas de barras para variables categóricas
    plt.figure(figsize=(15, 5 * len(plot_cat_cols)))
    
    for i, col in enumerate(plot_cat_cols, 1):
        # Contar valores y ordenar
        value_counts = ${dataset.name}[col].value_counts();
        
        # Limitar a los 10 valores más frecuentes si hay muchos
        if len(value_counts) > 10:
            value_counts = value_counts.head(10);
            title_suffix = " (Top 10)";
        else {
            title_suffix = "";
        }
            
        plt.subplot(len(plot_cat_cols), 1, i)
        sns.barplot(x=value_counts.index, y=value_counts.values)
        plt.title('Distribución de ' + col + title_suffix)
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
    
    plt.tight_layout();
    plt.show();
    
    # Si hay variables numéricas, mostrar relación entre categóricas y numéricas
    if len(numeric_cols) > 0:
        # Seleccionar una variable numérica y una categórica
        num_col = numeric_cols[0]
        cat_col = cat_cols[0]
        
        # Limitar a 10 categorías más frecuentes si hay muchas
        top_categories = ${dataset.name}[cat_col].value_counts().head(10).index;
        
        plt.figure(figsize=(12, 6))
        if len(top_categories) > 1:  # Solo si hay al menos 2 categorías
            sns.boxplot(x=cat_col, y=num_col, data=${dataset.name}[${dataset.name}[cat_col].isin(top_categories)])
            plt.title('Distribución de ' + num_col + ' por ' + cat_col)
            plt.xticks(rotation=45, ha='right')
            plt.tight_layout()
            plt.show()
else:
    print("⚠️ No se encontraron variables categóricas en el dataset para visualizar")
    `);
    
    // Recomendaciones
    addNotebookCell('markdown', `
## 5. Recomendaciones

Basado en el análisis realizado, aquí hay algunas recomendaciones para continuar explorando y procesando este dataset.
    `);
    
    // Generar recomendaciones basadas en el análisis previo
    const recomCode = `
import pandas as pd
import numpy as np

try:
    recomendaciones = []
    
    # Comprobar valores nulos
    missing = ${dataset.name}.isnull().sum()
    if missing.any():
        missing_cols = missing[missing > 0]
        recomendaciones.append("• **Tratamiento de valores faltantes**: Hay " + str(len(missing_cols)) + " columnas con datos faltantes. Considere técnicas como imputación por media/mediana para variables numéricas o moda para categóricas.")
    
    # Comprobar variables numéricas
    num_cols = ${dataset.name}.select_dtypes(include=[np.number]).columns
    if len(num_cols) > 0:
        # Verificar outliers
        recomendaciones.append("• **Detección de outliers**: Utilice los boxplots generados para identificar valores atípicos y decidir si deben ser tratados.")
        
        # Si hay suficientes variables numéricas, recomendar análisis de componentes principales
        if len(num_cols) > 3:
            recomendaciones.append("• **Reducción de dimensionalidad**: Con varias variables numéricas, considere técnicas como PCA para reducir dimensiones y visualizar patrones.")
    
    # Comprobar variables categóricas
    cat_cols = ${dataset.name}.select_dtypes(include=['object', 'category']).columns
    if len(cat_cols) > 0:
        # Si hay variables categóricas con muchos valores únicos
        high_cardinality = []
        for col in cat_cols:
            if ${dataset.name}[col].nunique() > 20:
                high_cardinality.append(col)
        
        if high_cardinality:
            recomendaciones.append("• **Alta cardinalidad**: Las columnas " + ", ".join(high_cardinality[:3]) + " tienen muchos valores únicos. Considere agrupar categorías poco frecuentes.")
    
    # Si hay variables tanto numéricas como categóricas
    if len(num_cols) > 0 and len(cat_cols) > 0:
        recomendaciones.append("• **Análisis de varianza (ANOVA)**: Explore si las variables categóricas influyen significativamente en las variables numéricas.")
        
        if len(cat_cols) == 1 and ${dataset.name}[cat_cols[0]].nunique() < 10:
            recomendaciones.append("• **Modelos de clasificación**: Este dataset podría ser adecuado para entrenar modelos de clasificación prediciendo la variable categórica.")
    
    # Verificar si hay variables de fecha/tiempo
    date_cols = []
    for col in ${dataset.name}.columns:
        if 'date' in col.lower() or 'time' in col.lower() or 'año' in col.lower() or 'fecha' in col.lower():
            date_cols.append(col)
    
    if date_cols:
        recomendaciones.append("• **Análisis temporal**: Las columnas " + ", ".join(date_cols) + " parecen contener información temporal. Considere convertirlas a formato datetime y realizar análisis de series temporales.")
    
    # Imprimir recomendaciones
    if recomendaciones:
        for rec in recomendaciones:
            print(rec)
        
        print("\\n**Próximos pasos recomendados:**")
        print("1. Limpiar los datos (valores nulos, outliers)")
        print("2. Crear nuevas características derivadas")
        print("3. Aplicar normalización o estandarización si es necesario")
        print("4. Explorar relaciones entre variables con gráficos adicionales")
    else:
        print("No se generaron recomendaciones específicas para este dataset.")
        
except Exception as e:
    print("Error generando recomendaciones: " + str(e))
`;
    
    const recomResult = await notebookExecutor.executeCode(recomCode, 'recommendations');
    
    // Añadir recomendaciones como celda markdown
    addNotebookCell('markdown', `
### Recomendaciones Automáticas

${recomResult.output ? recomResult.output.replace(/•/g, '* ') : 'No se pudieron generar recomendaciones automáticas.'}

### Conclusión

Este análisis exploratorio básico ofrece una primera visión de los datos. Para un análisis más profundo, considere implementar las recomendaciones anteriores y adaptar el análisis según los objetivos específicos de su proyecto.
    `);
    
    // Notificar que el notebook ha sido generado
    addAgentMessage(`✅ Notebook exploratorio generado exitosamente. Puedes ejecutar las celdas para ver los resultados.`);
    
  } catch (error) {
    console.error('Error generando notebook automático:', error);
    addAgentMessage(`❌ Error generando notebook automático: ${error.message}`);
  }
}

async function initializeNotebookExecutor() {
  try {
    notebookExecutor = new NotebookExecutor();
    const success = await notebookExecutor.initialize();
    if (success) {
      addAgentMessage('🐍 Ejecutor de Python inicializado. ¡Ya puedes ejecutar código!');
    } else {
      addAgentMessage('⚠️ Error inicializando el ejecutor de Python. Algunas funciones podrían no estar disponibles.');
    }
  } catch (error) {
    console.error('Error inicializando notebook executor:', error);
    addAgentMessage('❌ Error configurando el entorno Python.');
  }
}

function setupAgentEventListeners() {
  // Configurar el input del agente
  const agentInput = document.getElementById('agent-input');
  if (agentInput) {
    agentInput.addEventListener('keypress', handleAgentInput);
  }
}

// Función para manejar la entrada del agente
export function handleAgentInput(event) {
  if (event.key === 'Enter') {
    const input = event.target;
    const message = input.value.trim();
    if (message) {
      sendMessageToAgent(message);
      input.value = '';
    }
  }
}

// Enviar mensaje al agente
async function sendMessageToAgent(userMessage) {
  // Mostrar mensaje del usuario
  addUserMessage(userMessage);
  
  // Añadir a la memoria de conversación
  conversationHistory.push({
    role: 'user',
    content: userMessage
  });
  
  // Mostrar indicador de carga
  const loadingMessage = addAgentMessage('🤔 Pensando...');
  
  try {
    // Obtener configuración actual del modelo
    const config = window.modelConfig ? window.modelConfig.getConfig() : null;
    
    if (!config) {
      throw new Error('No se pudo cargar la configuración del modelo. Abre el panel de configuración para configurar el modelo.');
    }

    // Preparar el prompt del sistema
    const systemPrompt = `Eres un experto analista de datos y estadístico especializado en Python, con amplio conocimiento en:

📊 ANÁLISIS DE DATOS:
- Exploración y limpieza de datos
- Estadística descriptiva e inferencial
- Detección de outliers y patrones
- Análisis de correlaciones y relaciones

📈 VISUALIZACIÓN:
- Matplotlib, seaborn, plotly para gráficos
- Dashboards interactivos
- Mapas de calor, diagramas de dispersión
- Series temporales y tendencias

🔬 ESTADÍSTICA AVANZADA:
- Pruebas de hipótesis
- Regresión lineal y logística
- Análisis de varianza (ANOVA)
- Machine learning básico

🐍 CÓDIGO PYTHON:
- Pandas para manipulación de datos
- NumPy para cálculos numéricos
- Scipy para estadística
- Scikit-learn para ML

INSTRUCCIONES ESPECÍFICAS:
1. Cuando hables de datos, referencia SIEMPRE los datos reales cargados en el notebook
2. Proporciona análisis específicos basados en las columnas y valores actuales
3. Sugiere análisis apropiados según el tipo de datos disponibles
4. Genera código Python ejecutable y bien comentado
5. Da recomendaciones de limpieza y transformación cuando sea necesario
6. Explica los conceptos estadísticos de forma clara

FORMATO ESTRICTO DE CELDAS (IMPORTANTE):
• Cada bloque de código Python debe ir dentro de:
<VSCode.Cell language="python">
# Código Python aquí
</VSCode.Cell>
• Cada explicación o texto debe ir dentro de:
<VSCode.Cell language="markdown">
# Título del análisis
Explicación aquí
</VSCode.Cell>
• Si el usuario pide código, SIEMPRE incluye al menos una celda de código Python ejecutable.
• Si el usuario pide análisis, incluye tanto celdas markdown como celdas de código.
• No incluyas nada fuera de estos bloques.

EJEMPLO:
<VSCode.Cell language="markdown">
# Análisis exploratorio
Vamos a analizar el dataset cargado.
</VSCode.Cell>
<VSCode.Cell language="python">
# Mostrar las primeras filas

</VSCode.Cell>

ESTADO ACTUAL DE DATOS:
${await getDatasetContext()}

Sé proactivo: si hay datos cargados, sugiere análisis específicos. Si no hay datos, ofrece cargar datasets de ejemplo o explica cómo cargar datos.`;
    // Preparar mensajes para la API
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10) // Mantener últimas 10 interacciones
    ];

    // Preparar headers y body usando la configuración
    const headers = window.modelConfig.getRequestHeaders(config.provider, config.apiKey);
    const body = window.modelConfig.formatRequestForProvider(config.provider, messages, config);

    // Llamar a la API del LLM
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const agentResponse = window.modelConfig.extractResponse(config.provider, data);

    if (!agentResponse) {
      throw new Error('No se recibió respuesta válida del modelo');
    }

    // Remover mensaje de carga
    loadingMessage.remove();

    // Mostrar respuesta del agente
    addAgentMessage(agentResponse);
    
    // Añadir respuesta a la memoria
    conversationHistory.push({
      role: 'assistant',
      content: agentResponse
    });

    // Procesar celdas si las hay en la respuesta
    processCellsInResponse(agentResponse);

  } catch (error) {
    console.error('Error comunicándose con el agente:', error);
    loadingMessage.remove();
    
    let errorMessage = `❌ Error: ${error.message}`;
    
    // Añadir consejos específicos según el tipo de error
    if (error.message.includes('configuración')) {
      errorMessage += '\n\n💡 Solución: Haz clic en ⚙️ en el header para configurar tu modelo IA.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage += '\n\n💡 Soluciones:\n• Verifica que el servicio esté ejecutándose\n• Revisa la URL del endpoint\n• Comprueba tu conexión a internet';
    } else if (error.message.includes('HTTP 401') || error.message.includes('HTTP 403')) {
      errorMessage += '\n\n💡 Solución: Verifica tu API Key en la configuración.';
    }
    
    addAgentMessage(errorMessage);
  }
}

// Procesar celdas en la respuesta del agente
function processCellsInResponse(response) {
  const cellRegex = /<VSCode\.Cell\s+language="([\w]+)"[^>]*>([\s\S]*?)<\/VSCode\.Cell>/g;
  let match;
  
  let foundCode = false;
  while ((match = cellRegex.exec(response)) !== null) {
    const language = match[1];
    const content = match[2].trim();
    addNotebookCell(language, content);
    if (language === 'python') foundCode = true;
  }
  // Si no se detectó ninguna celda de código y la respuesta parece un análisis, advertir al usuario
  if (!foundCode && response.toLowerCase().includes('análisis')) {
    addAgentMessage('⚠️ No se detectó ninguna celda de código Python en la respuesta. Si pediste código, intenta ser más explícito o reintenta tu pregunta.');
  }
}

// Añadir celda al notebook
function addNotebookCell(language, content) {
  const notebookCells = document.getElementById('notebook-cells');
  if (!notebookCells) return;

  // Remover mensaje de placeholder si existe
  const placeholder = notebookCells.querySelector('[style*="text-align: center"]');
  if (placeholder) {
    placeholder.remove();
  }

  const cellDiv = document.createElement('div');
  cellDiv.className = `notebook-cell ${language}-cell`;
  
  const cellId = 'cell-' + Date.now() + Math.random().toString(36).substr(2, 9);
  cellDiv.setAttribute('data-cell-id', cellId);
  
  // Renderizar contenido según el tipo
  let renderedContent;
  if (language === 'markdown') {
    // Usar marked.js para renderizar Markdown si está disponible
    if (typeof marked !== 'undefined') {
      renderedContent = `<div class="markdown-content">${marked.parse(content)}</div>`;
    } else {
      renderedContent = `<div class="markdown-content">${content.replace(/\n/g, '<br>')}</div>`;
    }
  } else {
    renderedContent = `<pre><code>${content}</code></pre>`;
  }
  
  cellDiv.innerHTML = `
    <div class="cell-header">${language === 'python' ? '🐍' : '📝'} ${language.charAt(0).toUpperCase() + language.slice(1)} • ${cellId}</div>
    <div class="cell-content">
      ${renderedContent}
    </div>
    <div class="cell-controls">
      ${language === 'python' ? '<button class="cell-btn run-cell-btn" onclick="runCell(this)">▶️ Ejecutar</button>' : ''}
      <button class="cell-btn edit-cell-btn" onclick="editCell(this)">✏️ Editar</button>
      <button class="cell-btn delete-cell-btn" onclick="deleteCell(this)">🗑️ Eliminar</button>
    </div>
  `;
  
  notebookCells.appendChild(cellDiv);
  cellDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function addUserMessage(message) {
  const chatRoot = document.getElementById('agent-chat');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message message-user';
  msgDiv.innerHTML = `
    <div class="message-header">👤 Usuario</div>
    <div>${message}</div>
  `;
  chatRoot.appendChild(msgDiv);
  chatRoot.scrollTop = chatRoot.scrollHeight;
}

function setupPyodideListeners() {
  onPyodideLoading((event) => {
    const { cdn, attempt } = event.detail;
    addAgentMessage(`🔄 Cargando Python desde CDN ${attempt}...`);
  });

  onPyodideReady((event) => {
    const { cdn } = event.detail;
    addAgentMessage(`✅ Python listo! Usando CDN: ${cdn.includes('jsdelivr') ? 'JSDelivr' : cdn.includes('unpkg') ? 'UNPKG' : 'Pyodide CDN'}`);
  });

  onPyodideError((event) => {
    addAgentMessage(`❌ Error cargando Python: ${event.detail}`);
    addAgentMessage(`💡 Soluciones: Verificar conexión, cambiar DNS, o usar VPN`);
  });
}

export function onAgentReady(callback) {
  document.addEventListener('agent-ready', callback);
}

export function addAgentMessage(message) {
  const chatRoot = document.getElementById('agent-chat');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message message-agent';
  msgDiv.innerHTML = `
    <div class="message-header">🤖 Asistente</div>
    <div>${message}</div>
  `;
  chatRoot.appendChild(msgDiv);
  chatRoot.scrollTop = chatRoot.scrollHeight;
  return msgDiv; // Retornar elemento para poder eliminarlo después
}

// Funciones globales para los botones (las exponemos al window)
window.clearChat = function() {
  const chatRoot = document.getElementById('agent-chat');
  if (chatRoot) {
    chatRoot.innerHTML = '';
    conversationHistory = [];
    const welcome = document.createElement('div');
    welcome.className = 'chat-message message-agent';
    welcome.innerHTML = `
      <div class="message-header">🤖 Asistente</div>
      <div>Chat limpiado. ¿En qué puedo ayudarte?</div>
    `;
    chatRoot.appendChild(welcome);
  }
};

window.clearCells = function() {
  const notebookCells = document.getElementById('notebook-cells');
  if (notebookCells) {
    notebookCells.innerHTML = `
      <div style="text-align: center; color: var(--muted); padding: 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
        <div>Las celdas generadas por el asistente aparecerán aquí</div>
      </div>
    `;
  }
};

window.clearOutput = function() {
  const outputContent = document.getElementById('output-content');
  if (outputContent) {
    outputContent.innerHTML = `
      <div style="text-align: center; color: var(--muted); padding: 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📈</div>
        <div>Los resultados y gráficos del código ejecutado aparecerán aquí</div>
      </div>
    `;
  }
};

window.clearAll = function() {
  window.clearChat();
  window.clearCells();
  window.clearOutput();
};

window.loadSample = function() {
  // Cargar dataset de ejemplo y generar análisis
  if (window.dataUI) {
    window.dataUI.loadSampleDataset('sales').then(() => {
      // Después de cargar datos, enviar mensaje al agente
      setTimeout(() => {
        sendMessageToAgent('Analiza el dataset de ventas que acabamos de cargar. Muéstrame las estadísticas más importantes, detecta patrones interesantes y crea algunas visualizaciones clave.');
      }, 2000);
    });
  } else {
    // Fallback al comportamiento anterior
    sendMessageToAgent('Crea un ejemplo de análisis de datos con pandas que incluya: 1) cargar datos de ejemplo, 2) exploración básica, 3) una visualización simple con matplotlib');
  }
};

window.exportNotebook = function(format = 'ipynb') {
  addAgentMessage(`📁 Exportación a ${format} en desarrollo. Pronto estará disponible.`);
};

window.runCell = async function(button) {
  const cell = button.closest('.notebook-cell');
  if (!cell) return;
  
  const cellId = cell.getAttribute('data-cell-id') || 'unknown';
  const codeElement = cell.querySelector('pre code');
  
  if (!codeElement) {
    addAgentMessage('❌ No se encontró código para ejecutar en esta celda.');
    return;
  }
  
  const code = codeElement.textContent;
  
  // Marcar celda como ejecutándose
  cell.classList.add('cell-executing');
  button.disabled = true;
  button.textContent = '⚡ Ejecutando...';
  
  try {
    if (!notebookExecutor) {
      addAgentMessage('⚠️ Ejecutor no inicializado. Iniciando...');
      await initializeNotebookExecutor();
    }
    
    const result = await notebookExecutor.executeCode(code, cellId);
    
    if (result.success) {
      addAgentMessage(`✅ Celda ${cellId} ejecutada correctamente.`);
    } else {
      addAgentMessage(`❌ Error en celda ${cellId}: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error ejecutando celda:', error);
    addAgentMessage(`❌ Error ejecutando código: ${error.message}`);
  } finally {
    // Quitar estado de ejecución
    cell.classList.remove('cell-executing');
    button.disabled = false;
    button.textContent = '▶️ Ejecutar';
  }
};

window.editCell = function(button) {
  const cell = button.closest('.notebook-cell');
  if (!cell) return;
  
  const contentDiv = cell.querySelector('.cell-content');
  const isMarkdown = cell.classList.contains('markdown-cell');
  
  if (cell.classList.contains('editing')) {
    // Guardar cambios
    saveCell(cell, contentDiv, isMarkdown);
  } else {
    // Entrar en modo edición
    enterEditMode(cell, contentDiv, isMarkdown);
  }
};

function enterEditMode(cell, contentDiv, isMarkdown) {
  const originalContent = isMarkdown ? 
    contentDiv.querySelector('.markdown-content').innerHTML.replace(/<br>/g, '\n') :
    contentDiv.querySelector('code').textContent;
  
  const textarea = document.createElement('textarea');
  textarea.value = originalContent;
  textarea.style.width = '100%';
  textarea.style.minHeight = '100px';
  textarea.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
  textarea.style.color = 'white';
  textarea.style.border = '1px solid var(--border)';
  textarea.style.borderRadius = '4px';
  textarea.style.padding = '0.5rem';
  textarea.style.fontFamily = isMarkdown ? 'inherit' : 'monospace';
  textarea.style.fontSize = '0.9rem';
  textarea.style.resize = 'vertical';
  
  contentDiv.innerHTML = '';
  contentDiv.appendChild(textarea);
  
  cell.classList.add('editing');
  
  const editButton = cell.querySelector('.edit-cell-btn');
  editButton.textContent = '💾 Guardar';
  
  textarea.focus();
}

function saveCell(cell, contentDiv, isMarkdown) {
  const textarea = contentDiv.querySelector('textarea');
  const newContent = textarea.value;
  
  if (isMarkdown) {
    contentDiv.innerHTML = `<div class="markdown-content">${newContent.replace(/\n/g, '<br>')}</div>`;
  } else {
    contentDiv.innerHTML = `<pre><code>${newContent}</code></pre>`;
  }
  
  cell.classList.remove('editing');
  
  const editButton = cell.querySelector('.edit-cell-btn');
  editButton.textContent = '✏️ Editar';
  
  addAgentMessage('✅ Celda guardada correctamente.');
}

window.deleteCell = function(button) {
  const cell = button.closest('.notebook-cell');
  if (cell && confirm('¿Eliminar esta celda?')) {
    cell.remove();
  }
};

// Permite al agente cargar datos desde cualquier fuente: archivo, URL/API, base de datos
// Uso: window.agent.loadData({ type: 'file'|'url'|'database', file, url, dbConfig, format, ... })
window.agent = window.agent || {};

/**
 * Carga datos desde distintas fuentes y formatos.
 * @param {Object} options - Opciones de carga
 * @param {'file'|'url'|'database'} options.type - Tipo de fuente
 * @param {File} [options.file] - Archivo local (File API)
 * @param {string} [options.url] - URL o endpoint API
 * @param {Object} [options.dbConfig] - Configuración de base de datos (host, user, pass, query, etc.)
 * @param {string} [options.format] - Formato explícito ('csv', 'json', 'excel', etc.)
 * @param {Object} [options.headers] - Headers para API
 * @returns {Promise<Object>} Resultado de la carga
 */
window.agent.loadData = async function(options) {
  if (!window.dataLoader) throw new Error('DataLoader no disponible');
  if (!options || !options.type) throw new Error('Debes especificar el tipo de fuente de datos');

  if (options.type === 'file') {
    if (!options.file) throw new Error('Debes proporcionar un archivo');
    return await window.dataLoader.loadFromFile(options.file);
  }
  if (options.type === 'url') {
    if (!options.url) throw new Error('Debes proporcionar una URL');
    return await window.dataLoader.loadFromURL(options.url, options.format || '', options.headers || {});
  }
  if (options.type === 'database') {
    // Ejemplo: conexión a base de datos (requiere implementación Python y JS)
    // options.dbConfig = { host, user, password, database, query, ... }
    if (!options.dbConfig || !options.dbConfig.query) throw new Error('Debes proporcionar la configuración y consulta de la base de datos');
    if (!window.notebookExecutor) throw new Error('NotebookExecutor no disponible');
    // Aquí deberías implementar la lógica para enviar la consulta a Python (Pyodide o backend)
    // Por ejemplo, usando sqlalchemy/sqlite3/pandas.read_sql si está disponible en Pyodide
    // Este es un ejemplo básico para SQLite (requiere que el archivo esté en el FS virtual):
    const { dbFile, query } = options.dbConfig;
    if (!dbFile) throw new Error('Para SQLite, debes proporcionar el archivo de base de datos');
    // Subir archivo al FS virtual si es necesario
    if (window.notebookExecutor.pyodide) {
      const pyFS = window.notebookExecutor.pyodide.FS;
      try { pyFS.stat(`/data/raw/${dbFile.name}`); } catch {
        pyFS.writeFile(`/data/raw/${dbFile.name}`, new Uint8Array(await dbFile.arrayBuffer()));
      }
    }
    const pyCode = `
import pandas as pd\nimport sqlite3\nconn = sqlite3.connect('/data/raw/${dbFile.name}')\ndf = pd.read_sql_query("""${query}""", conn)\nglobals()['db_data'] = df\nprint('✅ Datos cargados desde base de datos')`;
    const result = await window.notebookExecutor.executeCode(pyCode, 'load_db');
    if (!result.success) throw new Error(result.error || 'Error ejecutando consulta SQL');
    // Registrar dataset en dataLoader
    window.dataLoader.currentDataset = {
      name: 'db_data',
      source: dbFile.name,
      format: 'sqlite',
      loadedAt: new Date(),
      rows: 'unknown',
      columns: 'unknown'
    };
    window.dataLoader.loadedDatasets.set('db_data', window.dataLoader.currentDataset);
    // Análisis automático
    await window.dataLoader.performAutomaticAnalysis('db_data');
    // Notificar
    setTimeout(() => {
      const event = new CustomEvent('dataset-loaded', { detail: { dataset: window.dataLoader.currentDataset } });
      document.dispatchEvent(event);
    }, 100);
    return { success: true, dataset: window.dataLoader.currentDataset };
  }
  throw new Error('Tipo de fuente de datos no soportado: ' + options.type);
};
