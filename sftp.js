const { deploy } = require('@wangyucode/sftp-sync-deploy');
const core = require('@actions/core');

let config = {
  host: core.getInput('host'), // Required.
  port: core.getInput('port'), // Optional, Default to 22.
  username: core.getInput('username'), // Required.
  password: core.getInput('password'), // Optional.
  privateKey: core.getInput('privateKey'), // Optional.
  passphrase: core.getInput('passphrase'), // Optional.
  agent: core.getInput('agent'),   // Optional, path to the ssh-agent socket.
  localDir: core.getInput('localDir'), // Required, Absolute or relative to cwd.
  remoteDir: core.getInput('remoteDir') // Required, Absolute path only.
};

let options = {
  dryRun: JSON.parse(core.getInput('dryRun')), // Enable dry-run mode. Default to false
  exclude: core.getInput('exclude'), // exclude patterns (glob)
  excludeMode: core.getInput('excludeMode'), // Behavior for excluded files ('remove' or 'ignore'), Default to 'remove'.
  forceUpload: JSON.parse(core.getInput('forceUpload')) // Force uploading all files, Default to false(upload only newer files).
};

console.log('config->', config, options);

deploy(config, options)
  .then(() => {
    console.log('sftp upload success!');
  })
  .catch(err => {
    console.error('sftp upload error! ', err);
    core.setFailed(err.message)
  });
