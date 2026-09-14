const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite uses a WebAssembly worker on web.
config.resolver.assetExts.push('wasm');

// SharedArrayBuffer requires cross-origin isolation in the local web dev server.
config.server.enhanceMiddleware = (middleware) => {
  return (request, response, next) => {
    response.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(request, response, next);
  };
};

module.exports = config;
