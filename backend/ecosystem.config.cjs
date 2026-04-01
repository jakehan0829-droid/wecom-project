module.exports = {
  apps: [
    {
      name: 'chronic-disease-backend',
      cwd: '/root/.openclaw/workspace/project/backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
