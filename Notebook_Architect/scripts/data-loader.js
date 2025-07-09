// data-loader.js: Sistema de ingesta y análisis automático de datos
export class DataLoader {
    // Consultar librerías instaladas en el entorno Python y guardarlas en window.installedPythonPackages
    async updateInstalledPythonPackages() {
        if (!this.notebookExecutor) return;
        // Asegurar que setuptools esté instalado en Pyodide antes de importar pkg_resources
        // NOTA: No se puede usar 'await' en código Python ejecutado fuera de una función async en Pyodide
        // Por lo tanto, la instalación de setuptools debe hacerse desde JS antes de ejecutar el código Python
        if (window.notebookExecutor && window.notebookExecutor.pyodide) {
            try {
                await window.notebookExecutor.pyodide.loadPackage('setuptools');
            } catch (e) {
                console.warn('No se pudo cargar setuptools:', e);
            }
        }
        const code = `
import json
try:
    import pkg_resources
    pkgs = {dist.key: dist.version for dist in pkg_resources.working_set}
    print(json.dumps(pkgs))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;
        const result = await this.notebookExecutor.executeCode(code, 'list_pkgs');
        if (result.success && result.output) {
            try {
                const lines = result.output.split('\n');
                for (const line of lines) {
                    if (line.trim().startsWith('{')) {
                        window.installedPythonPackages = JSON.parse(line);
                        break;
                    }
                }
            } catch {}
        }
    }

    // Guardar un DataFrame en disco (en formato CSV o JSON) en la carpeta correspondiente
    async saveDatasetToDisk(varName, type = 'raw', format = 'csv') {
        if (!this.notebookExecutor) throw new Error('NotebookExecutor no disponible');
        const safeVarName = DataLoader.sanitizeVarName(varName);
        const folderMap = { raw: 'data/raw', processed: 'data/processed', results: 'data/results' };
        const folder = folderMap[type] || 'data/raw';
        const fileName = `${safeVarName}.${format}`;
        let pyCode = '';
        if (format === 'csv') {
            pyCode = `
import os
os.makedirs('${folder}', exist_ok=True)
if '${safeVarName}' in globals():
    globals()['${safeVarName}'].to_csv(os.path.join('${folder}', '${fileName}'), index=False)
    print('✅ Guardado como CSV en: {}/{}'.format('${folder}', '${fileName}'))
else:
    print('❌ Dataset no encontrado en memoria')
`;
        } else if (format === 'json') {
            pyCode = `
import os
os.makedirs('${folder}', exist_ok=True)
if '${safeVarName}' in globals():
    globals()['${safeVarName}'].to_json(os.path.join('${folder}', '${fileName}'), orient='records', force_ascii=False)
    print('✅ Guardado como JSON en: {}/{}'.format('${folder}', '${fileName}'))
else:
    print('❌ Dataset no encontrado en memoria')
`;
        } else {
            throw new Error('Formato no soportado: ' + format);
        }
        return this.notebookExecutor.executeCode(pyCode, `save_${safeVarName}_${format}`);
    }

    // Listar datasets guardados en disco en una carpeta
    async listDatasetsOnDisk(type = 'raw') {
        const folderMap = { raw: 'data/raw', processed: 'data/processed', results: 'data/results' };
        const folder = folderMap[type] || 'data/raw';
        // Usar Pyodide para listar archivos
        const pyCode = `
import os, json
if os.path.exists('${folder}'):
    files = [f for f in os.listdir('${folder}') if not f.startswith('.')]
    print(json.dumps(files))
else:
    print(json.dumps([]))
`;
        const result = await this.notebookExecutor.executeCode(pyCode, `list_files_${type}`);
        if (result.success && result.output) {
            try {
                const files = JSON.parse(result.output.split('\n').pop());
                return files;
            } catch {
                return [];
            }
        }
        return [];
    }

    // Helper para sanitizar nombres de variable Python
    static sanitizeVarName(name) {
        // Quitar extensión, reemplazar caracteres no válidos por guion bajo
        return name
            .replace(/\.[^/.]+$/, '') // quitar extensión
            .replace(/[^a-zA-Z0-9_]/g, '_') // solo letras, números y _
            .replace(/^([0-9])/, '_$1'); // no empezar con número
    }
    constructor(notebookExecutor = null) {
        this.notebookExecutor = notebookExecutor;
        this.loadedDatasets = new Map(); // Cache de datasets cargados
        this.currentDataset = null;
        this.dataAnalysis = null;
    }

    setNotebookExecutor(executor) {
        this.notebookExecutor = executor;
    }

    // Cargar datos desde archivo local
    async loadFromFile(file) {
        try {
            // Actualizar lista de paquetes instalados antes de cargar datos
            await this.updateInstalledPythonPackages();
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const fileSize = (file.size / 1024 / 1024).toFixed(2); // MB
            console.log(`📁 Cargando archivo: ${file.name} (${fileSize} MB)`);

            let content;
            let dataFrame;
            // Nombre de variable Python seguro
            const varName = DataLoader.sanitizeVarName(file.name) + '_data';

            // Verificar tamaño máximo (20 MB para evitar problemas de memoria)
            const MAX_SIZE_MB = 20;
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                throw new Error(`El archivo es demasiado grande (${fileSize} MB). Máximo permitido: ${MAX_SIZE_MB} MB.`);
            }

            // Guardar archivo en el FS virtual de Pyodide (si está disponible)
            if (window.notebookExecutor && window.notebookExecutor.pyodide) {
                const pyFS = window.notebookExecutor.pyodide.FS;
                const folder = '/data/raw';
                try {
                    pyFS.mkdir('/data');
                } catch {}
                try {
                    pyFS.mkdir(folder);
                } catch {}
                const filePath = `${folder}/${file.name}`;
                let fileData;
                if (fileExtension === 'csv' || fileExtension === 'txt' || fileExtension === 'json' || fileExtension === 'geojson') {
                    fileData = new Uint8Array(await file.arrayBuffer());
                } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                    fileData = new Uint8Array(await file.arrayBuffer());
                }
                if (fileData) {
                    pyFS.writeFile(filePath, fileData);
                }
            }

            switch (fileExtension) {
                case 'csv':
                case 'txt':
                    content = await this.readFileAsText(file);
                    dataFrame = await this.loadCSVData(content, varName);
                    await this.saveDatasetToDisk(varName, 'raw', 'csv');
                    break;
                case 'json':
                case 'geojson':
                    content = await this.readFileAsText(file);
                    dataFrame = await this.loadJSONData(content, varName);
                    await this.saveDatasetToDisk(varName, 'raw', 'json');
                    break;
                case 'xlsx':
                case 'xls':
                    content = await this.readFileAsArrayBuffer(file);
                    dataFrame = await this.loadExcelData(content, varName);
                    await this.saveDatasetToDisk(varName, 'raw', 'csv');
                    break;
                default:
                    // Si la extensión no es reconocida, intentar detectar el formato automáticamente
                    content = await this.readFileAsText(file);
                    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                        dataFrame = await this.loadJSONData(content, varName);
                        await this.saveDatasetToDisk(varName, 'raw', 'json');
                    } else if (content.includes(',') || content.includes(';') || content.includes('\t')) {
                        dataFrame = await this.loadCSVData(content, varName);
                        await this.saveDatasetToDisk(varName, 'raw', 'csv');
                    } else {
                        throw new Error(`Formato de archivo no reconocido: ${fileExtension}`);
                    }
            }

            // Registrar dataset en la cache
            this.currentDataset = {
                name: varName,
                file: file.name,
                size: fileSize,
                format: fileExtension,
                loadedAt: new Date(),
                rows: dataFrame.shape?.[0] || 'unknown',
                columns: dataFrame.shape?.[1] || 'unknown'
            };

            this.loadedDatasets.set(this.currentDataset.name, this.currentDataset);

            // Realizar análisis automático
            this.dataAnalysis = await this.performAutomaticAnalysis(varName);

            // Obtener resumen para el agente
            const summary = await this.getDatasetSummaryForAgent();

            // Sugerir y crear notebook dashboard exploratorio automáticamente (refuerzo: pasar info relevante)
            if (window.agent && window.agent.createExploratoryDashboard) {
                await window.agent.createExploratoryDashboard(varName, summary, this.dataAnalysis);
            }

            // 🔥 INTEGRACIÓN ROBUSTA: Notificar SIEMPRE al agente tras cargar datos
            setTimeout(() => {
                const event = new CustomEvent('dataset-loaded', { detail: { dataset: this.currentDataset, summary } });
                document.dispatchEvent(event);
            }, 100);

            return {
                success: true,
                dataset: this.currentDataset,
                analysis: this.dataAnalysis
            };

        } catch (error) {
            console.error('Error cargando archivo:', error);
            // 🔥 Notificar error de carga al agente
            setTimeout(() => {
                const event = new CustomEvent('dataset-loaded', { detail: { error: error.message } });
                document.dispatchEvent(event);
            }, 100);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Cargar datos desde URL/API
    async loadFromURL(url, format = '', headers = {}) {
        try {
            // Actualizar lista de paquetes instalados antes de cargar datos
            await this.updateInstalledPythonPackages();
            console.log(`🌐 Cargando datos desde URL: ${url}`);

            // Obtener el nombre de archivo de la URL para intentar determinar el formato
            const urlObj = new URL(url);
            const fileName = urlObj.pathname.split('/').pop() || '';
            const fileExtension = fileName.split('.').pop().toLowerCase();

            // Si no se especificó formato, intentar deducirlo de la extensión
            if (!format && fileExtension) {
                if (["csv", "txt"].includes(fileExtension)) {
                    format = "csv";
                } else if (["json", "geojson"].includes(fileExtension)) {
                    format = "json";
                } else if (["xlsx", "xls"].includes(fileExtension)) {
                    format = "excel";
                }
            }

            // Hacer la petición
            const response = await fetch(url, { headers });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }

            // Clonar la respuesta para poder consumirla múltiples veces
            const responseClone = response.clone();

            // Generar un nombre de variable seguro para Python
            const varName = DataLoader.sanitizeVarName(`url_data_${Date.now()}`);
            const safeVarName = varName; // Usar el mismo nombre consistente

            // Información del formato detectado
            let detectedFormat = format.toLowerCase();
            let separator = null;
            let dataFrame = null;
            let loadError = null;

            // Intentar detectar el formato analizando el contenido si no se especificó
            if (!detectedFormat) {
                try {
                    // Obtener una muestra del contenido para analizar
                    const sample = await responseClone.clone().text();
                    const firstLines = sample.split('\n').slice(0, 5).join('\n');

                    // Verificar si parece JSON
                    if (firstLines.trim().startsWith('{') || firstLines.trim().startsWith('[')) {
                        detectedFormat = 'json';
                    }
                    // Verificar si parece CSV
                    else if (firstLines.includes(',') || firstLines.includes(';') || firstLines.includes('\t')) {
                        detectedFormat = 'csv';

                        // Intentar determinar el separador
                        const possibleSeparators = [',', ';', '\t', '|'];
                        const separatorCounts = {};

                        for (const sep of possibleSeparators) {
                            if (firstLines.includes(sep)) {
                                const lines = firstLines.split('\n').filter(line => line.trim());
                                const counts = lines.map(line => line.split(sep).length - 1);

                                // Si hay consistencia en el número de separadores
                                if (counts.length > 0 && new Set(counts).size === 1 && counts[0] > 0) {
                                    separatorCounts[sep] = counts[0];
                                }
                            }
                        }

                        // Elegir el separador con más ocurrencias consistentes
                        let maxCount = 0;

                        for (const [sep, count] of Object.entries(separatorCounts)) {
                            if (count > maxCount) {
                                maxCount = count;
                                separator = sep;
                            }
                        }
                    }
                } catch (err) {
                    console.warn("Error durante la detección automática del formato:", err);
                    // Continuar con los intentos de formato por defecto
                }
            }

            // Si sigue sin detectarse, usar los formatos de prueba por defecto
            const formatsToTry = detectedFormat
                ? [detectedFormat]
                : ['json', 'csv']; // Intentar primero JSON, luego CSV

            // Intentar cada formato
            for (const fmt of formatsToTry) {
                try {
                    console.log(`🔍 Intentando cargar como ${fmt.toUpperCase()}...`);

                    if (fmt === 'json') {
                        const jsonData = await responseClone.clone().json();
                        dataFrame = await this.loadJSONData(JSON.stringify(jsonData), safeVarName);
                        detectedFormat = 'json';
                        await this.saveDatasetToDisk(safeVarName, 'raw', 'json');
                        break;
                    }
                    else if (fmt === 'csv') {
                        const textData = await responseClone.clone().text();
                        // --- Robustez: Si el CSV se carga como una sola columna, intentar dividirlo ---
                        let fixedTextData = textData;
                        // Detectar si la primera línea parece tener múltiples campos pero sólo hay una columna
                        const firstLine = textData.split('\n')[0];
                        const commaCount = (firstLine.match(/,/g) || []).length;
                        const tabCount = (firstLine.match(/\t/g) || []).length;
                        // Si hay muchas comas pero sólo una columna, intentar arreglar
                        if (commaCount > 0 && (!separator || separator === ',')) {
                            // Si el separador es coma y sólo hay una columna, probablemente está todo junto
                            // No hacer nada aquí, el código Python de loadCSVData ya intentará arreglarlo
                        }
                        // Si hay muchas tabulaciones pero sólo una columna, igual
                        if (tabCount > 0 && (!separator || separator === '\t')) {
                            // No hacer nada, el código Python intentará arreglarlo
                        }
                        dataFrame = await this.loadCSVData(fixedTextData, safeVarName, separator);
                        detectedFormat = 'csv';
                        await this.saveDatasetToDisk(safeVarName, 'raw', 'csv');
                        break;
                    }
                    else if (fmt === 'excel') {
                        const arrayBuffer = await responseClone.clone().arrayBuffer();
                        dataFrame = await this.loadExcelData(arrayBuffer, safeVarName);
                        detectedFormat = 'excel';
                        await this.saveDatasetToDisk(safeVarName, 'raw', 'csv');
                        break;
                    }
                } catch (err) {
                    loadError = err;
                    console.warn(`Error cargando como ${fmt}:`, err.message);
                    continue;
                }
            }

            // Si no se pudo cargar con ningún formato
            if (!dataFrame) {
                throw new Error(`No se pudo cargar la URL como ningún formato conocido. Error: ${loadError?.message || 'Formato no compatible'}`);
            }

            // Registrar dataset
            this.currentDataset = {
                name: safeVarName,
                source: url,
                format: detectedFormat,
                loadedAt: new Date(),
                rows: dataFrame.shape?.[0] || 'unknown',
                columns: dataFrame.shape?.[1] || 'unknown'
            };

            this.loadedDatasets.set(this.currentDataset.name, this.currentDataset);

            // Realizar análisis automático
            this.dataAnalysis = await this.performAutomaticAnalysis(safeVarName);

            // Obtener resumen para el agente
            const summary = await this.getDatasetSummaryForAgent();

            // Sugerir y crear notebook dashboard exploratorio automáticamente (refuerzo: pasar info relevante)
            if (window.agent && window.agent.createExploratoryDashboard) {
                await window.agent.createExploratoryDashboard(safeVarName, summary, this.dataAnalysis);
            }

            // 🔥 INTEGRACIÓN ROBUSTA: Notificar SIEMPRE al agente tras cargar datos desde URL/API
            setTimeout(() => {
                const event = new CustomEvent('dataset-loaded', { detail: { dataset: this.currentDataset, summary } });
                document.dispatchEvent(event);
            }, 100);

            return {
                success: true,
                dataset: this.currentDataset,
                analysis: this.dataAnalysis
            };
        } catch (error) {
            console.error('Error cargando desde URL:', error);
            // 🔥 Notificar error de carga al agente
            setTimeout(() => {
                const event = new CustomEvent('dataset-loaded', { detail: { error: error.message } });
                document.dispatchEvent(event);
            }, 100);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Leer archivo como texto
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Leer archivo como ArrayBuffer (para Excel)
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Convertir ArrayBuffer a base64
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Cargar datos CSV
    async loadCSVData(csvContent, datasetName, separator = null) {
        if (!this.notebookExecutor) {
            throw new Error('NotebookExecutor no disponible');
        }

        // Sanitizar el nombre de variable para asegurar compatibilidad con Python
        const safeVarName = DataLoader.sanitizeVarName(datasetName);

        // --- NUEVO: Usar siempre el FS virtual de Pyodide para cargar CSVs ---
        // Buscar el archivo en el FS virtual (debe haberse guardado previamente)
        let filePath = `/data/raw/${safeVarName.replace(/_data$/, '')}.csv`;
        // Si no existe, escribirlo
        if (window.notebookExecutor && window.notebookExecutor.pyodide) {
            const pyFS = window.notebookExecutor.pyodide.FS;
            try {
                pyFS.stat(filePath);
            } catch {
                // Si no existe, escribirlo
                const encoder = new TextEncoder();
                pyFS.writeFile(filePath, encoder.encode(csvContent));
            }
        }

        // Código Python robusto para leer desde el FS virtual
        const pythonCode = `
import pandas as pd
import numpy as np
import csv

_df_tmp = None
_load_success = False
_load_attempts = []
csv_path = r'''${filePath}'''
try:
    # 1. Intentar carga estándar con separador coma y decimal punto
    try:
        _df_tmp = pd.read_csv(csv_path, sep=',', quotechar='"', doublequote=True)
        _load_attempts.append(('sep=,', _df_tmp.shape))
        _load_success = True
    except Exception as e:
        _load_attempts.append(('sep=,', str(e)))

    # 2. Si solo hay una columna, intentar con decimal=','
    if _df_tmp is not None and _df_tmp.shape[1] == 1:
        try:
            _df_tmp = pd.read_csv(csv_path, sep=',', quotechar='"', doublequote=True, decimal=',')
            _load_attempts.append(('sep=,, decimal=,', _df_tmp.shape))
            _load_success = True
        except Exception as e:
            _load_attempts.append(('sep=,, decimal=,', str(e)))

    # 3. Si sigue siendo una columna, intentar con punto y coma
    if _df_tmp is not None and _df_tmp.shape[1] == 1:
        try:
            _df_tmp = pd.read_csv(csv_path, sep=';', quotechar='"', doublequote=True)
            _load_attempts.append(('sep=;', _df_tmp.shape))
            _load_success = True
        except Exception as e:
            _load_attempts.append(('sep=;', str(e)))

    # 4. Si sigue siendo una columna, intentar con tabulador
    if _df_tmp is not None and _df_tmp.shape[1] == 1:
        try:
            _df_tmp = pd.read_csv(csv_path, sep='\t', quotechar='"', doublequote=True)
            _load_attempts.append(('sep=tab', _df_tmp.shape))
            _load_success = True
        except Exception as e:
            _load_attempts.append(('sep=tab', str(e)))

    # 5. Si sigue siendo una columna, intentar engine='python' y sep=None
    if _df_tmp is not None and _df_tmp.shape[1] == 1:
        try:
            _df_tmp = pd.read_csv(csv_path, sep=None, engine='python')
            _load_attempts.append(('sep=None, engine=python', _df_tmp.shape))
            _load_success = True
        except Exception as e:
            _load_attempts.append(('sep=None, engine=python', str(e)))

    # 6. Si sigue siendo una columna, intentar analizar manualmente si hay comas internas y dividir
    if _df_tmp is not None and _df_tmp.shape[1] == 1:
        # Revisar si la primera fila tiene varias comas
        with open(csv_path, encoding='utf-8') as f:
            lines = f.readlines()
        if len(lines) > 0:
            first_row = lines[1] if len(lines) > 1 else ''
            if isinstance(first_row, str) and first_row.count(',') >= 2:
                try:
                    rows = [line.strip().split(',') for line in lines if line.strip()]
                    max_cols = max(len(r) for r in rows)
                    rows = [r + ['']*(max_cols-len(r)) for r in rows]
                    _df_tmp = pd.DataFrame(rows[1:], columns=rows[0])
                    _load_attempts.append(('manual split', _df_tmp.shape))
                    _load_success = True
                except Exception as e:
                    _load_attempts.append(('manual split', str(e)))

    # Si después de todo sigue siendo una columna, dejarlo así pero advertir
    if _df_tmp is not None and _df_tmp.shape[1] == 1:
        print('⚠️ El archivo CSV se cargó como una sola columna. Puede requerir limpieza manual. Sugerencia: revise el formato de comillas y separadores decimales.')

    # Asignar a la variable global
    globals()['${safeVarName}'] = _df_tmp

    # Información básica del dataset
    dataset_info = {
        'shape': _df_tmp.shape,
        'columns': list(_df_tmp.columns),
        'dtypes': _df_tmp.dtypes.to_dict(),
        'memory_usage': _df_tmp.memory_usage(deep=True).sum(),
        'null_counts': _df_tmp.isnull().sum().to_dict(),
        'load_attempts': _load_attempts
    }
    print('✅ Dataset "${safeVarName}" cargado exitosamente')
    print('📊 Forma: {}'.format(dataset_info['shape']))
    print('📋 Columnas: {}'.format(len(dataset_info['columns'])))
    print('💾 Memoria: {:.1f} KB'.format(dataset_info['memory_usage'] / 1024))
    globals()['_dataset_info_${safeVarName}'] = dataset_info
except Exception as e:
    print('❌ Error cargando CSV: {}'.format(str(e)))
    raise e
`

        const result = await this.notebookExecutor.executeCode(pythonCode, `load_${safeVarName}`);
        if (!result.success) {
            throw new Error(`Error ejecutando código Python: ${result.error}`);
        }

        return { shape: 'loaded' };
    }

    // Cargar datos JSON
    async loadJSONData(jsonContent, datasetName) {
        if (!this.notebookExecutor) {
            throw new Error('NotebookExecutor no disponible');
        }

        // Sanitizar el nombre de variable para asegurar compatibilidad con Python
        const safeVarName = DataLoader.sanitizeVarName(datasetName);

        // Verificar formato JSON antes de enviar a Python
        try {
            // Validar que el JSON es sintácticamente correcto
            JSON.parse(jsonContent);
        } catch (jsonError) {
            console.error('Error en formato JSON:', jsonError);
            // Extraer información útil del error para un mensaje más informativo
            const mensaje = jsonError.message;
            let linea = 1;
            let columna = 0;
            let fragmento = '';
            // Intentar extraer línea y columna del mensaje de error
            const posicionMatch = mensaje.match(/position (\d+)/);
            if (posicionMatch) {
                const posicion = parseInt(posicionMatch[1]);
                // Calcular línea y columna basado en la posición
                let contadorPos = 0;
                for (let i = 0; i < posicion && i < jsonContent.length; i++) {
                    contadorPos++;
                    if (jsonContent[i] === '\n') {
                        linea++;
                        columna = 0;
                    } else {
                        columna++;
                    }
                }
                // Extraer fragmento de la línea problemática
                const lineas = jsonContent.split('\n');
                if (lineas[linea - 1]) {
                    fragmento = lineas[linea - 1].slice(Math.max(0, columna - 20), columna + 20);
                }
            }
            // Mensaje detallado con información de ubicación y fragmento
            let msg = `El archivo JSON tiene un formato inválido: ${jsonError.message}.\n` +
                `Error en línea ${linea}, columna ${columna}.`;
            if (fragmento) {
                msg += `\nFragmento problemático: ...${fragmento}...`;
            }
            msg += `\nSugerencia: Revisa la sintaxis del archivo JSON, especialmente comillas, comas y llaves.`;
            throw new Error(msg);
        }

        const pythonCode = `
import pandas as pd
import json
import io
import numpy as np

# Crear DataFrame desde JSON
json_data = """${jsonContent.replace(/"/g, '""')}"""

try:
    # Intentar parsear el JSON
    parsed_data = json.loads(json_data)
    
    # Variable temporal para el DataFrame
    _df_tmp = None
    
    # Estrategia 1: Lista de objetos (formato más común para DataFrames)
    if isinstance(parsed_data, list):
        if len(parsed_data) > 0:
            if all(isinstance(item, dict) for item in parsed_data):
                # Lista de diccionarios -> Convertir directamente a DataFrame
                _df_tmp = pd.DataFrame(parsed_data)
                print("✓ JSON cargado como lista de objetos")
            else:
                # Lista de valores simples -> Convertir a columna única
                _df_tmp = pd.DataFrame(parsed_data, columns=['value'])
                print("✓ JSON cargado como lista de valores")
        else:
            # Lista vacía -> DataFrame vacío
            _df_tmp = pd.DataFrame()
            print("⚠️ La lista JSON está vacía")
    
    # Estrategia 2: Objeto con arrays (común en APIs)
    elif isinstance(parsed_data, dict):
        # Verificar si hay un array dentro del objeto que podría ser los datos principales
        arrays_in_json = {k: v for k, v in parsed_data.items() 
                         if isinstance(v, list) and len(v) > 0}
        
        if arrays_in_json:
            # Buscar la clave con el array más largo (probablemente sean los datos principales)
            main_key, main_array = max(arrays_in_json.items(), key=lambda x: len(x[1]))
            
            if all(isinstance(item, dict) for item in main_array):
                # Si todos los elementos son objetos, convertir a DataFrame
                _df_tmp = pd.DataFrame(main_array)
                print("✓ JSON cargado desde la clave '{}' que contiene una lista de objetos".format(main_key))
            else:
                # Array de valores -> columna única
                _df_tmp = pd.DataFrame(main_array, columns=[main_key])
                print("✓ JSON cargado desde la clave '{}' que contiene una lista de valores".format(main_key))
        else:
            # No hay arrays, convertir el objeto completo a una fila
            _df_tmp = pd.DataFrame([parsed_data])
            print("✓ JSON cargado como objeto único")
    
    # Si no se pudo crear un DataFrame con los métodos anteriores
    if _df_tmp is None:
        # Último recurso: forzar conversión a string y luego a DataFrame
        _df_tmp = pd.DataFrame([{'data': str(parsed_data)}])
        print("⚠️ Formato JSON no reconocido, convertido a texto")
    
    # Procesar las columnas numéricas que podrían estar como strings
    for col in _df_tmp.columns:
        # Verificar si la columna es de tipo object (string)
        if _df_tmp[col].dtype == 'object':
            # Intentar convertir a numérico si parece contener números
            try:
                pd.to_numeric(_df_tmp[col], errors='raise')
                _df_tmp[col] = pd.to_numeric(_df_tmp[col], errors='coerce')
            except:
                pass
    
    # Asignar a la variable global
    globals()['${safeVarName}'] = _df_tmp
    
    # Información básica del dataset
    dataset_info = {
        'shape': _df_tmp.shape,
        'columns': list(_df_tmp.columns),
        'dtypes': _df_tmp.dtypes.to_dict(),
        'memory_usage': _df_tmp.memory_usage(deep=True).sum(),
        'null_counts': _df_tmp.isnull().sum().to_dict()
    }
    
    print("✅ Dataset '${safeVarName}' cargado desde JSON")
    print("📊 Forma: {}".format(dataset_info['shape']))
    print("📋 Columnas: {}".format(len(dataset_info['columns'])))
    print("💾 Memoria: {:.1f} KB".format(dataset_info['memory_usage'] / 1024))
    
    # Guardar info para análisis
    globals()['_dataset_info_${safeVarName}'] = dataset_info
except Exception as e:
    print("❌ Error cargando JSON: {}".format(str(e)))
    raise e
`;

        const result = await this.notebookExecutor.executeCode(pythonCode, `load_json_${safeVarName}`);
        
        if (!result.success) {
            throw new Error(`Error ejecutando código Python: ${result.error}`);
        }

        return { shape: 'loaded' };
    }

    // Cargar datos Excel (requiere openpyxl)
    async loadExcelData(excelBuffer, datasetName) {
        if (!this.notebookExecutor) {
            throw new Error('NotebookExecutor no disponible');
        }

        // Sanitizar el nombre de variable para asegurar compatibilidad con Python
        const safeVarName = DataLoader.sanitizeVarName(datasetName);

        // Convertir ArrayBuffer a base64 para pasar a Python
        const base64 = this.arrayBufferToBase64(excelBuffer);

        const pythonCode = `
import pandas as pd
import io
import base64
import numpy as np

# Decodificar datos Excel desde base64
excel_data = base64.b64decode("${base64}")

try:
    # Cargar archivo Excel
    with io.BytesIO(excel_data) as excel_file:
        # Intentar leer todas las hojas
        xl = pd.ExcelFile(excel_file)
        sheet_names = xl.sheet_names
        
        if len(sheet_names) == 1:
            # Si solo hay una hoja, cargarla directamente
            _df_tmp = pd.read_excel(io.BytesIO(excel_data), sheet_name=sheet_names[0])
        else:
            # Si hay múltiples hojas, cargar la primera y mencionar las demás
            _df_tmp = pd.read_excel(io.BytesIO(excel_data), sheet_name=sheet_names[0])
            print("📋 El archivo Excel contiene {} hojas: {}".format(len(sheet_names), ", ".join(sheet_names)))
            print("📋 Se ha cargado la primera hoja: '{}'".format(sheet_names[0]))
            
    globals()['${safeVarName}'] = _df_tmp
    
    # Información básica del dataset
    dataset_info = {
        'shape': _df_tmp.shape,
        'columns': list(_df_tmp.columns),
        'dtypes': _df_tmp.dtypes.to_dict(),
        'memory_usage': _df_tmp.memory_usage(deep=True).sum(),
        'null_counts': _df_tmp.isnull().sum().to_dict()
    }
    print("✅ Dataset '${safeVarName}' cargado desde Excel")
    print("📊 Forma: {}".format(dataset_info['shape']))
    print("📋 Columnas: {}".format(len(dataset_info['columns'])))
    # Guardar info para análisis
    globals()['_dataset_info_${safeVarName}'] = dataset_info
except Exception as e:
    print("❌ Error cargando Excel: {}".format(str(e)))
    raise e
`;

        const result = await this.notebookExecutor.executeCode(pythonCode, `load_excel_${safeVarName}`);
        
        if (!result.success) {
            throw new Error(`Error ejecutando código Python: ${result.error}`);
        }

        return { shape: 'loaded' };
    }

    // Análisis automático del dataset cargado
    async performAutomaticAnalysis(datasetName) {
        if (!this.notebookExecutor) {
            throw new Error('NotebookExecutor no disponible');
        }

        // Sanitizar el nombre de variable para asegurar compatibilidad con Python
        const safeVarName = DataLoader.sanitizeVarName(datasetName);

        // Consultar librerías instaladas antes de análisis (si no existen, obtenerlas)
        if (!window.installedPythonPackages) {
            await this.updateInstalledPythonPackages();
        }

        // Guardar recomendaciones para el agente/notebook
        let lastRecommendations = [];

        // Validación adicional: si el dataset es un CSV cargado como una sola columna, sugerir limpieza automática
        let needsCleaningCell = false;
        if (window.notebookExecutor && window.notebookExecutor.pyodide) {
            try {
                const pyFS = window.notebookExecutor.pyodide.FS;
                const filePath = `/data/raw/${safeVarName.replace(/_data$/, '')}.csv`;
                if (pyFS && pyFS.analyzePath && pyFS.analyzePath(filePath).exists) {
                    // Revisar si el archivo tiene solo una columna (heurística rápida)
                    const csvContent = new TextDecoder().decode(pyFS.readFile(filePath));
                    const firstLine = csvContent.split('\n')[0];
                    const commaCount = (firstLine.match(/,/g) || []).length;
                    if (commaCount > 0) {
                        // Si el DataFrame tiene solo una columna pero la cabecera tiene muchas comas, sugerir limpieza
                        needsCleaningCell = true;
                    }
                }
            } catch {}
        }

        // Código de análisis automático robusto: acceso seguro a la variable
        const analysisCode = `
# Análisis automático exhaustivo del dataset
import pandas as pd
import numpy as np
from datetime import datetime

# Acceso seguro a la variable global
dataset = globals().get('${safeVarName}')

# Verificar que existe
if dataset is None:
    raise NameError("La variable Python '${safeVarName}' no existe en el entorno. No se puede analizar.")

print("🔍 Iniciando análisis automático de '${safeVarName}'...")

# 1. INFORMACIÓN GENERAL
print("\\n" + "="*50)
print("📊 INFORMACIÓN GENERAL")
print("="*50)
print("Filas: {}".format(dataset.shape[0]))
print("Columnas: {}".format(dataset.shape[1]))
print("Memoria total: {:.1f} KB".format(dataset.memory_usage(deep=True).sum() / 1024))

# Valores únicos promedio (con manejo de errores)
try:
    nunique_mean = dataset.nunique().mean()
    print("Valores únicos promedio: {:.1f}".format(nunique_mean))
except Exception as e:
    print("No se pudo calcular el promedio de valores únicos: {}".format(str(e)))

# 2. ANÁLISIS DE TIPOS DE DATOS
print("\\n" + "="*50)
print("🔢 TIPOS DE DATOS")
print("="*50)

try:
    dtypes_count = dataset.dtypes.value_counts()
    for dtype, count in dtypes_count.items():
        print("- {}: {} columnas".format(dtype, count))
except Exception as e:
    print("Error analizando tipos de datos: {}".format(str(e)))

# 3. ESTADÍSTICAS DESCRIPTIVAS
print("\\n" + "="*50)
print("📊 ESTADÍSTICAS DESCRIPTIVAS")
print("="*50)

try:
    # Filtrar columnas numéricas
    numeric_cols = dataset.select_dtypes(include=['number']).columns.tolist()
    if numeric_cols:
        desc = dataset[numeric_cols].describe()
        print(desc)
    else:
        print("No hay columnas numéricas en el dataset")
except Exception as e:
    print("Error en estadísticas descriptivas: {}".format(str(e)))

# 4. VALORES FALTANTES
print("\\n" + "="*50)
print("❓ VALORES FALTANTES")
print("="*50)

try:
    missing = dataset.isnull().sum()
    missing_percent = missing / len(dataset) * 100
    missing_df = pd.DataFrame({'columna': missing.index, 'cantidad': missing.values, 'porcentaje': missing_percent.values})
    missing_df = missing_df.sort_values('cantidad', ascending=False)
    
    if missing_df['cantidad'].sum() > 0:
        print(missing_df[missing_df['cantidad'] > 0])
    else:
        print("✅ No hay valores faltantes en el dataset")
except Exception as e:
    print("Error analizando valores faltantes: {}".format(str(e)))

# 5. VALORES ÚNICOS Y CARDINALIDAD
print("\\n" + "="*50)
print("🧮 CARDINALIDAD (VALORES ÚNICOS)")
print("="*50)

try:
    nunique = dataset.nunique()
    nunique_percent = (nunique / len(dataset) * 100).round(2)
    cardinality_df = pd.DataFrame({'columna': nunique.index, 'valores_unicos': nunique.values, 'porcentaje': nunique_percent.values})
    cardinality_df = cardinality_df.sort_values('valores_unicos', ascending=False)
    print(cardinality_df)
except Exception as e:
    print("Error analizando cardinalidad: {}".format(str(e)))

# 6. DETECCIÓN DE COLUMNAS CATEGÓRICAS Y NUMÉRICAS
print("\\n" + "="*50)
print("🏷️ DETECCIÓN DE COLUMNAS")
print("="*50)

try:
    categorical_cols = dataset.select_dtypes(include=['object', 'category']).columns.tolist()
    date_cols = []
    numeric_cols = dataset.select_dtypes(include=['number']).columns.tolist()

    # Intentar detectar columnas de fecha que puedan estar como strings
    for col in categorical_cols[:]:
        try:
            if dataset[col].nunique() < len(dataset) * 0.5:  # No demasiados valores únicos
                sample_vals = dataset[col].dropna().sample(min(5, len(dataset[col].dropna()))).tolist()
                date_patterns = 0
                for val in sample_vals:
                    # Verificar patrones comunes de fecha
                    if isinstance(val, str) and (
                        ('/' in val and val.replace('/', '').isdigit()) or
                        ('-' in val and val.replace('-', '').isdigit()) or
                        any(month in val.lower() for month in ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'])
                    ):
                        date_patterns += 1
                
                if date_patterns >= min(3, len(sample_vals) / 2):
                    date_cols.append(col)
                    categorical_cols.remove(col)
        except Exception as e:
            continue

    print("Columnas numéricas: {}".format(len(numeric_cols)))
    if numeric_cols:
        print("- " + ", ".join(numeric_cols[:10]) + ("..." if len(numeric_cols) > 10 else ""))

    print("\\nColumnas categóricas: {}".format(len(categorical_cols)))
    if categorical_cols:
        print("- " + ", ".join(categorical_cols[:10]) + ("..." if len(categorical_cols) > 10 else ""))

    if date_cols:
        print("\\nPosibles columnas de fecha: {}".format(len(date_cols)))
        print("- " + ", ".join(date_cols))
except Exception as e:
    print("Error detectando tipos de columnas: {}".format(str(e)))

# 7. DISTRIBUCIÓN DE COLUMNAS CATEGÓRICAS
if len(categorical_cols) > 0:
    print("\\n" + "="*50)
    print("📊 DISTRIBUCIÓN DE CATEGORÍAS")
    print("="*50)
    
    for col in categorical_cols[:5]:  # Limitar a 5 columnas para no sobrecargar
        if dataset[col].nunique() <= 15:  # Solo mostrar si hay pocas categorías
            value_counts = dataset[col].value_counts().head(10)
            print("\\nDistribución de '{}':".format(col))
            for val, count in value_counts.items():
                print("- {}: {} ({:.1f}%)".format(val, count, count/len(dataset)*100))

# 8. CORRELACIONES (SI HAY SUFICIENTES COLUMNAS NUMÉRICAS)
if len(numeric_cols) >= 2:
    print("\\n" + "="*50)
    print("🔄 CORRELACIONES")
    print("="*50)
    
    try:
        corr = dataset[numeric_cols].corr()
        
        # Encontrar correlaciones fuertes (>0.7 o <-0.7)
        strong_corr = []
        for i in range(len(corr.columns)):
            for j in range(i+1, len(corr.columns)):
                if abs(corr.iloc[i, j]) > 0.7:
                    strong_corr.append((corr.columns[i], corr.columns[j], corr.iloc[i, j]))
        
        if strong_corr:
            print("Correlaciones fuertes encontradas:")
            for col1, col2, val in sorted(strong_corr, key=lambda x: abs(x[2]), reverse=True):
                print("- {} y {}: {:.2f}".format(col1, col2, val))
        else:
            print("No se encontraron correlaciones fuertes entre las variables numéricas.")
    except Exception as e:
        print("Error calculando correlaciones: {}".format(str(e)))

# 9. RECOMENDACIONES
print("\\n" + "="*50)
print("💡 RECOMENDACIONES")
print("="*50)

try:
    recommendations = []
    
    # Columnas con muchos valores nulos
    high_null_cols = missing_df[missing_df['porcentaje'] > 30]['columna'].tolist()
    if high_null_cols:
        recommendations.append("Considerar eliminar o imputar columnas con >30% de valores nulos: {}".format(", ".join(high_null_cols)))

    # Columnas con un solo valor (sin varianza)
    constant_cols = []
    for col in dataset.columns:
        if dataset[col].nunique() == 1:
            constant_cols.append(col)
            
    if constant_cols:
        recommendations.append("Eliminar columnas sin varianza (un solo valor): {}".format(", ".join(constant_cols)))

    # Columnas con alta cardinalidad
    high_cardinality = []
    try:
    if 'cardinality_df' in locals():
        high_cardinality = cardinality_df[cardinality_df['porcentaje'] > 90]['columna'].tolist()
    else:
        high_cardinality = []
    if high_cardinality:
        recommendations.append("Revisar columnas con alta cardinalidad (posibles IDs): {}".format(", ".join(high_cardinality)))
    except:
        pass

    # Preparación para ML
    if numeric_cols:
        recommendations.append("Para machine learning, normalizar/estandarizar columnas numéricas")
    if categorical_cols:
        recommendations.append("Codificar variables categóricas usando one-hot encoding o label encoding")
    if date_cols:
        recommendations.append("Extraer características de las columnas de fecha (año, mes, día, etc.)")
    if high_null_cols:
        recommendations.append("Imputar valores faltantes antes de modelar")

    # Mostrar recomendaciones
    if recommendations:
        for i, rec in enumerate(recommendations, 1):
            print("{}. {}".format(i, rec))
    else:
        print("✅ Los datos parecen estar en buena forma para análisis")

    # Análisis adicionales sugeridos
    print("\\nAnálisis adicionales recomendados:")
    if len(dataset) > 10000:
        print("- Dataset grande: considerar muestreo para exploración inicial")
    if date_cols:
        print("- Análisis de series temporales para columnas de fecha")
    if len(categorical_cols) > 0 and len(numeric_cols) > 0:
        print("- Análisis de varianza (ANOVA) para examinar la relación entre variables categóricas y numéricas")
    if len(numeric_cols) >= 3:
        print("- Reducción de dimensionalidad (PCA) para visualizar agrupaciones")
except Exception as e:
    print("Error generando recomendaciones: {}".format(str(e)))

print("\\n✅ Análisis automático completado")

# Retornar un objeto con toda la información para uso posterior
try:
    analysis_results = {
        'shape': dataset.shape,
        'columns': list(dataset.columns),
        'numeric_columns': numeric_cols,
        'categorical_columns': categorical_cols,
        'date_columns': date_cols,
        'missing_data': missing_df.to_dict(),
        'recommendations': {
            'high_null_columns': high_null_cols,
            'constant_columns': constant_cols,
            'high_cardinality_columns': high_cardinality if 'high_cardinality' in locals() else []
        }
    }

    # Guardar resultados del análisis para uso posterior
    globals()['_analysis_results_${safeVarName}'] = analysis_results
except Exception as e:
    print("Error guardando resultados del análisis: {}".format(str(e)))
`;
        return this.notebookExecutor.executeCode(analysisCode, `analysis_${safeVarName}`)
            .then(async result => {
                if (result.success) {
                    // Intentar extraer recomendaciones del output
                    let recs = [];
                    if (result.output) {
                        const lines = result.output.split('\n');
                        let recSection = false;
                        for (let line of lines) {
                            if (line.includes('💡 RECOMENDACIONES')) recSection = true;
                            else if (recSection && line.match(/^\d+\. /)) recs.push(line.trim());
                            else if (recSection && line.trim() === '') recSection = false;
                        }
                    }
                    lastRecommendations = recs;
                    // Guardar en window para acceso del agente
                    window.lastDataRecommendations = lastRecommendations;
                    // Agregar celda markdown automática al notebook con recomendaciones
                    if (window.agent && window.agent.addNotebookRecommendationCell) {
                        await window.agent.addNotebookRecommendationCell(lastRecommendations);
                    } else if (window.notebook && window.notebook.addMarkdownCell) {
                        // Fallback: inyectar celda markdown directamente si el agente no está
                        await window.notebook.addMarkdownCell(
                            `### 💡 Recomendaciones automáticas\n` +
                            (lastRecommendations.length > 0 ? lastRecommendations.map(r => `- ${r}`).join('\n') : 'No se detectaron recomendaciones específicas.')
                        );
                    }
                    // Si se detectó que el CSV fue cargado como una sola columna, sugerir/inyectar celda de limpieza
                    if (needsCleaningCell && window.agent && window.agent.addCleaningCellForSingleColumnCSV) {
                        await window.agent.addCleaningCellForSingleColumnCSV(safeVarName);
                    } else if (needsCleaningCell && window.notebook && window.notebook.addCodeCell) {
                        // Fallback: inyectar celda de limpieza básica
                        await window.notebook.addCodeCell(
                            `# Reparar DataFrame cargado como una sola columna\n` +
                            `import pandas as pd\n` +
                            `from io import StringIO\n` +
                            `if isinstance(${safeVarName}, pd.DataFrame) and ${safeVarName}.shape[1] == 1:\n` +
                            `    # Intentar dividir la columna en varias usando coma\n` +
                            `    fixed_df = pd.read_csv(StringIO(${safeVarName}.iloc[:,0].str.cat(sep='\n')), sep=',')\n` +
                            `    display(fixed_df.head())\n` +
                            `    # Asignar el DataFrame reparado\n` +
                            `    ${safeVarName} = fixed_df\n` +
                            `    print('✅ DataFrame reparado. Ahora tiene', ${safeVarName}.shape[1], 'columnas.')\n`
                        );
                    }
                    return {
                        success: true,
                        dataset: safeVarName,
                        recommendations: lastRecommendations
                    };
                } else {
                    console.error("Error en análisis automático:", result.error);
                    throw new Error(`Error en análisis automático: ${result.error}`);
                }
            });
    }


    // Obtener resumen del dataset actual para el agente
    async getDatasetSummaryForAgent() {
        if (!this.currentDataset || !this.notebookExecutor) {
            return null;
        }

        const safeVarName = DataLoader.sanitizeVarName(this.currentDataset.name);

        const summaryCode = `
# Verificar si el dataset existe
if '${safeVarName}' not in globals():
    print("⚠️ El dataset '${safeVarName}' no está disponible en el entorno de Python")
    _agent_summary = {
        'error': True,
        'message': "Dataset no disponible"
    }
else:
    try:
        # Obtener el dataset
        dataset = globals()['${safeVarName}']
        
        # Crear resumen para el agente IA
        summary = {
            'nombre': '${safeVarName}',
            'forma': list(dataset.shape),
            'filas': int(dataset.shape[0]),
            'columnas': int(dataset.shape[1]),
            'nombres_columnas': list(dataset.columns),
            'tipos': {col: str(dtype) for col, dtype in dataset.dtypes.items()},
            'nulos': {col: int(count) for col, count in dataset.isnull().sum().items()},
            'tipos_detectados': {
                'numericas': list(dataset.select_dtypes(include=['number']).columns),
                'categoricas': list(dataset.select_dtypes(include=['object', 'category']).columns),
                'fechas': []  # Se rellenará si se detectan fechas
            }
        }
        
        # Intentar detectar columnas de fecha
        for col in dataset.select_dtypes(include=['object']).columns:
            try:
                pd.to_datetime(dataset[col], errors='raise')
                summary['tipos_detectados']['fechas'].append(col)
            except:
                pass
        
        # Estadísticas básicas
        numeric_cols = dataset.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            desc = dataset[numeric_cols].describe().to_dict()
            # Convertir objetos numpy a tipos Python nativos para JSON
            for col in desc:
                for stat in desc[col]:
                    if hasattr(desc[col][stat], 'item'):
                        desc[col][stat] = desc[col][stat].item()
            summary['estadisticas'] = desc
        
        # Datos de muestra (primeras 5 filas)
        try:
            sample_rows = dataset.head(5).to_dict('records')
            # Convertir valores no serializables a strings
            for i, row in enumerate(sample_rows):
                for k, v in row.items():
                    if not isinstance(v, (int, float, str, bool, type(None))):
                        sample_rows[i][k] = str(v)
            summary['muestra'] = sample_rows
        except:
            summary['muestra'] = "No se pudieron obtener filas de muestra"
        
        # Valores únicos para columnas categóricas (limitado a las primeras 5)
        unique_values = {}
        for col in list(dataset.select_dtypes(include=['object', 'category']).columns)[:5]:
            if dataset[col].nunique() <= 20:  # Solo si hay pocos valores únicos
                unique_values[col] = list(dataset[col].value_counts().head(10).to_dict().keys())
        summary['valores_unicos'] = unique_values
        
        # Información de valores faltantes
        missing_data = {}
        for col in dataset.columns:
            missing_count = dataset[col].isnull().sum();
            if missing_count > 0:
                missing_data[col] = {
                    'count': int(missing_count),
                    'percent': float(missing_count / len(dataset) * 100)
                }
        summary['datos_faltantes'] = missing_data
        
        print("📋 Resumen del dataset preparado para el agente")
        _agent_summary = summary
    except Exception as e:
        print("❌ Error preparando resumen: {}".format(str(e)))
        _agent_summary = {
            'error': True,
            'message': str(e)
        }
`;

        const result = await this.notebookExecutor.executeCode(summaryCode, 'get_summary');
        
        if (result.success) {
            // Intentar obtener el resumen de la variable _agent_summary de Python
            const getVariableCode = `
import json
try:
    if '_agent_summary' in globals():
        print(json.dumps(_agent_summary))
    else:
        print(json.dumps({'error': True, 'message': "Resumen no disponible"}))
except Exception as e:
    print(json.dumps({'error': True, 'message': str(e)}))
`;
            const varResult = await this.notebookExecutor.executeCode(getVariableCode, 'get_summary_json');
            
            if (varResult.success && varResult.output) {
                try {
                    // Intentar parsear el JSON de salida
                    const outputLines = varResult.output.split('\n');
                    for (const line of outputLines) {
                        try {
                            const summaryObj = JSON.parse(line);
                            if (summaryObj && typeof summaryObj === 'object') {
                                // Combinar el resumen con la información del dataset
                                return {
                                    ...this.currentDataset,
                                    summary: summaryObj
                                };
                            }
                        } catch (e) {
                            // Ignorar líneas que no son JSON válido
                        }
                    }
                } catch (e) {
                    console.warn('Error parseando resumen JSON:', e);
                }
            }
            
            // Si no se pudo obtener el resumen detallado, devolver la info básica
            return this.currentDataset;
        }
        
        return null;
    }

    // Obtener información de todos los datasets cargados
    getLoadedDatasets() {
        return Array.from(this.loadedDatasets.values());
    }

    // Cambiar dataset activo
    setCurrentDataset(datasetName) {
        // Sanitizar el nombre para buscar el dataset correcto
        const safeVarName = DataLoader.sanitizeVarName(datasetName);
        if (this.loadedDatasets.has(safeVarName)) {
            this.currentDataset = this.loadedDatasets.get(safeVarName);
            return true;
        }
        return false;
    }
}

// Crear instancia global
window.dataLoader = new DataLoader();
