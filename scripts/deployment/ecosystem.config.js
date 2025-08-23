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
  }, {
    name: 'wannfahrma-feedback',
    script: 'feedback/feedback-api.js',
    
    // Instance configuration
    instances: 1,
    exec_mode: 'fork',
    
    // Auto-restart configuration
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    
    // Development environment
    env_development: {
      NODE_ENV: 'development',
      PORT: 3002
    },
    
    // Logging
    error_file: './logs/feedback-err.log',
    out_file: './logs/feedback-out.log',
    log_file: './logs/feedback-combined.log',
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
    node_args: '--max-old-space-size=512'
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['server1.example.com'],
      ref: 'origin/main',
      repo: 'https://github.com/ochtii/wannfahrma-v1.git',
      path: '/home/ubuntu/wannfahrma-v1',
      'post-deploy': 'cd feedback && npm install && cd .. && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
