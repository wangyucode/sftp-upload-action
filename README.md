# sftp-upload-action

this is a github action script for upload files to server via SFTP protocol.

![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/wangyucode/sftp-upload-action)
![release](https://flat.badgen.net/github/release/wangyucode/sftp-upload-action)
![dependabot](https://flat.badgen.net/github/dependabot/wangyucode/sftp-upload-action)

## Inputs

```
  host: 'example.com',                  # Required.
  port: 22,                             # Optional, Default to 22.
  username: 'user',                     # Required.
  password: 'password',                 # Optional.
  privateKey: '',                       # Optional, your private key(Raw content or key path).
  passphrase: '',                       # Optional.
  agent: '',                            # Optional, path to the ssh-agent socket.
  compress: false,                      # Optional, compress for ssh connection. Default to false.
  localDir: 'dist',                     # Required, Absolute or relative to cwd.
  remoteDir: '/path/to/dest'            # Required, Absolute path only.
  dryRun: false                         # Optional. Default to false.
  exclude: 'node_modules/,**/*.spec.ts' # Optional. exclude patterns (glob) like .gitignore, use ',' to split, Default to ''.
  forceUpload: false                    # Optional, Force uploading all files, Default to false(upload only newer files).
  removeExtraFilesOnServer: false       # Optional, Remove extra files on server. Default to false.
```

## Example usage

### Use password

```yml
- name: SFTP uploader
  uses: wangyucode/sftp-upload-action@v2.0.1
  with:
    host: 'wycode.cn'
    password: ${{ secrets.password }} 
    localDir: 'dist'
    remoteDir: '/data/nginx/www/wycode.cn/'
```

### Use privateKey

```yml
- name: SFTP uploader
  uses: wangyucode/sftp-upload-action@v2.0.1
  with:
    host: 'wycode.cn'
    privateKey: ${{ secrets.key }} 
    localDir: 'dist'
    remoteDir: '/data/nginx/www/wycode.cn/'
```

### Example for a complete github action file

```yml
name: Upload complete repo (e.g. website) to a SFTP destination

on: [push]

jobs:
  Upload-to-SFTP:
    runs-on: ubuntu-latest
    steps:
      - name: 🚚 Get latest code                     # Checkout the latest code
        uses: actions/checkout@v2

      - name: 📂 SFTP uploader                       # Upload to SFTP 
        uses: wangyucode/sftp-upload-action@v2.0.1
        with:
          host: ${{ secrets.HOST }}                  # Recommended to put the credentials in github secrets.
          username: ${{ secrets.USER }}
          password: ${{ secrets.PASSWORD }}
          compress: true                             # Compression
          forceUpload: true                          # Optional, Force uploading all files, Default to false(upload only newer files).
          localDir: '.'                              # Required, Absolute or relative to cwd.
          remoteDir: '/'                             # Required, Absolute path only.
          exclude: '.git*,.DS_Store'                 # Optional. exclude patterns (glob) like .gitignore, use ',' to split, Default to ''.
´´´
## Upload newer files

the action will check `modifyTime` and upload the newer files if `forceUpload` is false.
but you should restore the modified time before uploading.
here is an action that can change the modified time: https://github.com/marketplace/actions/git-restore-mtime

