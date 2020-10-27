# sftp-sync-deploy
Sync local files to remote using SFTP.

## Usage

### Javscript
```js
const { deploy } = require('sftp-sync-deploy');

let config = {
  host: 'example.com',            // Required.
  port: 22,                       // Optional, Default to 22.
  username: 'user',               // Required.
  password: 'password',           // Optional.
  privateKey: '/path/to/key.pem', // Optional.
  passphrase: 'passphrase',       // Optional.
  agent: '/path/to/agent.sock',   // Optional, path to the ssh-agent socket.
  localDir: 'dist',               // Required, Absolute or relative to cwd.
  remoteDir: '/path/to/dest'      // Required, Absolute path only.
};

let options = {
  dryRun: false,                  // Enable dry-run mode. Default to false
  exclude: [                      // exclude patterns (glob)
    'node_modules',
    'src/**/*.spec.ts'
  ],
  excludeMode: 'remove',          // Behavior for excluded files ('remove' or 'ignore'), Default to 'remove'.
  forceUpload: false              // Force uploading all files, Default to false(upload only newer files).
};

deploy(config, options).then(() => {
  console.log('success!');
}).catch(err => {
  console.error('error! ', err);
})
```

### TypeScript
```ts
import { deploy, SftpSyncConfig, SftpSyncOptions } from 'sftp-sync-deploy';

let config: SftpSyncConfig = {...};
let options: SftpSyncOptions = {...};

deploy(config, options);
```

## Dry run mode
```js
deploy(config, {dryRun: true});
```
Outputs the tasks to be done for each file in following format. Any changes of the files will not be performed.
```
[ (local file status) | (remote file status) ] (file path)
                                               -> (task)
```

### Output example
```
# Local is a file (upload the file)
[ F | F ] index.html
          -> upload

# Local is a directory (sync recursively)
[ D | D ] lib
          -> sync

# Excluded. (do nothing)
[ X |   ] node_modules
          -> ignore

# Remote exists and local doesn't (remove the remote file or directory)
[   | F ] index.html.bak
          -> remove remote

# Remote exists and local is excluded (operation depends on excludeMode option)
[ X | D ] .bin
          -> remove remote # if excludeMode is 'remove'
          -> ignore        # if excludeMode is 'ignore'

# Local and remote have the same name but different types (remove remote then upload local)
[ F | D ] test
          -> remove remote and upload

# Permission error on a remote server (ignored)
[ F | ! ] secret.txt
          -> denied
