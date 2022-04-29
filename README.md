# sftp-upload-action

this is a github action script for upload files to server via SFTP protocol.

it using [sftp-sync-deploy](https://www.npmjs.com/package/sftp-sync-deploy)

## Inputs

```
  host: 'example.com',       // Required.
  port: 22,                  // Optional, Default to 22.
  username: 'user',          // Required.
  password: 'password',      // Optional.
  privateKey: '',            // Optional.
  passphrase: '',            // Optional.
  agent: '',                 // Optional, path to the ssh-agent socket.
  localDir: 'dist',          // Required, Absolute or relative to cwd.
  remoteDir: '/path/to/dest' // Required, Absolute path only.
  dryRun: false              // Optional. Default to false.
  excludeMode: 'remove'      // Optional, Behavior for excluded files ('remove' or 'ignore'), Default to 'remove'.
  forceUpload: false         // Optional, Force uploading all files, Default to false(upload only newer files).
```

## Example usage

```yml

```

## useful link

<https://www.npmjs.com/package/sftp-sync-deploy>

<https://github.com/dobbydog/sftp-sync-deploy>