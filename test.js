import Deployer from "./lib/deployer.js";
import fs from "fs";

new Deployer({
    host: '192.168.0.99',
    privateKey: fs.readFileSync('./id_rsa'),
    localDir: './',
    remoteDir: '/root/test'
}, {exclude: ['.git','*rsa', 'node_modules'], dryRun: false, forceUpload: true})
    .sync();