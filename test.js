const { Deployer } = require('./lib/deployer');
const fs = require('fs');
const { default: minimatch } = require('minimatch');

new Deployer({
    host: 'wycode.cn',
    privateKey: fs.readFileSync('./id').toString(),
    compress: true,
    localDir: './test',
    remoteDir: '/tmp/test/',
    username: 'ubuntu'
}, {
    exclude: ['folder4', '**/file3',  '**/not-remove/'],
    dryRun: false,
    removeExtraFilesOnServer: true,
    forceUpload: false,
}).sync();
// console.log(minimatch('/aaa/folder4/'.replace(/^\//,""), 'aaa/folder4/'))
