// --- Renderizador de Notebooks JSON profesional ---
window.renderNotebookJSON = function(notebook) {
    // Selecciona el área donde se deben mostrar las celdas del notebook
    const notebookArea = document.getElementById('notebook-cells-area') || document.getElementById('notebook-area');
    if (!notebookArea) {
        console.error('No se encontró el área de notebook (notebook-cells-area o notebook-area) en el DOM.');
        return;
    }
    // Oculta el placeholder si existe
    const placeholder = document.getElementById('notebook-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    notebookArea.innerHTML = '';
    if (!notebook || !Array.isArray(notebook.cells) || notebook.cells.length === 0) {
        notebookArea.innerHTML = '<div class="notebook-error">❌ Error: Notebook vacío o formato inválido.</div>';
        // Si está vacío, mostrar el placeholder de nuevo
        if (placeholder) {
            placeholder.style.display = '';
        }
        return;
    }
    notebook.cells.forEach((cell, idx) => {
        const cellDiv = document.createElement('div');
        cellDiv.className = 'notebook-cell ' + (cell.cell_type === 'code' ? 'notebook-code-cell' : 'notebook-markdown-cell');
        // Número de celda visible
        const cellNumber = idx + 1;
        // Encabezado de celda
        const header = document.createElement('div');
        header.className = 'notebook-cell-header';
        header.textContent = `${cell.cell_type === 'code' ? 'Código' : 'Markdown'} (Celda ${cellNumber})`;
        cellDiv.appendChild(header);
        // Contenido
        const content = document.createElement('div');
        content.className = 'notebook-cell-content';
        if (cell.cell_type === 'code' && cell.metadata.language === 'python') {
            // Mostrar código Python con formato
            const pre = document.createElement('pre');
            pre.className = 'notebook-code-block';
            pre.textContent = Array.isArray(cell.source) ? cell.source.join('\n') : String(cell.source);
            content.appendChild(pre);
        } else if (cell.cell_type === 'markdown' && cell.metadata.language === 'markdown') {
            // Mostrar markdown como HTML simple (puedes mejorar con un parser si lo deseas)
            const md = Array.isArray(cell.source) ? cell.source.join('\n') : String(cell.source);
            const html = md.replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\#\s(.+)/g, '<h2>$1</h2>')
                .replace(/\#\#\s(.+)/g, '<h3>$1</h3>');
            content.innerHTML = html;
        } else {
            // Otro tipo de celda
            content.textContent = Array.isArray(cell.source) ? cell.source.join('\n') : String(cell.source);
        }
        cellDiv.appendChild(content);
        notebookArea.appendChild(cellDiv);
    });
};
// data-ui.js: Interfaz de usuario para carga y gestión de datos
import { DataLoader } from './data-loader.js';

class DataUI {
    constructor() {
        this.dataLoader = new DataLoader();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Zona Drag & Drop universal
        const dropArea = document.getElementById('data-drop-area');
        const fileInput = document.getElementById('data-file-input');
        if (!dropArea || !fileInput) return;

        // Drag & drop
        dropArea.addEventListener('dragover', e => {
            e.preventDefault();
            e.stopPropagation();
            dropArea.classList.add('dragover');
        });
        dropArea.addEventListener('dragleave', e => {
            e.preventDefault();
            e.stopPropagation();
            dropArea.classList.remove('dragover');
        });
        dropArea.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            dropArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.processFiles(files);
            }
        });

        // Click para abrir selector de archivos
        dropArea.addEventListener('click', () => {
            fileInput.value = '';
            fileInput.click();
        });
        dropArea.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                fileInput.value = '';
                fileInput.click();
            }
        });

        // Selección de archivos desde el input
        fileInput.addEventListener('change', e => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.processFiles(files);
            }
        });
    }

    setNotebookExecutor(executor) {
        this.dataLoader.setNotebookExecutor(executor);
    }

    // Mostrar panel de datos
    showDataPanel() {
        this.updateLoadedDatasetsList();
        document.getElementById('data-overlay').classList.remove('hidden');
    }

    // Ocultar panel de datos
    hideDataPanel() {
        document.getElementById('data-overlay').classList.add('hidden');
    }

    // Manejar drag over
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('dragover');
    }

    // Manejar drag leave
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');
    }

    // Manejar drop
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            this.processFiles(files);
        }
    }

    // Manejar selección de archivo
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.processFiles(files);
        }
    }

    // Procesar archivos seleccionados
    async processFiles(files) {
        for (const file of files) {
            await this.loadFile(file);
        }
    }

    // Cargar archivo individual
    async loadFile(file) {
        this.showLoadingStatus('loading', `📁 Cargando ${file.name}...`);

        try {
            const result = await this.dataLoader.loadFromFile(file);

            if (result.success) {
                this.showLoadingStatus('success', `✅ ${file.name} cargado exitosamente`);
                
                // Notificar al agente
                if (window.addAgentMessage) {
                    const dataset = result.dataset;
                    const message = `📊 Dataset "${dataset.name}" cargado exitosamente:\n• Archivo: ${dataset.file}\n• Tamaño: ${dataset.size} MB\n• Filas: ${dataset.rows}\n• Columnas: ${dataset.columns}\n\n🔍 Análisis automático completado. ¡Pregúntame sobre los datos!`;
                    window.addAgentMessage(message);
                    
                    // Disparar evento para análisis proactivo
                    document.dispatchEvent(new CustomEvent('dataset-loaded', { 
                        detail: { dataset: dataset } 
                    }));
                }

                // Actualizar lista de datasets
                this.updateLoadedDatasetsList();

                // Auto-cerrar panel después de un momento
                setTimeout(() => {
                    this.hideDataPanel();
                }, 3000);

            } else {
                this.showLoadingStatus('error', `❌ Error cargando ${file.name}: ${result.error}`);
            }

        } catch (error) {
            this.showLoadingStatus('error', `❌ Error inesperado: ${error.message}`);
        }
    }

    // Cargar datos desde URL
    async loadFromURL() {
        const urlInput = document.getElementById('url-input');
        const formatSelect = document.getElementById('url-format');
        const authInput = document.getElementById('auth-header');

        if (!urlInput || !urlInput.value.trim()) {
            this.showLoadingStatus('error', '❌ Ingresa una URL válida');
            return;
        }

        const url = urlInput.value.trim();
        // Si se selecciona "auto", pasar una cadena vacía para que se detecte automáticamente
        const format = formatSelect?.value === 'auto' ? '' : (formatSelect?.value || '');
        const authHeader = authInput?.value.trim();

        const headers = {};
        if (authHeader) {
            if (authHeader.startsWith('Bearer ') || authHeader.startsWith('Basic ') || authHeader.includes(':')) {
                headers['Authorization'] = authHeader;
            } else {
                headers['Authorization'] = `Bearer ${authHeader}`;
            }
        }

        this.showLoadingStatus('loading', `🌐 Cargando datos desde URL...`);

        try {
            const result = await this.dataLoader.loadFromURL(url, format, headers);

            if (result.success) {
                this.showLoadingStatus('success', `✅ Datos cargados desde URL exitosamente`);
                
                // Notificar al agente
                if (window.addAgentMessage) {
                    const dataset = result.dataset;
                    const message = `🌐 Dataset "${dataset.name}" cargado desde URL:\n• Fuente: ${dataset.source}\n• Formato: ${dataset.format}\n• Filas: ${dataset.rows}\n• Columnas: ${dataset.columns}\n\n🔍 Análisis automático completado. ¡Explora los datos!`;
                    window.addAgentMessage(message);
                    
                    // Disparar evento para análisis proactivo
                    document.dispatchEvent(new CustomEvent('dataset-loaded', { 
                        detail: { dataset: dataset } 
                    }));
                }

                // Actualizar lista y cerrar
                this.updateLoadedDatasetsList();
                setTimeout(() => {
                    this.hideDataPanel();
                }, 3000);

            } else {
                this.showLoadingStatus('error', `❌ Error cargando desde URL: ${result.error}`);
                console.error('Error cargando URL:', result.error);
            }

        } catch (error) {
            this.showLoadingStatus('error', `❌ Error inesperado: ${error.message}`);
            console.error('Error inesperado cargando URL:', error);
        }
    }

    // Cargar dataset de ejemplo
    async loadSampleDataset(datasetType) {
        this.showLoadingStatus('loading', `📋 Generando dataset de ejemplo...`);

        // Sanitizar el nombre para asegurar compatibilidad con Python
        const safeVarName = window.dataLoader.constructor.sanitizeVarName(`${datasetType}_data`);

        // Crear código Python para generar datasets de ejemplo
        let pythonCode;

        switch (datasetType) {
            case 'iris':
                pythonCode = `
# Dataset Iris - Clásico para clasificación
import pandas as pd
import numpy as np
from sklearn.datasets import load_iris

# Cargar dataset Iris
iris = load_iris()
iris_data = pd.DataFrame(iris.data, columns=iris.feature_names)
iris_data['species'] = iris.target_names[iris.target]

print("🌸 Dataset Iris generado:")
print("   • Filas: {}".format(len(iris_data)))
print("   • Columnas: {}".format(len(iris_data.columns)))
print("   • Especies: {}".format(iris_data['species'].nunique()))

# Asignar a variable global para acceso
globals()['${safeVarName}'] = iris_data
`;
                break;

            case 'sales':
                pythonCode = `
# Dataset de Ventas - Para análisis comercial
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)

# Generar datos de ventas
n_records = 1000
start_date = datetime(2023, 1, 1)

sales_data = pd.DataFrame({
    'fecha': [start_date + timedelta(days=np.random.randint(0, 365)) for _ in range(n_records)],
    'producto': np.random.choice(['Laptop', 'Mouse', 'Teclado', 'Monitor', 'Tablet'], n_records),
    'categoria': np.random.choice(['Electrónicos', 'Accesorios', 'Computadoras'], n_records),
    'precio': np.random.normal(500, 200, n_records).round(2),
    'cantidad': np.random.randint(1, 10, n_records),
    'vendedor': np.random.choice(['Ana', 'Carlos', 'María', 'José', 'Luis'], n_records),
    'region': np.random.choice(['Norte', 'Sur', 'Este', 'Oeste'], n_records)
})

sales_data['total'] = sales_data['precio'] * sales_data['cantidad']
sales_data = sales_data[sales_data['precio'] > 0]  # Eliminar precios negativos

print("💰 Dataset de Ventas generado:")
print("   • Filas: {}".format(len(sales_data)))
print("   • Columnas: {}".format(len(sales_data.columns)))
print("   • Rango de fechas: {} a {}".format(sales_data['fecha'].min(), sales_data['fecha'].max()))

# Asignar a variable global para acceso
globals()['${safeVarName}'] = sales_data
`;
                break;

            case 'stocks':
                pythonCode = `
# Dataset de Precios de Acciones - Series temporales
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)

# Generar serie temporal de precios
n_days = 365
start_date = datetime(2023, 1, 1)
dates = [start_date + timedelta(days=i) for i in range(n_days)]

# Simular precios con random walk
initial_price = 100
returns = np.random.normal(0.001, 0.02, n_days)  # Retornos diarios
prices = [initial_price]

for ret in returns[1:]:
    prices.append(prices[-1] * (1 + ret))

stocks_data = pd.DataFrame({
    'fecha': dates,
    'precio_apertura': prices,
    'precio_cierre': [p * (1 + np.random.normal(0, 0.01)) for p in prices],
    'volumen': np.random.randint(1000000, 10000000, n_days),
    'empresa': ['TechCorp'] * n_days
})

stocks_data['precio_maximo'] = stocks_data[['precio_apertura', 'precio_cierre']].max(axis=1) * (1 + np.random.uniform(0, 0.05, n_days))
stocks_data['precio_minimo'] = stocks_data[['precio_apertura', 'precio_cierre']].min(axis=1) * (1 - np.random.uniform(0, 0.05, n_days))

print("📈 Dataset de Acciones generado:")
print("   • Filas: {}".format(len(stocks_data)))
print("   • Columnas: {}".format(len(stocks_data.columns)))
print("   • Rango temporal: {} días".format(n_days))

# Asignar a variable global para acceso
globals()['${safeVarName}'] = stocks_data
`;
                break;

            case 'customers':
                pythonCode = `
# Dataset de Clientes - Análisis demográfico
import pandas as pd
import numpy as np

np.random.seed(42)

n_customers = 800

customers_data = pd.DataFrame({
    'id_cliente': range(1, n_customers + 1),
    'edad': np.random.randint(18, 80, n_customers),
    'genero': np.random.choice(['M', 'F'], n_customers),
    'ingresos': np.random.lognormal(10, 0.5, n_customers).round(0),
    'educacion': np.random.choice(['Secundaria', 'Universidad', 'Posgrado'], n_customers),
    'estado_civil': np.random.choice(['Soltero', 'Casado', 'Divorciado'], n_customers),
    'hijos': np.random.poisson(1.5, n_customers),
    'gasto_anual': np.random.normal(5000, 2000, n_customers).round(2),
    'satisfaccion': np.random.randint(1, 11, n_customers),
    'ciudad': np.random.choice(['Madrid', 'Barcelona', 'Valencia', 'Sevilla'], n_customers)
})

# Ajustar datos para que sean más realistas
customers_data['gasto_anual'] = np.where(customers_data['gasto_anual'] < 0, 
                                       np.abs(customers_data['gasto_anual']), 
                                       customers_data['gasto_anual'])

print("👥 Dataset de Clientes generado:")
print("   • Filas: {}".format(len(customers_data)))
print("   • Columnas: {}".format(len(customers_data.columns)))
print("   • Rango de edades: {} - {}".format(customers_data['edad'].min(), customers_data['edad'].max()))

# Asignar a variable global para acceso
globals()['${safeVarName}'] = customers_data
`;
                break;

            default:
                this.showLoadingStatus('error', '❌ Tipo de dataset no reconocido');
                return;
        }

        try {
            if (!this.dataLoader.notebookExecutor) {
                throw new Error('NotebookExecutor no disponible');
            }

            // Ejecutar código
            const result = await this.dataLoader.notebookExecutor.executeCode(pythonCode, `sample_${safeVarName}`);

            if (result.success) {
                // Verificar que la variable Python existe
                const checkVar = await this.dataLoader.notebookExecutor.executeCode(`'${safeVarName}' in globals()`, `check_${safeVarName}`);
                if (!checkVar.success || checkVar.result !== true) {
                    this.showLoadingStatus('error', `❌ No se pudo crear la variable Python '${safeVarName}'.`);
                    return;
                }
                // Crear dataset ficticio para tracking
                const sampleDataset = {
                    name: safeVarName,
                    file: `${datasetType}_ejemplo.py`,
                    format: 'python',
                    loadedAt: new Date(),
                    rows: 'generado',
                    columns: 'generado'
                };
                this.dataLoader.currentDataset = sampleDataset;
                this.dataLoader.loadedDatasets.set(sampleDataset.name, sampleDataset);
                this.showLoadingStatus('success', `✅ Dataset de ejemplo "${datasetType}" generado exitosamente`);
                // Notificar al agente
                if (window.addAgentMessage) {
                    const messages = {
                        iris: '🌸 Dataset Iris cargado: perfecto para clasificación y análisis exploratorio. ¡Pregúntame sobre las especies de flores!',
                        sales: '💰 Dataset de Ventas generado: ideal para análisis de tendencias, vendedores y regiones. ¡Analicemos las métricas!',
                        stocks: '📈 Dataset de Acciones creado: excelente para análisis de series temporales. ¡Exploremos las tendencias!',
                        customers: '👥 Dataset de Clientes disponible: perfecto para análisis demográfico y segmentación. ¡Descubramos insights!'
                    };
                    window.addAgentMessage(messages[datasetType]);
                    
                    // Disparar evento para análisis proactivo
                    document.dispatchEvent(new CustomEvent('dataset-loaded', { 
                        detail: { dataset: sampleDataset } 
                    }));
                }
                // Realizar análisis automático
                await this.dataLoader.performAutomaticAnalysis(safeVarName);
                this.updateLoadedDatasetsList();
                setTimeout(() => {
                    this.hideDataPanel();
                }, 3000);
            } else {
                this.showLoadingStatus('error', `❌ Error generando dataset: ${result.error}`);
            }

        } catch (error) {
            this.showLoadingStatus('error', `❌ Error inesperado: ${error.message}`);
        }
    }

    // Mostrar estado de carga
    showLoadingStatus(type, message) {
        const statusDiv = document.getElementById('data-loading-status');
        if (!statusDiv) return;

        statusDiv.classList.remove('hidden', 'success', 'error', 'testing');
        statusDiv.classList.add(type);
        statusDiv.textContent = message;

        if (type !== 'loading') {
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 5000);
        }
    }

    // Actualizar lista de datasets cargados
    updateLoadedDatasetsList() {
        const section = document.getElementById('loaded-datasets-section');
        const list = document.getElementById('loaded-datasets-list');
        
        if (!section || !list) return;

        const datasets = this.dataLoader.getLoadedDatasets();

        if (datasets.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        list.innerHTML = '';

        datasets.forEach(dataset => {
            const item = document.createElement('div');
            item.className = 'dataset-item';
            
            const isActive = this.dataLoader.currentDataset?.name === dataset.name;
            
            item.innerHTML = `
                <div class="dataset-info">
                    <div class="dataset-name">${dataset.name}</div>
                    <div class="dataset-meta">
                        ${dataset.format} • ${dataset.rows} filas • ${dataset.columns} columnas
                        ${dataset.loadedAt ? ` • ${dataset.loadedAt.toLocaleString()}` : ''}
                    </div>
                </div>
                <div class="dataset-actions">
                    <button class="dataset-btn ${isActive ? 'active' : ''}" 
                            onclick="dataUI.setActiveDataset('${dataset.name}')">
                        ${isActive ? '✅ Activo' : '🔄 Activar'}
                    </button>
                    <button class="dataset-btn" onclick="dataUI.analyzeDataset('${dataset.name}')">
                        🔍 Analizar
                    </button>
                </div>
            `;

            list.appendChild(item);
        });
    }

    // Activar dataset
    setActiveDataset(datasetName) {
        // Sanitizar el nombre usando el método de DataLoader
        const safeVarName = window.dataLoader.constructor.sanitizeVarName(datasetName);
        
        const success = this.dataLoader.setCurrentDataset(safeVarName);
        if (success) {
            this.updateLoadedDatasetsList();
            
            if (window.addAgentMessage) {
                window.addAgentMessage(`🔄 Dataset "${safeVarName}" activado. ¡Pregúntame sobre estos datos!`);
            }
        }
    }

    // Analizar dataset específico
    async analyzeDataset(datasetName) {
        // Sanitizar el nombre usando el método de DataLoader
        const safeVarName = window.dataLoader.constructor.sanitizeVarName(datasetName);
        
        this.showLoadingStatus('loading', `🔍 Analizando dataset "${safeVarName}"...`);
        
        try {
            await this.dataLoader.performAutomaticAnalysis(safeVarName);
            this.showLoadingStatus('success', `✅ Análisis de "${safeVarName}" completado`);
            
            if (window.addAgentMessage) {
                window.addAgentMessage(`🔍 Análisis automático de "${safeVarName}" completado. Revisa el panel de salida para ver las estadísticas y recomendaciones.`);
            }
        } catch (error) {
            this.showLoadingStatus('error', `❌ Error en análisis: ${error.message}`);
            console.error('Error analizando dataset:', error);
        }
    }
}

// Crear instancia global
window.dataUI = new DataUI();

// Funciones globales para el HTML
window.showDataPanel = () => window.dataUI.showDataPanel();
window.hideDataPanel = () => window.dataUI.hideDataPanel();
window.loadFromURL = () => window.dataUI.loadFromURL();
window.loadSampleDataset = (type) => window.dataUI.loadSampleDataset(type);

export { DataUI };
