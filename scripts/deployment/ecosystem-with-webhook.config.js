// Load environment variables from .env file
require('dotenv').config();

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
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
        APP_DIR: '/home/ubuntu/wannfahrma-v1'
      },
      error_file: './logs/webhook-err.log',
      out_file: './logs/webhook-out.log',
      log_file: './logs/webhook-combined.log',
      time: true
    }
  ]
};
