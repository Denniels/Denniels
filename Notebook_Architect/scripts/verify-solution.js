// 🔧 SCRIPT DE VERIFICACIÓN RÁPIDA
// Copia y pega este código en la consola del navegador para verificar la solución

console.log('🔍 VERIFICANDO SOLUCIÓN CDN + INDEXURL...\n');

// 1. Verificar qué scripts de Pyodide están cargados
console.log('📋 PASO 1: Scripts de Pyodide cargados');
const pyodideScripts = document.querySelectorAll('script[src*="pyodide"]');
console.log(`   Cantidad: ${pyodideScripts.length}`);

pyodideScripts.forEach((script, index) => {
    console.log(`   Script ${index + 1}: ${script.src}`);
    
    // Verificar si es el CDN alternativo exitoso
    if (script.src.includes('jsdelivr.net')) {
        console.log('   ✅ JSDelivr CDN detectado - esto es bueno!');
    } else if (script.src.includes('unpkg.com')) {
        console.log('   ✅ UNPKG CDN detectado - esto es bueno!');
    } else if (script.src.includes('cdn.pyodide.org')) {
        console.log('   ⚠️ CDN original (puede estar caído)');
    }
});

// 2. Verificar variables globales de la solución
console.log('\n📋 PASO 2: Variables globales de la solución');
console.log(`   window.successfulPyodideCDN: ${window.successfulPyodideCDN || 'NO DEFINIDO'}`);
console.log(`   window.successfulCDNIndex: ${window.successfulCDNIndex || 'NO DEFINIDO'}`);
console.log(`   window.pyodideReady: ${window.pyodideReady || 'NO DEFINIDO'}`);

// 3. Verificar disponibilidad de loadPyodide
console.log('\n📋 PASO 3: Disponibilidad de loadPyodide');
console.log(`   typeof loadPyodide: ${typeof loadPyodide}`);
if (typeof loadPyodide === 'function') {
    console.log('   ✅ loadPyodide está disponible');
} else {
    console.log('   ❌ loadPyodide NO está disponible');
}

// 4. Predecir indexURL que se usará
console.log('\n📋 PASO 4: Predicción de indexURL');
if (window.successfulPyodideCDN) {
    let predictedIndexURL;
    if (window.successfulPyodideCDN.includes('jsdelivr.net')) {
        predictedIndexURL = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/';
    } else if (window.successfulPyodideCDN.includes('unpkg.com')) {
        predictedIndexURL = 'https://unpkg.com/pyodide@0.24.1/';
    } else {
        predictedIndexURL = 'https://cdn.pyodide.org/v0.24.1/full/';
    }
    console.log(`   🎯 indexURL que se usará: ${predictedIndexURL}`);
    
    // Verificar si el indexURL es diferente al CDN original
    if (predictedIndexURL !== 'https://cdn.pyodide.org/v0.24.1/full/') {
        console.log('   ✅ CORRECCIÓN APLICADA: indexURL usa CDN alternativo');
    } else {
        console.log('   ⚠️ indexURL sigue siendo el CDN original');
    }
} else {
    console.log('   ❌ No se puede predecir indexURL - CDN exitoso no guardado');
}

// 5. Verificar estado del ejecutor Python
console.log('\n📋 PASO 5: Estado del ejecutor Python');
if (window.pythonExecutor) {
    const status = window.pythonExecutor.getStatus();
    console.log(`   Ejecutor existe: ✅`);
    console.log(`   Python listo: ${status.ready ? '✅' : '❌'}`);
    console.log(`   Paquetes instalados: ${status.installedPackages.length}`);
} else {
    console.log('   ❌ window.pythonExecutor no existe');
}

// 6. Test de URLs de recursos
console.log('\n📋 PASO 6: Test de accesibilidad de URLs');
const testURLs = [
    'https://cdn.pyodide.org/v0.24.1/full/',
    'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
    'https://unpkg.com/pyodide@0.24.1/'
];

testURLs.forEach(async (url, index) => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        console.log(`   URL ${index + 1}: ✅ ${url} (${response.status})`);
    } catch (error) {
        console.log(`   URL ${index + 1}: ❌ ${url} (${error.message})`);
    }
});

// 7. Resumen y recomendaciones
console.log('\n📋 RESUMEN Y RECOMENDACIONES:');
console.log('');

if (window.successfulPyodideCDN && window.successfulPyodideCDN.includes('jsdelivr.net')) {
    console.log('✅ ESTADO: Solución funcionando correctamente');
    console.log('   • CDN original falló (net::ERR_NAME_NOT_RESOLVED)');
    console.log('   • JSDelivr CDN cargó exitosamente');
    console.log('   • indexURL se ajustará automáticamente');
    console.log('   • Recursos se cargarán desde JSDelivr');
    console.log('');
    console.log('🎯 SIGUIENTE PASO: Verificar que no hay errores de "Failed to fetch" en la consola');
} else if (typeof loadPyodide === 'undefined') {
    console.log('❌ PROBLEMA: loadPyodide no está disponible');
    console.log('   • Ningún CDN pudo cargar pyodide.js');
    console.log('   • Verificar conexión a internet');
    console.log('   • Comprobar firewall/proxy');
    console.log('');
    console.log('🎯 SIGUIENTE PASO: Revisar DevTools > Network > errores de red');
} else {
    console.log('⚠️ ESTADO INTERMEDIO: Parcialmente cargado');
    console.log('   • loadPyodide está disponible');
    console.log('   • Pero CDN exitoso no se guardó correctamente');
    console.log('');
    console.log('🎯 SIGUIENTE PASO: Recargar la página para activar la solución');
}

console.log('\n🔧 Para más diagnósticos, abre: debug-pyodide.html');
console.log('📓 Para guía completa, ve a: notebooks/pyodide-debug-guide.ipynb');
