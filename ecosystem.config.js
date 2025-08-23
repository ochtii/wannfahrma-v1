module.exports = {
  apps: [{
    name: 'wannfahrma',
    script: 'server.js',
    
    // Instance configuration
    instances: 1,
    exec_mode: 'fork', // 'cluster' für multiple instances
    
    // Auto-restart configuration
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Development environment
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Advanced PM2 features
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Monitoring
    pmx: true,
    
    // Source map support
    source_map_support: true,
    
    // Graceful shutdown
    kill_timeout: 1600,
    
    // Environment specific settings
    node_args: '--max-old-space-size=1024'
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['server1.example.com'],
      ref: 'origin/main',
      repo: 'https://github.com/ochtii/wannfahrma-v1.git',
      path: '/home/ubuntu/wannfahrma-v1',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
