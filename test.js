const { Deployer } = require('./lib/deployer');
const fs = require('fs');

new Deployer({
    host: '192.168.0.99',
    privateKey: fs.readFileSync('./id_rsa'),
    localDir: './node_modules',
    remoteDir: '/root/test/blablabla'
}, { exclude: ['*!ssh2-sftp-client'], dryRun: false, forceUpload: true })
    .sync();