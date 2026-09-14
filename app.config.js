const path = require('node:path');
const { config: loadEnv } = require('dotenv');

loadEnv({ path: path.join(__dirname, 'local-secrets', '.env'), quiet: true });

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    // Development only: Expo embeds these values in the client bundle.
    museApiKey: process.env.MUSE_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  },
});
