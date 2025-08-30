import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables with fallback values
const rpcUrls = {
    21201: process.env.VITE_RPC_BLOCKNET || 'https://rpc.blocknet.org',
    80002: process.env.VITE_RPC_AMOY || 'https://rpc-amoy.polygon.technology',
    137: process.env.VITE_RPC_POLYGON || 'https://polygon-rpc.com'
};

const configContent = `// Auto-generated config file - DO NOT EDIT
export const RPC_URLS = ${JSON.stringify(rpcUrls, null, 4)};
`;

// Write the config file
const configPath = path.join(__dirname, '..', 'config.js');
fs.writeFileSync(configPath, configContent);

console.log('Config file generated successfully');