const axios = require('axios');

async function loadSecretsFromVault(retries = 5, delay = 2000) {
  const vaultAddr = process.env.VAULT_ADDR || 'http://vault:8200';
  const vaultToken = process.env.VAULT_TOKEN || 'root';
  const secretPath = `${vaultAddr}/v1/secret/data/fileforge/backend`;

  console.log(`🔑 App requesting secrets from Vault: ${secretPath}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(secretPath, {
        headers: { 'X-Vault-Token': vaultToken },
        timeout: 4000
      });

      const secrets = response.data?.data?.data;
      if (secrets) {
        Object.keys(secrets).forEach((key) => {
          process.env[key] = secrets[key];
        });
        console.log('✅ Secrets loaded from Vault into process.env!');
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Vault read attempt ${attempt}/${retries} failed (${err.message})`);
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  console.warn('⚠️ Vault unavailable. Falling back to local environment variables.');
}

module.exports = { loadSecretsFromVault };
