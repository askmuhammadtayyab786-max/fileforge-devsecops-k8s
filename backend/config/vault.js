const vault = require('node-vault');
const fs = require('fs');

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://vault:8200';
const K8S_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token';

async function loadSecretsFromVault() {
  if (!fs.existsSync(K8S_TOKEN_PATH)) {
    throw new Error('No Kubernetes ServiceAccount token found — is this running in-cluster?');
  }

  const jwt = fs.readFileSync(K8S_TOKEN_PATH, 'utf8');

  const client = vault({
    apiVersion: 'v1',
    endpoint: VAULT_ADDR,
  });

const authResult = await client.write('auth/kubernetes/login', {
    role: 'backend',
    jwt,
  });
  client.token = authResult.auth.client_token;

  const result = await client.read('secret/data/backend/config');
  const secrets = result.data.data;

  for (const [key, value] of Object.entries(secrets)) {
    process.env[key] = value;
  }

  console.log('Secrets loaded from Vault successfully.');
}

module.exports = { loadSecretsFromVault };
