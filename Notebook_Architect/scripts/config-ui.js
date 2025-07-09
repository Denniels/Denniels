// config-ui.js: Interfaz de usuario para configuración de modelos
import { ModelConfig } from './model-config.js';

class ConfigUI {
    constructor() {
        this.modelConfig = new ModelConfig();
        this.availableProviders = {};
        this.currentProvider = null;
    }

    async init() {
        // Detectar proveedores disponibles
        console.log('🔍 Detectando proveedores disponibles...');
        this.availableProviders = await this.modelConfig.detectAvailableProviders();
        console.log('Proveedores detectados:', this.availableProviders);
        
        // Cargar configuración actual
        this.loadCurrentConfig();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        console.log('✅ Configuración UI inicializada');
    }

    setupEventListeners() {
        // Event listener para cambio de proveedor
        document.addEventListener('click', (e) => {
            if (e.target.closest('.provider-option')) {
                const provider = e.target.closest('.provider-option').dataset.provider;
                this.selectProvider(provider);
            }
        });

        // Event listener para cambio de endpoint
        const endpointInput = document.getElementById('endpoint-input');
        if (endpointInput) {
            endpointInput.addEventListener('input', () => {
                this.clearTestResult();
            });
        }
    }

    showConfigPanel() {
        this.renderProviders();
        this.loadCurrentConfig();
        document.getElementById('config-overlay').classList.remove('hidden');
    }

    hideConfigPanel() {
        document.getElementById('config-overlay').classList.add('hidden');
    }

    renderProviders() {
        const grid = document.getElementById('provider-grid');
        if (!grid) return;

        grid.innerHTML = '';

        Object.entries(this.modelConfig.providers).forEach(([key, provider]) => {
            const isAvailable = this.availableProviders[key]?.available || key === 'custom';
            const isActive = this.currentProvider === key;

            const providerDiv = document.createElement('div');
            providerDiv.className = `provider-option ${isActive ? 'active' : ''} ${isAvailable ? 'available' : ''}`;
            providerDiv.dataset.provider = key;
            providerDiv.title = provider.description || '';

            providerDiv.innerHTML = `
                <span class="provider-icon">${provider.icon}</span>
                <div class="provider-name">${provider.name}</div>
                <div class="provider-status">
                    ${isAvailable ? '✅ Disponible' : '⚠️ No detectado'}
                </div>
                <div class="provider-description">${provider.description || ''}</div>
            `;

            grid.appendChild(providerDiv);
        });
    }

    selectProvider(providerKey) {
        this.currentProvider = providerKey;
        const provider = this.modelConfig.providers[providerKey];

        // Actualizar UI visual
        document.querySelectorAll('.provider-option').forEach(el => {
            el.classList.remove('active');
        });
        document.querySelector(`[data-provider="${providerKey}"]`).classList.add('active');

        // Actualizar campos de configuración
        const endpointInput = document.getElementById('endpoint-input');
        const apiKeyField = document.getElementById('api-key-field');
        const modelSelect = document.getElementById('model-select');
        const modelInput = document.getElementById('model-input');

        if (endpointInput) {
            endpointInput.value = provider.defaultEndpoint;
        }

        // Mostrar/ocultar campo API key
        if (apiKeyField) {
            if (provider.requiresApiKey) {
                apiKeyField.classList.remove('hidden');
            } else {
                apiKeyField.classList.add('hidden');
            }
        }

        // Cargar modelos disponibles
        this.loadModelsForProvider(providerKey);

        // Limpiar resultado de prueba
        this.clearTestResult();
    }

    async loadModelsForProvider(providerKey) {
        const modelSelect = document.getElementById('model-select');
        const modelInput = document.getElementById('model-input');
        
        if (!modelSelect || !modelInput) return;

        const availableModels = this.availableProviders[providerKey]?.models || [];

        if (availableModels.length > 0) {
            // Mostrar dropdown con modelos detectados
            modelSelect.classList.remove('hidden');
            modelInput.classList.add('hidden');

            modelSelect.innerHTML = '<option value="">Seleccionar modelo...</option>';
            availableModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelSelect.appendChild(option);
            });
        } else {
            // Mostrar input manual si no se detectaron modelos
            modelSelect.classList.add('hidden');
            modelInput.classList.remove('hidden');
            modelInput.placeholder = `Nombre del modelo para ${this.modelConfig.providers[providerKey].name}`;
        }
    }

    loadCurrentConfig() {
        const config = this.modelConfig.getConfig();
        
        this.currentProvider = config.provider;

        // Cargar valores en los campos
        const endpointInput = document.getElementById('endpoint-input');
        const apiKeyInput = document.getElementById('api-key-input');
        const modelSelect = document.getElementById('model-select');
        const modelInput = document.getElementById('model-input');
        const temperatureInput = document.getElementById('temperature-input');
        const maxTokensInput = document.getElementById('max-tokens-input');
        const topPInput = document.getElementById('top-p-input');

        if (endpointInput) endpointInput.value = config.endpoint || '';
        if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
        if (temperatureInput) temperatureInput.value = config.temperature || 0.3;
        if (maxTokensInput) maxTokensInput.value = config.maxTokens || 3000;
        if (topPInput) topPInput.value = config.topP || 0.9;

        // Seleccionar modelo
        if (modelSelect && !modelSelect.classList.contains('hidden')) {
            modelSelect.value = config.model || '';
        }
        if (modelInput && !modelInput.classList.contains('hidden')) {
            modelInput.value = config.model || '';
        }
    }

    async testConnection() {
        const endpointInput = document.getElementById('endpoint-input');
        const apiKeyInput = document.getElementById('api-key-input');
        
        if (!endpointInput || !this.currentProvider) {
            this.showTestResult('error', 'Selecciona un proveedor y endpoint válido');
            return;
        }

        const endpoint = endpointInput.value.trim();
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

        if (!endpoint) {
            this.showTestResult('error', 'Ingresa un endpoint válido');
            return;
        }

        this.showTestResult('testing', '🧪 Probando conexión...');

        try {
            const result = await this.modelConfig.testConnection(this.currentProvider, endpoint, apiKey);
            
            if (result.success) {
                this.showTestResult('success', `✅ ${result.message}`);
                
                // Actualizar modelos disponibles si se obtuvieron
                if (result.models && result.models.length > 0) {
                    this.availableProviders[this.currentProvider] = {
                        available: true,
                        models: result.models
                    };
                    this.loadModelsForProvider(this.currentProvider);
                }
            } else {
                this.showTestResult('error', `❌ ${result.message}`);
            }
        } catch (error) {
            this.showTestResult('error', `❌ Error: ${error.message}`);
        }
    }

    showTestResult(type, message) {
        const resultDiv = document.getElementById('endpoint-test-result');
        if (!resultDiv) return;

        resultDiv.classList.remove('hidden', 'success', 'error', 'testing');
        resultDiv.classList.add(type);
        resultDiv.textContent = message;

        if (type !== 'testing') {
            setTimeout(() => {
                resultDiv.classList.add('hidden');
            }, 5000);
        }
    }

    clearTestResult() {
        const resultDiv = document.getElementById('endpoint-test-result');
        if (resultDiv) {
            resultDiv.classList.add('hidden');
        }
    }

    saveConfig() {
        if (!this.currentProvider) {
            this.showTestResult('error', 'Selecciona un proveedor');
            return;
        }

        const endpointInput = document.getElementById('endpoint-input');
        const apiKeyInput = document.getElementById('api-key-input');
        const modelSelect = document.getElementById('model-select');
        const modelInput = document.getElementById('model-input');
        const temperatureInput = document.getElementById('temperature-input');
        const maxTokensInput = document.getElementById('max-tokens-input');
        const topPInput = document.getElementById('top-p-input');

        const config = {
            provider: this.currentProvider,
            endpoint: endpointInput?.value.trim() || '',
            apiKey: apiKeyInput?.value.trim() || '',
            model: this.getSelectedModel(),
            temperature: parseFloat(temperatureInput?.value) || 0.3,
            maxTokens: parseInt(maxTokensInput?.value) || 3000,
            topP: parseFloat(topPInput?.value) || 0.9
        };

        // Validaciones básicas
        if (!config.endpoint) {
            this.showTestResult('error', 'El endpoint es requerido');
            return;
        }

        if (!config.model) {
            this.showTestResult('error', 'Selecciona o ingresa un modelo');
            return;
        }

        try {
            this.modelConfig.saveConfig(config);
            this.showTestResult('success', '✅ Configuración guardada correctamente');
            
            // Actualizar indicador en el agente con más detalles
            if (window.addAgentMessage) {
                const providerName = this.modelConfig.providers[config.provider].name;
                const message = `🔧 Configuración actualizada:\n• Proveedor: ${providerName}\n• Modelo: ${config.model}\n• Endpoint: ${config.endpoint}\n• Temperatura: ${config.temperature}`;
                window.addAgentMessage(message);
            }

            setTimeout(() => {
                this.hideConfigPanel();
            }, 2000);
        } catch (error) {
            this.showTestResult('error', `❌ Error guardando: ${error.message}`);
        }
    }

    getSelectedModel() {
        const modelSelect = document.getElementById('model-select');
        const modelInput = document.getElementById('model-input');

        if (modelSelect && !modelSelect.classList.contains('hidden')) {
            return modelSelect.value;
        }
        
        if (modelInput && !modelInput.classList.contains('hidden')) {
            return modelInput.value.trim();
        }

        return '';
    }

    resetConfig() {
        if (confirm('¿Restablecer toda la configuración a los valores por defecto?')) {
            localStorage.removeItem('notebook-architect-config');
            this.modelConfig = new ModelConfig();
            this.loadCurrentConfig();
            this.renderProviders();
            this.showTestResult('success', '🔄 Configuración restablecida');
        }
    }
}

// Crear instancia global
window.configUI = new ConfigUI();

// Funciones globales para el HTML
window.showConfigPanel = () => window.configUI.showConfigPanel();
window.hideConfigPanel = () => window.configUI.hideConfigPanel();
window.testConnection = () => window.configUI.testConnection();
window.saveConfig = () => window.configUI.saveConfig();
window.resetConfig = () => window.configUI.resetConfig();

export { ConfigUI };
