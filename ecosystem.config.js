module.exports = {
  apps: [
    {
      name: 'owlverify-frontend',
      script: 'src/index.js',
      exec_mode: 'cluster_mode',
      instances: 'max',
      env: {
        //'NODE_ENV': 'production',
      }
    },
  ]
}
