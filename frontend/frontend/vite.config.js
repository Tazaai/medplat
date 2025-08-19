export default {
  preview: {
    host: true,
    port: parseInt(process.env.PORT) || 8080,
    allowedHosts: ['.run.app']
  }
}
