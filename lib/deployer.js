import { lstat, opendir } from 'fs/promises';
import Client from 'ssh2-sftp-client';
import path from 'path';
import M from 'minimatch';

export default class Deployer {

    constructor(config, options) {
        this.config = {
            username: 'root',
            port: 22,
            ...config
        };
        this.options = {
            dryRun: true,
            exclude: [],
            removeRedundant: false,
            ...options
        };
        this.sftp = new Client();
        this.promises = [];
    }

    async sync() {
        await this.sftp.connect(this.config);
        await this.syncDir(['']);
        await Promise.all(this.promises);
        await this.sftp.end();
    }

    async syncDir(relativePath) {
        let localPath = path.join(this.config.localDir, ...relativePath);
        let remotePath = path.posix.join(this.config.remoteDir, ...relativePath);
        const remoteStats = await this.sftp.exists(remotePath);
        if (remoteStats === '-' || remoteStats === 'l') {
            throw new Error(`remote has same name file as the directory: ${path.basename(remotePath)}`);
        } else if (remoteStats === false) {
            await this.sftp.mkdir(remotePath, true);
            console.log(`created directory: ${remotePath} on remote.`);
        }
        let localStats = await lstat(localPath);
        if (localStats.isDirectory()) {
            console.log(`checking dir: ${localPath}`);
            const dir = await opendir(localPath);
            for await (const dirent of dir) {
                const localFile = path.join(localPath, dirent.name);
                const remoteFile = path.posix.join(remotePath, dirent.name);
                if (this.isIgnoreFile(localFile)) {
                    console.log(`ignoring ${dirent.name}`);
                    continue;
                }
                if (dirent.isDirectory()) {
                    const dirExists = await this.sftp.exists(remoteFile);
                    if (dirExists === 'd') {
                        await this.syncDir(localFile.split(path.sep));
                    } else {
                        console.log(`${this.options.dryRun ? 'Dry-run: ': ''}uploading dir ${dirent.name}`);
                        if (!this.options.dryRun) {
                            this.promises.push(this.sftp.uploadDir(
                                path.join(localPath, dirent.name),
                                remoteFile,
                                { filter: (path, isDirectory) => this.isIgnoreFile(path) }
                            ));
                        }
                    }
                } else {
                   await this.uploadFile(localFile, remoteFile);
                }

            }
        } else {
            const remoteFile = path.posix.join(remotePath, path.basename(localPath));
            if (!this.isIgnoreFile(remoteFile)) await this.uploadFile(localPath, remoteFile);
        }
    }

    async uploadFile(localFile, remoteFile) {
        const remoteExists = await this.sftp.exists(remoteFile);
        if (this.options.forceUpload) {
            console.log(`${this.options.dryRun ? 'Dry-run: ': ''} force upload ${remoteFile}`);
            if (!this.options.dryRun) {
                if (remoteExists === 'd') {
                    await this.sftp.rmdir(remoteFile, true);
                } else {
                    await this.sftp.delete(remoteFile, true);
                }
                this.promises.push(this.sftp.put(localFile, remoteFile));
            };
        } else {
            if (remoteExists) {
                if (remoteExists === '-') {
                    console.log(`checking modified timestamp of ${remoteFile}`);
                    const localStats = await lstat(localFile);
                    const remoteStats = await this.sftp.stat(remoteFile);
                    if (remoteStats.modifyTime < localStats.mtimeMs) {
                        console.log(`${this.options.dryRun ? 'Dry-run: ': ''}uploading newer file: ${localFile}`);
                        if (!this.options.dryRun)  this.promises.push(this.sftp.put(localFile, remoteFile));
                    } else {
                        console.log(`server has newer file: ${localFile}, skipping upload.`);
                    }
                } else {
                    throw new Error(`remote has different file type and same name of ${remoteFile}, consider using forceUpload to overwrite it.`);
                }
            } else {
                console.log(`${this.options.dryRun ? 'Dry-run: ': ''}uploading file ${localFile}`);
                if (!this.options.dryRun)  this.promises.push(this.sftp.put(localFile, remoteFile));
            }
        }
    }

    isIgnoreFile(path) {
        return this.options.exclude.some(pattern => M(path, pattern));
    }
}