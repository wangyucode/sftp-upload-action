const { Deployer } = require('./lib/deployer');
const fs = require('fs');
const { default: minimatch } = require('minimatch');

new Deployer({
    host: '192.168.0.99',
    privateKey: fs.readFileSync('./id'),
    compress: true,
    localDir: './test',
    remoteDir: '/root/test/'
}, {
    exclude: ['folder4', '**/file3'],
    dryRun: false,
    removeExtraFilesOnServer: true,
}).sync();
// console.log(minimatch('/aaa/folder4/'.replace(/^\//,""), 'aaa/folder4/'))
