module.exports = {
  apps: [
    {
      name: 'medplat-backend',
      script: 'npm',
      args: 'run backend:dev',
      cwd: './',
      env: {
        PORT: 8080,
        NODE_ENV: 'development'
      }
    },
    {
      name: 'medplat-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: 'frontend',
      env: {
        VITE_API_BASE: 'http://localhost:8080',
        NODE_ENV: 'development'
      }
    }
  ]
};
