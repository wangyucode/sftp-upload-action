# sftp-upload-action

this is a github action script for upload files to server via SFTP protocol.

## Inputs

```
  host: 'example.com',       // Required.
  port: 22,                  // Optional, Default to 22.
  username: 'user',          // Required.
  password: 'password',      // Optional.
  privateKey: '',            // Optional, your private key(Raw content).
  passphrase: '',            // Optional.
  agent: '',                 // Optional, path to the ssh-agent socket.
  localDir: 'dist',          // Required, Absolute or relative to cwd.
  remoteDir: '/path/to/dest' // Required, Absolute path only.
  dryRun: false              // Optional. Default to false.
  excludeMode: 'remove'      // Optional, Behavior for excluded files ('remove' or 'ignore'), Default to 'remove'.
  forceUpload: false         // Optional, Force uploading all files, Default to false(upload only newer files).
```

## Example usage

### Use password
```yml
- name: SFTP uploader
  uses: wangyucode/sftp-upload-action@v1.3.2
  with:
    host: 'wycode.cn'
    password: ${{ secrets.password }} 
    localDir: 'dist'
    remoteDir: '/data/nginx/www/wycode.cn/'
    dryRun: true # use dryRun for test
```

### Use privateKey
```yml
- name: SFTP uploader
  uses: wangyucode/sftp-upload-action@v1.3.2
  with:
    host: 'wycode.cn'
    privateKey: ${{ secrets.key }} 
    localDir: 'dist'
    remoteDir: '/data/nginx/www/wycode.cn/'
    dryRun: true # use dryRun for test
```
