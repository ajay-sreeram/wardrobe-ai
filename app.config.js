const path = require('node:path');
const { config: loadEnv } = require('dotenv');

loadEnv({ path: path.join(__dirname, 'local-secrets', '.env'), quiet: true });

module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), 'expo-sharing', 'expo-secure-store'],
  extra: {
    ...config.extra,
    // Public routing configuration only. Provider keys belong in the Worker.
    apiBaseUrl: process.env.WARDROBE_API_BASE_URL,
  },
});
