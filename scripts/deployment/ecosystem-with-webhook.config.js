// Read WEBHOOK_SECRET from .env file manually
// Test 1
const fs = require('fs');
const path = require('path');

let webhookSecret = 'fallback-secret';

try {
  const envPath = path.join(__dirname, '../../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const secretMatch = envContent.match(/WEBHOOK_SECRET=(.+)/);
  if (secretMatch) {
    webhookSecret = secretMatch[1].trim().replace(/['"]/g, '');
  }
} catch (error) {
  console.log('Warning: Could not read .env file, using fallback secret');
}

module.exports = {
  apps: [
    {
      name: 'wannfahrma',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    {
      name: 'wannfahrma-webhook',
      script: 'webhook-listener.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        WEBHOOK_PORT: 3001,
        WEBHOOK_SECRET: webhookSecret,
        APP_DIR: '/home/ubuntu/wannfahrma-v1'
      },
      error_file: './logs/webhook-err.log',
      out_file: './logs/webhook-out.log',
      log_file: './logs/webhook-combined.log',
      time: true
    }
  ]
};
