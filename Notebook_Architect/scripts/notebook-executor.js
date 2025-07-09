// notebook-executor.js: Ejecutor de celdas de notebook
import { loadPyodideWithFallback } from './pyodide-loader.js';

class NotebookExecutor {
    /**
     * Instala un paquete si no está disponible (API compatible con PythonExecutor)
     */
    async ensurePackage(packageName) {
        if (!this.installedPackages) this.installedPackages = new Set();
        if (this.installedPackages.has(packageName)) return true;
        try {
            await this.installPackage(packageName);
            return true;
        } catch (e) {
            console.error(`No se pudo instalar el paquete ${packageName}:`, e);
            return false;
        }
    }
    constructor() {
        this.pyodide = null;
        this.isReady = false;
        this.installedPackages = new Set();
        this.variables = new Map();
    }

    async initialize() {
        if (this.isReady) return true;

        try {
            console.log('🔄 Inicializando ejecutor de notebook...');
            
            // Cargar Pyodide
            await loadPyodideWithFallback();
            
            if (typeof loadPyodide === 'undefined') {
                throw new Error('loadPyodide no está disponible');
            }

            this.pyodide = await loadPyodide({
                indexURL: this.getIndexURL()
            });

            // Instalar paquetes básicos
            await this.installBasicPackages();
            
            // Configurar captura de salida
            this.setupOutputCapture();
            
            this.isReady = true;
            console.log('✅ Ejecutor de notebook listo');
            return true;

        } catch (error) {
            console.error('❌ Error inicializando ejecutor:', error);
            return false;
        }
    }

    getIndexURL() {
        if (window.successfulPyodideCDN) {
            const cdnUrl = window.successfulPyodideCDN;
            if (cdnUrl.includes('jsdelivr.net')) {
                return "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/";
            } else if (cdnUrl.includes('unpkg.com')) {
                return "https://unpkg.com/pyodide@0.24.1/";
            }
        }
        return "https://cdn.pyodide.org/v0.24.1/full/";
    }

    async installBasicPackages() {
        const packages = ['numpy', 'pandas', 'matplotlib'];
        console.log('📦 Instalando paquetes básicos...');
        
        for (const pkg of packages) {
            try {
                await this.pyodide.loadPackage(pkg);
                this.installedPackages.add(pkg);
                console.log(`✅ ${pkg} instalado`);
            } catch (error) {
                console.warn(`⚠️ No se pudo instalar ${pkg}:`, error);
            }
        }
    }

    setupOutputCapture() {
        // Configurar captura de stdout y stderr
        this.pyodide.runPython(`
import sys
import io
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Configurar matplotlib para backend no interactivo
plt.ioff()  # Desactivar modo interactivo
plt.switch_backend('Agg')  # Backend para generar imágenes

# Variables globales para capturar salida
_stdout_capture = io.StringIO()
_stderr_capture = io.StringIO()
_original_stdout = sys.stdout
_original_stderr = sys.stderr

def start_capture():
    global _stdout_capture, _stderr_capture
    _stdout_capture = io.StringIO()
    _stderr_capture = io.StringIO()
    sys.stdout = _stdout_capture
    sys.stderr = _stderr_capture

def end_capture():
    global _stdout_capture, _stderr_capture
    sys.stdout = _original_stdout
    sys.stderr = _original_stderr
    stdout_value = _stdout_capture.getvalue()
    stderr_value = _stderr_capture.getvalue()
    return stdout_value, stderr_value

def get_figure_data():
    """Obtener datos de las figuras de matplotlib"""
    import base64
    figures = []
    
    # Obtener todas las figuras abiertas
    for i in plt.get_fignums():
        fig = plt.figure(i)
        
        # Guardar figura en buffer
        buffer = io.BytesIO()
        fig.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        
        # Convertir a base64
        img_data = base64.b64encode(buffer.getvalue()).decode()
        figures.append(f"data:image/png;base64,{img_data}")
        
        buffer.close()
    
    # Limpiar figuras
    plt.close('all')
    
    return figures
        `);
    }

    async executeCode(code, cellId) {
        if (!this.isReady) {
            await this.initialize();
        }

        try {
            // Limpiar salida anterior
            const outputElement = document.getElementById('output-content');
            
            // Iniciar captura
            this.pyodide.runPython('start_capture()');
            
            // Ejecutar código del usuario
            let result = this.pyodide.runPython(code);
            
            // Finalizar captura y obtener salidas
            const [stdout, stderr] = this.pyodide.runPython('end_capture()');
            
            // Obtener figuras de matplotlib
            const figures = this.pyodide.runPython('get_figure_data()');
            
            // Mostrar resultados
            this.displayResults({
                stdout,
                stderr,
                result,
                figures,
                cellId
            });

            // Actualizar variables
            this.updateVariablesList();

            return {
                success: true,
                stdout,
                stderr,
                result,
                figures: figures.toJs()
            };

        } catch (error) {
            this.displayError(error, cellId);
            return {
                success: false,
                error: error.message
            };
        }
    }

    displayResults({ stdout, stderr, result, figures, cellId }) {
        const outputContainer = document.getElementById('output-content');
        
        // Limpiar placeholder si existe
        const placeholder = outputContainer.querySelector('[style*="text-align: center"]');
        if (placeholder) {
            placeholder.remove();
        }

        // Crear contenedor para esta ejecución
        const executionDiv = document.createElement('div');
        executionDiv.className = 'execution-result';
        executionDiv.innerHTML = `
            <div class="execution-header">
                <span class="execution-cell">Celda ${cellId || 'desconocida'}</span>
                <span class="execution-time">${new Date().toLocaleTimeString()}</span>
            </div>
        `;

        // Mostrar stdout
        if (stdout && stdout.trim()) {
            const stdoutDiv = document.createElement('div');
            stdoutDiv.className = 'output-stdout';
            stdoutDiv.innerHTML = `<pre>${stdout}</pre>`;
            executionDiv.appendChild(stdoutDiv);
        }

        // Mostrar stderr
        if (stderr && stderr.trim()) {
            const stderrDiv = document.createElement('div');
            stderrDiv.className = 'output-stderr';
            stderrDiv.innerHTML = `<pre style="color: var(--error);">${stderr}</pre>`;
            executionDiv.appendChild(stderrDiv);
        }

        // Mostrar resultado si no es None
        if (result !== undefined && result !== null && result.toString() !== 'None') {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'output-result';
            resultDiv.innerHTML = `<pre><strong>Out:</strong> ${result}</pre>`;
            executionDiv.appendChild(resultDiv);
        }

        // Mostrar figuras
        if (figures && figures.length > 0) {
            figures.forEach((figData, index) => {
                const figDiv = document.createElement('div');
                figDiv.className = 'output-plot';
                figDiv.innerHTML = `<img src="${figData}" alt="Gráfico ${index + 1}" style="max-width: 100%; border-radius: 8px;">`;
                executionDiv.appendChild(figDiv);
            });
        }

        outputContainer.appendChild(executionDiv);
        outputContainer.scrollTop = outputContainer.scrollHeight;
    }

    displayError(error, cellId) {
        const outputContainer = document.getElementById('output-content');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'execution-result error-result';
        errorDiv.innerHTML = `
            <div class="execution-header">
                <span class="execution-cell">Celda ${cellId || 'desconocida'}</span>
                <span class="execution-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="error-message">
                <strong>Error:</strong><br>
                <pre>${error.message}</pre>
            </div>
        `;

        outputContainer.appendChild(errorDiv);
        outputContainer.scrollTop = outputContainer.scrollHeight;
    }

    updateVariablesList() {
        try {
            // Obtener variables del namespace de Python
            const variables = this.pyodide.runPython(`
import sys
vars_info = []
for name, value in globals().items():
    if not name.startswith('_') and name not in ['sys', 'io', 'matplotlib', 'plt', 'np', 'pd']:
        try:
            var_type = type(value).__name__
            var_repr = str(value)[:50] + ('...' if len(str(value)) > 50 else '')
            vars_info.append({'name': name, 'type': var_type, 'value': var_repr})
        except:
            pass
vars_info
            `);

            // Actualizar badge de memoria
            const badge = document.getElementById('memory-badge');
            const count = variables.length;
            if (badge) {
                badge.querySelector('#memory-count').textContent = count;
                badge.title = count > 0 ? variables.map(v => `${v.name} (${v.type})`).join('\n') : 'Sin variables activas';
            }
        } catch (error) {
            // No hacer nada visual si falla
        }
    }

    getVariables() {
        return this.variables;
    }

    async installPackage(packageName) {
        if (this.installedPackages.has(packageName)) {
            return true;
        }

        try {
            await this.pyodide.loadPackage(packageName);
            this.installedPackages.add(packageName);
            return true;
        } catch (error) {
            console.error(`Error instalando ${packageName}:`, error);
            return false;
        }
    }
}

// Crear instancia global
window.notebookExecutor = new NotebookExecutor();

export { NotebookExecutor };
