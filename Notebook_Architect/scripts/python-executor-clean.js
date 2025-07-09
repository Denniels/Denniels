// Python Executor - Versión limpia y optimizada

import PackageManager from './package-manager.js';

class PythonExecutor {
    constructor() {
        this.pyodide = null;
        this.isReady = false;
        this.installedPackages = new Set();
        this.packageManager = null;
    }

    async initialize() {
        if (this.isReady) return true;

        try {
            console.log('🔄 Inicializando Pyodide...');
            
            // Verificación robusta de loadPyodide
            if (typeof loadPyodide === 'undefined') {
                console.error('❌ loadPyodide no está disponible');
                console.error('🔍 Verifica:');
                console.error('   • DevTools > Network > buscar errores de pyodide.js');
                console.error('   • Conexión a internet activa');
                console.error('   • CDN https://cdn.pyodide.org accesible');
                throw new Error('loadPyodide no está disponible. Error de carga del CDN - verifica tu conexión a internet y recarga la página.');
            }
            
            // Cargar con timeout
            console.log('⏳ Cargando instancia de Pyodide (máximo 30s)...');
            
            // 🔧 SOLUCIÓN: Usar el CDN que funcionó para cargar recursos
            let indexURL = "https://cdn.pyodide.org/v0.24.1/full/"; // Default
            
            if (window.successfulPyodideCDN) {
                // Convertir URL del script a URL del directorio
                const cdnUrl = window.successfulPyodideCDN;
                if (cdnUrl.includes('jsdelivr.net')) {
                    indexURL = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/";
                } else if (cdnUrl.includes('unpkg.com')) {
                    indexURL = "https://unpkg.com/pyodide@0.24.1/";
                } else {
                    indexURL = "https://cdn.pyodide.org/v0.24.1/full/";
                }
                console.log(`🎯 Usando CDN exitoso para recursos: ${indexURL}`);
            } else {
                console.log(`⚠️ CDN exitoso no detectado, usando CDN por defecto: ${indexURL}`);
            }
            
            this.pyodide = await Promise.race([
                loadPyodide({
                    indexURL: indexURL
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout: Pyodide tardó más de 30 segundos en cargar')), 30000)
                )
            ]);

            console.log('✅ Pyodide cargado exitosamente');

            // Instalar paquetes base
            console.log('Instalando paquetes base...');
            await this.pyodide.loadPackage(['numpy', 'pandas', 'matplotlib', 'scipy', 'micropip']);

            // Configurar entorno Python
            await this.pyodide.runPython(`
import sys
import io
import base64
import json
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Configurar matplotlib para uso en web
matplotlib.use('Agg')

# Función para capturar plots
def capture_plot():
    try:
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close('all')  # Cerrar todas las figuras
        return f"data:image/png;base64,{image_base64}"
    except Exception as e:
        print(f"Error capturando plot: {e}")
        return None

# Funciones utilitarias
def get_sample_data(dataset_type='iris', n_samples=100):
    """Genera datos de ejemplo según el tipo especificado"""
    np.random.seed(42)
    
    if dataset_type == 'iris':
        try:
            from sklearn.datasets import load_iris
            data = load_iris()
            df = pd.DataFrame(data.data, columns=data.feature_names)
            df['species'] = data.target
            df['species'] = df['species'].map({0: 'setosa', 1: 'versicolor', 2: 'virginica'})
            return df
        except ImportError as e:
            print(f"❌ Error importando sklearn: {e}")
            print("💡 Generando datos sintéticos tipo Iris...")
            # Crear datos sintéticos similares a Iris
            return pd.DataFrame({
                'sepal_length': np.random.normal(5.8, 0.8, n_samples),
                'sepal_width': np.random.normal(3.0, 0.4, n_samples),
                'petal_length': np.random.normal(3.7, 1.7, n_samples),
                'petal_width': np.random.normal(1.2, 0.7, n_samples),
                'species': np.random.choice(['setosa', 'versicolor', 'virginica'], n_samples)
            })
    elif dataset_type == 'sales':
        dates = pd.date_range('2024-01-01', periods=n_samples, freq='D')
        return pd.DataFrame({
            'date': dates,
            'product': np.random.choice(['A', 'B', 'C'], n_samples),
            'quantity': np.random.randint(1, 100, n_samples),
            'price': np.random.uniform(10, 1000, n_samples),
            'region': np.random.choice(['North', 'South', 'East', 'West'], n_samples)
        })
    elif dataset_type == 'random':
        return pd.DataFrame({
            'x': np.random.randn(n_samples),
            'y': np.random.randn(n_samples),
            'category': np.random.choice(['A', 'B', 'C'], n_samples),
            'value': np.random.uniform(0, 100, n_samples)
        })
    else:
        return pd.DataFrame({
            'col1': np.random.randn(n_samples),
            'col2': np.random.randn(n_samples)
        })

print("✅ Entorno Python configurado correctamente")
            `);

            // Inicializar el gestor de paquetes
            this.packageManager = new PackageManager(this.pyodide);

            // Instalar paquetes adicionales con micropip
            await this.installAdditionalPackages();

            this.isReady = true;
            console.log('Python listo para usar');
            return true;

        } catch (error) {
            console.error('❌ Error inicializando Python:', error);
            console.error('📊 Detalles del error:');
            console.error('   Tipo:', error.name);
            console.error('   Mensaje:', error.message);
            
            // Análisis del error y sugerencias
            if (error.message.includes('loadPyodide no está disponible')) {
                console.error('🎯 PROBLEMA: Script de Pyodide no cargado');
                console.error('📋 SOLUCIONES:');
                console.error('   • Verificar conexión a internet');
                console.error('   • Comprobar DevTools > Network > errores de red');
                console.error('   • Probar recargar la página');
                console.error('   • Verificar si cdn.pyodide.org está accesible');
            } else if (error.message.includes('Timeout')) {
                console.error('🎯 PROBLEMA: Timeout cargando Pyodide');
                console.error('📋 SOLUCIONES:');
                console.error('   • Conexión lenta - esperar más tiempo');
                console.error('   • CDN sobrecargado - usar CDN alternativo');
                console.error('   • Problema de red intermitente - reintentar');
            }
            
            return false;
        }
    }

    async installAdditionalPackages() {
        try {
            console.log('📦 Instalando paquetes adicionales...');
            
            // Usar el nuevo PackageManager para instalar paquetes esenciales
            if (this.packageManager) {
                await this.packageManager.installEssentialPackages();
            } else {
                console.warn('⚠️ PackageManager no disponible, usando método legacy');
                await this._legacyInstallPackages();
            }
            
        } catch (error) {
            console.warn('⚠️ Algunos paquetes adicionales no se pudieron instalar:', error);
        }
    }

    async _legacyInstallPackages() {
        await this.pyodide.runPythonAsync(`
import micropip

# Lista de paquetes esenciales
packages = [
    'seaborn', 'scikit-learn', 'plotly'
]

async def install_packages():
    # Instalar paquetes
    for package in packages:
        try:
            await micropip.install(package)
            print(f"✅ {package} instalado")
        except Exception as e:
            print(f"⚠️ Error instalando {package}: {e}")

    # Importar librerías adicionales
    try:
        import seaborn as sns
        import plotly.express as px
        import plotly.graph_objects as go
        from sklearn.datasets import load_iris, load_wine, load_breast_cancer
        from sklearn.model_selection import train_test_split
        from sklearn.linear_model import LinearRegression
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import accuracy_score, mean_squared_error
        print("📦 Librerías científicas disponibles")
    except ImportError as e:
        print(f"⚠️ Algunas librerías no disponibles: {e}")

    print("🎯 Entorno Python completo y listo")

# Ejecutar la instalación
await install_packages()
        `);
    }

    /**
     * Asegurar que un paquete esté disponible antes de usarlo
     */
    async ensurePackage(packageName) {
        if (!this.packageManager) {
            console.warn('⚠️ PackageManager no disponible');
            return false;
        }
        
        return await this.packageManager.ensurePackage(packageName);
    }

    async executeCode(code) {
        if (!this.isReady) {
            throw new Error('Python no está inicializado');
        }

        if (!code || code.trim() === '') {
            throw new Error('No hay código para ejecutar');
        }

        try {
            // Capturar stdout
            await this.pyodide.runPython(`
import sys
import io
_stdout = sys.stdout
sys.stdout = mystdout = io.StringIO()
            `);

            // Ejecutar código del usuario
            const result = this.pyodide.runPython(code);

            // Obtener salida
            const stdout = this.pyodide.runPython('mystdout.getvalue()');
            this.pyodide.runPython('sys.stdout = _stdout');

            // Verificar si hay plots
            const hasPlot = this.pyodide.runPython(`
try:
    len(plt.get_fignums()) > 0
except:
    False
            `);

            let plotData = null;
            if (hasPlot) {
                plotData = this.pyodide.runPython('capture_plot()');
            }

            return {
                success: true,
                result: result,
                stdout: stdout,
                plotData: plotData,
                error: null
            };

        } catch (error) {
            // Restaurar stdout en caso de error
            try {
                this.pyodide.runPython('sys.stdout = _stdout');
            } catch (e) {
                console.error('Error restaurando stdout:', e);
            }

            return {
                success: false,
                result: null,
                stdout: '',
                plotData: null,
                error: error.message
            };
        }
    }

    getVariables() {
        if (!this.isReady) return {};

        try {
            const variables = this.pyodide.runPython(`
import json

# Obtener variables del usuario
user_vars = {}
excluded = {'sys', 'io', 'base64', 'json', 'matplotlib', 'plt', 'np', 'pd', 
           'capture_plot', 'get_sample_data', 'mystdout', '_stdout', 'sns', 
           'px', 'go', 'load_iris', 'load_wine', 'load_breast_cancer',
           'train_test_split', 'LinearRegression', 'RandomForestClassifier',
           'accuracy_score', 'mean_squared_error'}

for name, value in globals().items():
    if not name.startswith('_') and name not in excluded:
        try:
            var_type = type(value).__name__
            var_info = var_type
            
            # Información adicional según el tipo
            if hasattr(value, 'shape'):  # Arrays, DataFrames
                var_info += f" {value.shape}"
            elif hasattr(value, '__len__') and not isinstance(value, str):
                var_info += f" (len={len(value)})"
            
            user_vars[name] = var_info
        except:
            user_vars[name] = 'unknown'

json.dumps(user_vars)
            `);

            return JSON.parse(variables);
        } catch (error) {
            console.error('Error obteniendo variables:', error);
            return {};
        }
    }

    async installPackage(packageName) {
        if (!this.isReady) {
            throw new Error('Python no está inicializado');
        }

        if (this.installedPackages.has(packageName)) {
            return true;
        }

        try {
            await this.pyodide.runPython(`
import micropip
await micropip.install("${packageName}")
print(f"✅ Paquete {packageName} instalado correctamente")
            `);

            this.installedPackages.add(packageName);
            return true;
        } catch (error) {
            console.error(`Error instalando paquete ${packageName}:`, error);
            throw new Error(`No se pudo instalar ${packageName}: ${error.message}`);
        }
    }

    reset() {
        if (!this.isReady) return;

        try {
            // Limpiar namespace (mantener imports básicos)
            this.pyodide.runPython(`
# Limpiar variables del usuario
user_vars = []
excluded = {'sys', 'io', 'base64', 'json', 'matplotlib', 'plt', 'np', 'pd', 
           'capture_plot', 'get_sample_data', 'sns', 'px', 'go'}

for name in list(globals().keys()):
    if not name.startswith('_') and name not in excluded:
        user_vars.append(name)

for name in user_vars:
    try:
        del globals()[name]
    except:
        pass

# Cerrar todas las figuras
plt.close('all')

print("🗑️ Entorno limpiado")
            `);
        } catch (error) {
            console.error('Error limpiando entorno:', error);
        }
    }

    getStatus() {
        return {
            ready: this.isReady,
            installedPackages: Array.from(this.installedPackages)
        };
    }
}

// Crear instancia global
window.pythonExecutor = new PythonExecutor();

// Funciones globales para compatibilidad
window.initializePython = () => window.pythonExecutor.initialize();
window.executeCode = (code) => window.pythonExecutor.executeCode(code);
window.getPythonVariables = () => window.pythonExecutor.getVariables();
window.resetPython = () => window.pythonExecutor.reset();

console.log('✅ Python Executor cargado');
