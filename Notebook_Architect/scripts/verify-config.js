// verify-config.js: Script para verificar la configuración del sistema
console.log('🔍 Verificando configuración del sistema...');

// Verificar que los módulos estén disponibles
function verifyModules() {
    console.log('\n📦 Verificando módulos:');
    
    // Verificar ModelConfig
    if (typeof window.modelConfig !== 'undefined') {
        console.log('✅ ModelConfig inicializado');
        const config = window.modelConfig.getConfig();
        console.log(`   • Proveedor: ${config.provider}`);
        console.log(`   • Endpoint: ${config.endpoint}`);
        console.log(`   • Modelo: ${config.model}`);
    } else {
        console.log('❌ ModelConfig no inicializado');
    }
    
    // Verificar ConfigUI
    if (typeof window.configUI !== 'undefined') {
        console.log('✅ ConfigUI inicializado');
    } else {
        console.log('❌ ConfigUI no inicializado');
    }
    
    // Verificar funciones globales
    const globalFunctions = ['showConfigPanel', 'hideConfigPanel', 'testConnection', 'saveConfig'];
    globalFunctions.forEach(func => {
        if (typeof window[func] === 'function') {
            console.log(`✅ ${func} disponible`);
        } else {
            console.log(`❌ ${func} no disponible`);
        }
    });
}

// Verificar elementos del DOM
function verifyDOM() {
    console.log('\n🎨 Verificando elementos DOM:');
    
    const elements = [
        'config-overlay',
        'provider-grid',
        'endpoint-input',
        'api-key-input',
        'model-select',
        'model-input',
        'temperature-input',
        'max-tokens-input',
        'top-p-input'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${id} encontrado`);
        } else {
            console.log(`❌ ${id} no encontrado`);
        }
    });
}

// Probar detección automática de proveedores
async function testProviderDetection() {
    console.log('\n🔍 Probando detección de proveedores:');
    
    if (window.modelConfig) {
        try {
            const providers = await window.modelConfig.detectAvailableProviders();
            Object.entries(providers).forEach(([key, result]) => {
                if (result.available) {
                    console.log(`✅ ${key}: Disponible (${result.models.length} modelos)`);
                } else {
                    console.log(`⚠️ ${key}: No disponible`);
                }
            });
        } catch (error) {
            console.log(`❌ Error detectando proveedores: ${error.message}`);
        }
    }
}

// Función principal de verificación
async function runVerification() {
    console.log('🚀 Iniciando verificación del sistema de configuración...');
    
    verifyModules();
    verifyDOM();
    await testProviderDetection();
    
    console.log('\n✅ Verificación completada. Revisa los resultados arriba.');
    console.log('💡 Para configurar tu modelo, haz clic en "⚙️ Configurar" en el header.');
}

// Ejecutar verificación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(runVerification, 2000); // Esperar 2 segundos para que todo se inicialice
    });
} else {
    setTimeout(runVerification, 2000);
}

// Función para ejecutar manualmente desde la consola
window.verifyConfig = runVerification;
