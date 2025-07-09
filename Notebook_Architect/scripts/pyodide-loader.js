// pyodide-loader.js: Carga de Pyodide con fallback
const pyodideCDNs = [
  'https://cdn.pyodide.org/v0.24.1/full/pyodide.js',
  'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js',
  'https://unpkg.com/pyodide@0.24.1/pyodide.js'
];

let pyodideLoaded = false;
let successfulCDN = null;

export function loadPyodideWithFallback() {
  return new Promise((resolve, reject) => {
    loadFromCDN(0, resolve, reject);
  });
}

function loadFromCDN(index, resolve, reject) {
  if (index >= pyodideCDNs.length) {
    console.error('❌ Todos los CDNs de Pyodide fallaron');
    window.pyodideLoadError = true;
    document.dispatchEvent(new CustomEvent('pyodide-error', { 
      detail: 'Ningún CDN funcionó' 
    }));
    reject(new Error('Ningún CDN funcionó'));
    return;
  }

  console.log(`📡 CDN ${index + 1}/${pyodideCDNs.length}: ${pyodideCDNs[index]}`);
  document.dispatchEvent(new CustomEvent('pyodide-loading', { 
    detail: { cdn: pyodideCDNs[index], attempt: index + 1 } 
  }));

  const script = document.createElement('script');
  script.src = pyodideCDNs[index];

  const timeoutId = setTimeout(() => {
    console.warn(`⏰ Timeout CDN ${index + 1}, probando siguiente...`);
    script.remove();
    loadFromCDN(index + 1, resolve, reject);
  }, 15000);

  script.onload = () => {
    clearTimeout(timeoutId);
    console.log(`✅ CDN ${index + 1} cargado exitosamente`);
    
    if (typeof loadPyodide === 'function') {
      console.log('✅ loadPyodide disponible');
      pyodideLoaded = true;
      successfulCDN = pyodideCDNs[index];
      window.successfulPyodideCDN = successfulCDN;
      
      console.log(`🎯 CDN exitoso: ${successfulCDN}`);
      document.dispatchEvent(new CustomEvent('pyodide-ready', { 
        detail: { cdn: successfulCDN } 
      }));
      resolve(successfulCDN);
    } else {
      console.error('❌ loadPyodide no disponible después de carga');
      loadFromCDN(index + 1, resolve, reject);
    }
  };

  script.onerror = (event) => {
    clearTimeout(timeoutId);
    console.error(`❌ CDN ${index + 1} falló:`, event);
    loadFromCDN(index + 1, resolve, reject);
  };

  document.head.appendChild(script);
}

export function onPyodideLoading(callback) {
  document.addEventListener('pyodide-loading', callback);
}

export function onPyodideReady(callback) {
  document.addEventListener('pyodide-ready', callback);
}

export function onPyodideError(callback) {
  document.addEventListener('pyodide-error', callback);
}
