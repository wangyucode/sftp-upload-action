const { Deployer } = require('./lib/deployer');
const fs = require('fs');

new Deployer({
    host: '192.168.0.99',
    privateKey: fs.readFileSync('./id_rsa'),
    localDir: './',
    remoteDir: '/root/test/'
}, { exclude: ['node_modules'], dryRun: false })
    .sync();