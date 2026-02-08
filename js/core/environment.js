// environment.js - Runtime environment detection and platform-specific dependency loading

// Environment detection
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof process !== 'undefined' && process.versions?.node;

// DOMParser abstraction
let DOMParserImpl;
if (isNode) {
    // Node.js: use xmldom package
    const xmldom = await import('xmldom');
    DOMParserImpl = xmldom.DOMParser;
} else {
    // Browser: use native DOMParser
    DOMParserImpl = window.DOMParser;
}
export { DOMParserImpl as DOMParser };

// SheetJS abstraction
export let XLSX;
if (isNode) {
    // Node.js: npm package with manual fs injection
    const xlsxModule = await import('xlsx');
    XLSX = xlsxModule.default || xlsxModule;

    // ESM requires set_fs for file operations
    const fs = await import('fs');
    const fsModule = fs.default || fs;
    if (XLSX.set_fs) {
        XLSX.set_fs(fsModule);
    }
} else {
    // Browser: use CDN global (loaded via <script> tag before modules)
    if (typeof window.XLSX === 'undefined') {
        throw new Error('SheetJS not loaded. Include <script> tag for XLSX CDN before module scripts.');
    }
    XLSX = window.XLSX;
}
