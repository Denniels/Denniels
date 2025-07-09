/**
 * Gestión automática de paquetes Python en Pyodide
 */

class PackageManager {
    constructor(pyodide) {
        this.pyodide = pyodide;
        this.installedPackages = new Set();
        this.installationPromises = new Map();
        this.requiredPackages = {
            'sklearn': 'scikit-learn',
            'seaborn': 'seaborn',
            'plotly': 'plotly',
            'statsmodels': 'statsmodels',
            'xgboost': 'xgboost',
            'lightgbm': 'lightgbm',
            'tensorflow': 'tensorflow',
            'keras': 'keras',
            'torch': 'torch',
            'pytorch': 'torch',
            'mlxtend': 'mlxtend',
            'catboost': 'catboost',
            'imblearn': 'imbalanced-learn',
            'openpyxl': 'openpyxl',
            'pymc3': 'pymc3',
            'pymc': 'pymc',
            'networkx': 'networkx',
            'nltk': 'nltk',
            'spacy': 'spacy',
            'gensim': 'gensim',
            'umap': 'umap-learn',
            'hdbscan': 'hdbscan',
            'patsy': 'patsy',
            'sympy': 'sympy',
            'bokeh': 'bokeh',
            'altair': 'altair',
            'missingno': 'missingno',
            'pycaret': 'pycaret',
            'shap': 'shap',
            'lime': 'lime',
            'optuna': 'optuna',
            'hyperopt': 'hyperopt',
            'mlflow': 'mlflow',
            'pydot': 'pydot',
            'graphviz': 'graphviz',
            'pyarrow': 'pyarrow',
            'tables': 'tables',
            'pyod': 'pyod',
            'tslearn': 'tslearn',
            'prophet': 'prophet',
            'fbprophet': 'fbprophet',
            'pmdarima': 'pmdarima',
            'statsforecast': 'statsforecast',
            'holidays': 'holidays',
            'darts': 'darts',
            'bayesian-optimization': 'bayesian-optimization',
            'eli5': 'eli5',
            'yellowbrick': 'yellowbrick',
            'sweetviz': 'sweetviz',
            'autoviz': 'autoviz',
            'dtreeviz': 'dtreeviz',
            'wordcloud': 'wordcloud',
            'textblob': 'textblob',
            'sentence-transformers': 'sentence-transformers',
            'transformers': 'transformers',
            'datasets': 'datasets',
            'torchvision': 'torchvision',
            'torchaudio': 'torchaudio',
            'opencv-python': 'opencv-python',
            'cv2': 'opencv-python',
            'pillow': 'pillow',
            'imageio': 'imageio',
            'scikit-image': 'scikit-image',
            'scikit-optimize': 'scikit-optimize',
            'scikit-surprise': 'scikit-surprise',
            'imbalanced-learn': 'imbalanced-learn',
            'category_encoders': 'category_encoders',
            'feature-engine': 'feature-engine',
            'ml-insights': 'ml-insights',
            'ml-dtypes': 'ml-dtypes',
            'pandas-profiling': 'pandas-profiling',
            'ydata-profiling': 'ydata-profiling',
            'pycaret': 'pycaret',
            'fastai': 'fastai',
            'lightfm': 'lightfm',
            'surprise': 'scikit-surprise',
            'keras-tuner': 'keras-tuner',
            'pytorch-lightning': 'pytorch-lightning',
            'albumentations': 'albumentations',
            'segmentation-models': 'segmentation-models',
            'sentencepiece': 'sentencepiece',
            'fairseq': 'fairseq',
            'pytorch-tabnet': 'pytorch-tabnet',
            'pytorch-forecasting': 'pytorch-forecasting',
            'pytorch-lightning-bolts': 'pytorch-lightning-bolts',
            'pytorch-metric-learning': 'pytorch-metric-learning',
            'pytorch-widedeep': 'pytorch-widedeep',
            'pytorch-geometric': 'torch-geometric',
            'pytorch3d': 'pytorch3d',
            'pytorchvideo': 'pytorchvideo',
            'pytorchcv': 'pytorchcv',
            'pytorch-ignite': 'ignite',
            'ignite': 'ignite',
            'pytorch-lightning': 'pytorch-lightning',
            'pytorch-forecasting': 'pytorch-forecasting',
            'pytorch-tabnet': 'pytorch-tabnet',
            'pytorch-widedeep': 'pytorch-widedeep',
            'pytorch-metric-learning': 'pytorch-metric-learning',
            'pytorch-lightning-bolts': 'pytorch-lightning-bolts',
            'pytorch-geometric': 'torch-geometric',
            'pytorch3d': 'pytorch3d',
            'pytorchvideo': 'pytorchvideo',
            'pytorchcv': 'pytorchcv',
            'ignite': 'ignite',
            'sentencepiece': 'sentencepiece',
            'fairseq': 'fairseq',
            'transformers': 'transformers',
            'datasets': 'datasets',
            'sentence-transformers': 'sentence-transformers',
            'pandas-profiling': 'pandas-profiling',
            'ydata-profiling': 'ydata-profiling',
            'sweetviz': 'sweetviz',
            'autoviz': 'autoviz',
            'dtreeviz': 'dtreeviz',
            'yellowbrick': 'yellowbrick',
            'eli5': 'eli5',
            'lime': 'lime',
            'shap': 'shap',
            'optuna': 'optuna',
            'hyperopt': 'hyperopt',
            'mlflow': 'mlflow',
            'bayesian-optimization': 'bayesian-optimization',
            'darts': 'darts',
            'statsforecast': 'statsforecast',
            'holidays': 'holidays',
            'pmdarima': 'pmdarima',
            'prophet': 'prophet',
            'fbprophet': 'fbprophet',
            'tslearn': 'tslearn',
            'pyod': 'pyod',
            'tables': 'tables',
            'pyarrow': 'pyarrow',
            'graphviz': 'graphviz',
            'pydot': 'pydot',
            'mlxtend': 'mlxtend',
            'catboost': 'catboost',
            'imblearn': 'imbalanced-learn',
            'openpyxl': 'openpyxl',
            'pymc3': 'pymc3',
            'pymc': 'pymc',
            'networkx': 'networkx',
            'nltk': 'nltk',
            'spacy': 'spacy',
            'gensim': 'gensim',
            'umap': 'umap-learn',
            'hdbscan': 'hdbscan',
            'patsy': 'patsy',
            'sympy': 'sympy',
            'bokeh': 'bokeh',
            'altair': 'altair',
            'missingno': 'missingno',
            'fastai': 'fastai',
            'lightfm': 'lightfm',
            'surprise': 'scikit-surprise',
            'keras-tuner': 'keras-tuner',
        };
    }

    /**
     * Instalar paquete si no está disponible
     */
    async ensurePackage(packageName) {
        // Mapear nombres de importación a nombres de paquetes
        const installName = this.requiredPackages[packageName] || packageName;
        
        // Si ya está instalado, no hacer nada
        if (this.installedPackages.has(installName)) {
            return true;
        }

        // Si ya hay una instalación en curso, esperar
        if (this.installationPromises.has(installName)) {
            return await this.installationPromises.get(installName);
        }

        // Crear promesa de instalación
        const installPromise = this._installPackage(packageName, installName);
        this.installationPromises.set(installName, installPromise);
        
        try {
            const result = await installPromise;
            this.installedPackages.add(installName);
            return result;
        } catch (error) {
            console.error(`Error instalando ${installName}:`, error);
            return false;
        } finally {
            this.installationPromises.delete(installName);
        }
    }

    /**
     * Instalar múltiples paquetes
     */
    async ensurePackages(packageNames) {
        const promises = packageNames.map(name => this.ensurePackage(name));
        const results = await Promise.all(promises);
        return results.every(r => r);
    }

    /**
     * Verificar si un paquete está disponible
     */
    async checkPackage(packageName) {
        try {
            const result = await this.pyodide.runPythonAsync(`
try:
    import ${packageName}
    print(f"✅ {packageName} disponible")
    'available'
except ImportError:
    print(f"❌ {packageName} no disponible")
    'not_available'
            `);
            return result.trim() === 'available';
        } catch (error) {
            console.error(`Error verificando ${packageName}:`, error);
            return false;
        }
    }

    /**
     * Instalación real del paquete
     */
    async _installPackage(importName, installName) {
        try {
            console.log(`📦 Verificando ${importName}...`);
            
            const checkResult = await this.pyodide.runPythonAsync(`
try:
    import ${importName}
    'already_available'
except ImportError:
    'needs_installation'
            `);

            if (checkResult.trim() === 'already_available') {
                console.log(`✅ ${importName} ya disponible`);
                return true;
            }

            console.log(`📦 Instalando ${installName}...`);
            
            const installResult = await this.pyodide.runPythonAsync(`
import micropip
import asyncio

async def install_package():
    try:
        await micropip.install("${installName}")
        # Verificar que la instalación fue exitosa
        import ${importName}
        print(f"✅ {installName} instalado correctamente")
        return True
    except Exception as e:
        print(f"❌ Error instalando ${installName}: {e}")
        return False

# Ejecutar la instalación
result = await install_package()
result
            `);

            const success = installResult === true || installResult === 'True';
            
            if (success) {
                console.log(`✅ ${installName} instalado exitosamente`);
                this.installedPackages.add(installName);
                return true;
            } else {
                console.error(`❌ Falló la instalación de ${installName}`);
                return false;
            }

        } catch (error) {
            console.error(`❌ Error crítico instalando ${installName}:`, error);
            return false;
        }
    }

    /**
     * Instalar paquetes esenciales para datasets
     */
    async installEssentialPackages() {
        const essentialPackages = [
            'sklearn', 'seaborn', 'plotly', 'statsmodels', 'xgboost', 'lightgbm', 'tensorflow', 'keras', 'torch',
            'mlxtend', 'catboost', 'imblearn', 'openpyxl', 'pymc3', 'pymc', 'networkx', 'nltk', 'spacy', 'gensim',
            'umap', 'hdbscan', 'patsy', 'sympy', 'bokeh', 'altair', 'missingno', 'pycaret', 'shap', 'lime', 'optuna',
            'hyperopt', 'mlflow', 'pydot', 'graphviz', 'pyarrow', 'tables', 'pyod', 'tslearn', 'prophet', 'fbprophet',
            'pmdarima', 'statsforecast', 'holidays', 'darts', 'bayesian-optimization', 'eli5', 'yellowbrick', 'sweetviz',
            'autoviz', 'dtreeviz', 'wordcloud', 'textblob', 'sentence-transformers', 'transformers', 'datasets',
            'torchvision', 'torchaudio', 'opencv-python', 'cv2', 'pillow', 'imageio', 'scikit-image', 'scikit-optimize',
            'scikit-surprise', 'imbalanced-learn', 'category_encoders', 'feature-engine', 'ml-insights', 'ml-dtypes',
            'pandas-profiling', 'ydata-profiling', 'fastai', 'lightfm', 'surprise', 'keras-tuner', 'pytorch-lightning',
            'albumentations', 'segmentation-models', 'sentencepiece', 'fairseq', 'pytorch-tabnet', 'pytorch-forecasting',
            'pytorch-lightning-bolts', 'pytorch-metric-learning', 'pytorch-widedeep', 'pytorch-geometric', 'pytorch3d',
            'pytorchvideo', 'pytorchcv', 'pytorch-ignite', 'ignite'
        ];
        
        console.log('📦 Instalando paquetes esenciales...');
        
        for (const pkg of essentialPackages) {
            try {
                await this.ensurePackage(pkg);
            } catch (error) {
                console.warn(`⚠️ No se pudo instalar ${pkg}:`, error);
            }
        }
        
        console.log('✅ Instalación de paquetes esenciales completada');
    }

    /**
     * Obtener lista de paquetes instalados
     */
    getInstalledPackages() {
        return Array.from(this.installedPackages);
    }

    /**
     * Limpiar cache de instalaciones
     */
    clearCache() {
        this.installedPackages.clear();
        this.installationPromises.clear();
    }
}

export default PackageManager;
