// model-config.js: Configuración de modelos y proveedores
class ModelConfig {
    constructor() {
        this.providers = {
            lmstudio: {
                name: 'LM Studio',
                defaultEndpoint: 'http://localhost:1234/v1/chat/completions',
                requiresApiKey: false,
                icon: '🖥️',
                testEndpoint: 'http://localhost:1234/v1/models',
                description: 'Ejecuta modelos locales con LM Studio'
            },
            ollama: {
                name: 'Ollama',
                defaultEndpoint: 'http://localhost:11434/api/chat',
                requiresApiKey: false,
                icon: '🦙',
                testEndpoint: 'http://localhost:11434/api/tags',
                description: 'Ejecuta modelos locales con Ollama'
            },
            openai: {
                name: 'OpenAI',
                defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
                requiresApiKey: true,
                icon: '🤖',
                testEndpoint: 'https://api.openai.com/v1/models',
                description: 'API de OpenAI (GPT-4, GPT-3.5, etc.)'
            },
            anthropic: {
                name: 'Anthropic (Claude)',
                defaultEndpoint: 'https://api.anthropic.com/v1/messages',
                requiresApiKey: true,
                icon: '🧠',
                testEndpoint: null,
                description: 'API de Anthropic (Claude 3)'
            },
            custom: {
                name: 'Endpoint Personalizado',
                defaultEndpoint: '',
                requiresApiKey: false,
                icon: '⚙️',
                testEndpoint: null,
                description: 'Configura tu propio endpoint personalizado'
            }
        };

        this.currentConfig = this.loadConfig();
    }

    loadConfig() {
        const saved = localStorage.getItem('notebook-architect-config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                console.log('Configuración cargada:', config);
                return config;
            } catch (e) {
                console.warn('Error cargando configuración guardada:', e);
            }
        }

        // Configuración por defecto
        const defaultConfig = {
            provider: 'lmstudio',
            endpoint: this.providers.lmstudio.defaultEndpoint,
            apiKey: '',
            model: 'qwen2.5-7b-instruct',
            temperature: 0.3,
            maxTokens: 3000,
            topP: 0.9
        };
        
        console.log('Usando configuración por defecto:', defaultConfig);
        return defaultConfig;
    }

    saveConfig(config) {
        this.currentConfig = { ...this.currentConfig, ...config };
        localStorage.setItem('notebook-architect-config', JSON.stringify(this.currentConfig));
        console.log('Configuración guardada:', this.currentConfig);
    }

    getConfig() {
        return this.currentConfig;
    }

    async testConnection(provider, endpoint, apiKey = '') {
        const providerInfo = this.providers[provider];
        if (!providerInfo) {
            return { success: false, message: 'Proveedor no válido' };
        }

        // Para proveedores que no tienen testEndpoint, usar el endpoint principal con un mensaje simple
        const testUrl = providerInfo.testEndpoint || endpoint;
        
        try {
            const headers = { 'Content-Type': 'application/json' };
            
            if (providerInfo.requiresApiKey && apiKey) {
                if (provider === 'openai') {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                } else if (provider === 'anthropic') {
                    headers['x-api-key'] = apiKey;
                    headers['anthropic-version'] = '2023-06-01';
                }
            }

            let response;
            let testMethod = 'GET';
            let testBody = null;

            // Para algunos proveedores usamos GET para obtener modelos, para otros POST con mensaje de prueba
            if (provider === 'anthropic' || !providerInfo.testEndpoint) {
                // Para Anthropic y endpoints personalizados, hacer un POST de prueba
                testMethod = 'POST';
                testBody = JSON.stringify(this.createTestRequest(provider, apiKey));
            }

            if (testMethod === 'GET') {
                response = await fetch(testUrl, { 
                    method: 'GET',
                    headers: headers,
                    signal: AbortSignal.timeout(10000) // 10 segundos timeout
                });
            } else {
                response = await fetch(testUrl, {
                    method: 'POST',
                    headers: headers,
                    body: testBody,
                    signal: AbortSignal.timeout(10000)
                });
            }

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    message: 'Conexión exitosa',
                    models: this.extractModels(provider, data)
                };
            } else {
                let errorMessage = `Error HTTP: ${response.status}`;
                if (response.status === 401) {
                    errorMessage += ' - API Key inválida o faltante';
                } else if (response.status === 403) {
                    errorMessage += ' - Acceso denegado';
                } else if (response.status === 404) {
                    errorMessage += ' - Endpoint no encontrado';
                }
                
                return {
                    success: false,
                    message: errorMessage
                };
            }
        } catch (error) {
            let errorMessage = 'Error de conexión';
            
            if (error.name === 'TimeoutError') {
                errorMessage = 'Timeout - El servidor no responde';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'No se puede conectar al servidor. Verifica la URL y que el servicio esté ejecutándose.';
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                message: errorMessage
            };
        }
    }

    createTestRequest(provider, apiKey) {
        const testMessage = {
            role: 'user',
            content: 'Hola'
        };

        switch (provider) {
            case 'lmstudio':
            case 'openai':
                return {
                    model: 'test-model',
                    messages: [testMessage],
                    max_tokens: 5,
                    temperature: 0.1
                };
            
            case 'ollama':
                return {
                    model: 'llama3.1',
                    messages: [testMessage],
                    stream: false,
                    options: {
                        num_predict: 5,
                        temperature: 0.1
                    }
                };
            
            case 'anthropic':
                return {
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 5,
                    messages: [testMessage]
                };
            
            default:
                return {
                    messages: [testMessage],
                    max_tokens: 5,
                    temperature: 0.1
                };
        }
    }

    extractModels(provider, data) {
        try {
            switch (provider) {
                case 'lmstudio':
                case 'openai':
                    return data.data?.map(model => model.id) || [];
                case 'ollama':
                    return data.models?.map(model => model.name) || [];
                default:
                    return [];
            }
        } catch (e) {
            console.warn('Error extrayendo modelos:', e);
            return [];
        }
    }

    async detectAvailableProviders() {
        const results = {};
        
        for (const [key, provider] of Object.entries(this.providers)) {
            if (key === 'custom' || !provider.testEndpoint) continue;
            
            try {
                const result = await this.testConnection(key, provider.testEndpoint);
                results[key] = {
                    available: result.success,
                    models: result.models || []
                };
            } catch (e) {
                results[key] = { available: false, models: [] };
            }
        }

        return results;
    }

    formatRequestForProvider(provider, messages, config) {
        const baseConfig = {
            messages: messages,
            temperature: config.temperature || 0.3,
            max_tokens: config.maxTokens || 3000
        };

        switch (provider) {
            case 'lmstudio':
            case 'openai':
                return {
                    ...baseConfig,
                    model: config.model,
                    top_p: config.topP || 0.9
                };

            case 'ollama':
                return {
                    model: config.model,
                    messages: messages,
                    stream: false,
                    options: {
                        temperature: config.temperature || 0.3,
                        top_p: config.topP || 0.9,
                        num_predict: config.maxTokens || 3000
                    }
                };

            case 'anthropic':
                return {
                    model: config.model || 'claude-3-sonnet-20240229',
                    max_tokens: config.maxTokens || 3000,
                    temperature: config.temperature || 0.3,
                    messages: messages.filter(m => m.role !== 'system'),
                    system: messages.find(m => m.role === 'system')?.content || ''
                };

            default:
                return baseConfig;
        }
    }

    getRequestHeaders(provider, apiKey) {
        const headers = { 'Content-Type': 'application/json' };

        if (this.providers[provider]?.requiresApiKey && apiKey) {
            if (provider === 'openai') {
                headers['Authorization'] = `Bearer ${apiKey}`;
            } else if (provider === 'anthropic') {
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
            }
        }

        return headers;
    }

    extractResponse(provider, data) {
        try {
            switch (provider) {
                case 'lmstudio':
                case 'openai':
                case 'ollama':
                    return data.choices?.[0]?.message?.content || data.message?.content || '';
                
                case 'anthropic':
                    return data.content?.[0]?.text || '';
                
                default:
                    return data.choices?.[0]?.message?.content || '';
            }
        } catch (e) {
            console.error('Error extrayendo respuesta:', e);
            return 'Error procesando respuesta del modelo';
        }
    }
}

// Crear instancia global
window.modelConfig = new ModelConfig();

export { ModelConfig };
