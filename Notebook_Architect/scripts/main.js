// main.js: Orquestador principal de la aplicación
import { initializeAgent, onAgentReady } from './agent.js';
import { loadPyodideWithFallback, onPyodideReady, onPyodideLoading, onPyodideError } from './pyodide-loader.js';
import { NotebookExecutor } from './notebook-executor.js';
import { ConfigUI } from './config-ui.js';
import { DataUI } from './data-ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM listo. Iniciando aplicación...');

    const loadingDetails = document.getElementById('loading-details');
    const loadingOverlay = document.getElementById('loading-overlay');
    const appRoot = document.getElementById('app-root');
    const pythonStatus = document.getElementById('python-status');

    // Inicializar sistema de configuración
    console.log('🔧 Inicializando sistema de configuración...');
    if (window.configUI) {
        window.configUI.init().catch(error => {
            console.warn('Error inicializando configuración UI:', error);
        });
    }

    // Inicializar sistema de datos
    console.log('📊 Inicializando sistema de datos...');
    if (window.dataUI) {
        console.log('✅ Sistema de datos inicializado');
    }

    // Actualizar mensajes de carga de Pyodide
    onPyodideLoading(e => {
        if (loadingDetails) loadingDetails.textContent = `Cargando Pyodide (intento ${e.detail.attempt})...`;
        if (pythonStatus) pythonStatus.textContent = 'Cargando Python...';
    });

    onPyodideReady(e => {
        if (loadingDetails) loadingDetails.textContent = `Pyodide cargado desde ${e.detail.cdn}`;
        if (pythonStatus) pythonStatus.textContent = 'Python listo';
    });

    onPyodideError(e => {
        if (loadingDetails) loadingDetails.textContent = `Error al cargar Pyodide: ${e.detail}`;
        if (loadingOverlay) loadingOverlay.classList.add('error');
        if (pythonStatus) pythonStatus.textContent = 'Error de Python';
    });

    // Iniciar la carga de Pyodide
    loadPyodideWithFallback()
        .then(() => {
            console.log('✅ Pyodide listo. Inicializando el agente...');
            initializeAgent(); // Iniciar el agente después de Pyodide
        })
        .catch(error => {
            console.error('❌ Falló la carga de Pyodide y la inicialización del agente.', error);
            if (pythonStatus) pythonStatus.textContent = 'Error al cargar';
        });

    // Cuando el agente esté listo, la aplicación está completamente funcional
    onAgentReady(() => {
        console.log('🚀 Agente y aplicación listos.');
        
        // Conectar DataLoader con NotebookExecutor si está disponible
        if (window.dataUI && window.dataLoader) {
            const executor = window.notebookExecutor || notebookExecutor;
            if (executor) {
                window.dataUI.setNotebookExecutor(executor);
                window.dataLoader.setNotebookExecutor(executor);
                console.log('🔗 Sistema de datos conectado con NotebookExecutor');
            }
        }
        
        // Asegurar que el overlay desaparezca
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // Mostrar la aplicación
        if (appRoot) {
            appRoot.classList.remove('hidden');
        }
        
        // Actualizar estado final
        if (pythonStatus) {
            pythonStatus.textContent = 'Sistema listo';
        }
        
        // Actualizar el punto de estado a verde
        const statusDot = document.getElementById('status-dot');
        if (statusDot) {
            statusDot.style.background = 'var(--success)';
        }
    });
});
