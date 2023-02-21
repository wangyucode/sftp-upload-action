const { lstat, opendir } = require('fs/promises');
const Client = require('ssh2-sftp-client');
const path = require('path');
const { default: minimatch } = require('minimatch');

class Deployer {

    constructor(config, options) {
        this.config = {
            username: 'root',
            port: 22,
            ...config
        };
        this.options = {
            dryRun: false,
            exclude: [],
            ...options
        };
        if (this.options.dryRun) console.warn('dryRun option is enabled! no files will be changed.');
        this.sftp = new Client();
        this.localFiles = [];
        this.remoteFiles = [];

    }

    async sync() {
        await this.readLocalFiles(this.config.localDir);

        console.log(`found ${this.localFiles.length} local files`);

        await this.sftp.connect(this.config).catch(console.error);
        await this.readRemoteFiles(this.config.remoteDir);

        console.log(`found ${this.remoteFiles.length} remote files`);

        await this.upload();
        await this.sftp.end();
    }

    async upload() {
        // upload files to remote
        for (const l of this.localFiles) {
            if (this.isIgnoreFile(`${l.path}${l.isDirectory ? '/' : ''}`)) {
                console.log(`ignoring local ${l.path}`);
                continue;
            }
            const r = this.remoteFiles.find(r => r.path === l.path);
            const localFile = path.posix.join(this.config.localDir, l.path);
            const remoteFile = path.posix.join(this.config.remoteDir, l.path);
            if (this.options.forceUpload) {
                console.log(`${this.options.dryRun ? 'Dry-run: ' : ''} force upload -> ${l.path}`);
                if (!this.options.dryRun) {
                    // remove before upload
                    if (r) {
                        if (r.isDirectory) {
                            await this.sftp.rmdir(remoteFile, true);
                        } else {
                            await this.sftp.delete(remoteFile, true);
                        }
                    }
                    await this.sftp.put(localFile, remoteFile);
                }
            } else {
                if (r) {
                    if (r.isDirectory !== l.isDirectory) {
                        throw new Error(`remote has different file type and same name of ${r.path}, consider using 'forceUpload' to overwrite it.`);
                    } else if (!r.isDirectory) {
                        if (r.size !== l.size) {
                            console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}uploading different -> ${l.path}`);
                            if (!this.options.dryRun) await this.sftp.put(localFile, remoteFile);
                        } else if (r.mtime < l.mtime) {
                            console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}uploading newer -> ${l.path}`);
                            if (!this.options.dryRun) await this.sftp.put(localFile, remoteFile);
                        } else {
                            console.log(`server has same file: ${localFile}, skipping upload.`);
                        }
                    }
                } else {
                    console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}uploading: ${l.path}`);
                    if (!this.options.dryRun) await this.sftp.put(localFile, remoteFile);
                }
            }
        }
    }


    async readLocalFiles(localPath) {
        const stats = await lstat(localPath);
        if (stats.isDirectory()) {
            const dir = await opendir(localPath);
            for await (const file of dir) {
                const filePath = path.join(localPath, file.name);
                if (file.isDirectory()) {
                    console.log(`reading local folder -> ${filePath}`);
                    this.localFiles.push({ path: this.getRelativePath(filePath, this.config.localDir), isDirectory: true });
                    // recursion
                    await this.readLocalFiles(filePath);
                } else {
                    console.log(`reading local file -> ${filePath}`);
                    const fileState = await lstat(filePath);
                    this.localFiles.push({ path: this.getRelativePath(filePath, this.config.localDir), size: fileState.size, mtime: fileState.mtimeMs });
                }
            }
        } else {
            console.log(`reading local file -> ${localPath}`);
            this.localFiles.push({ path: this.getRelativePath(localPath, this.config.localDir), size: stats.size, mtime: stats.mtimeMs });
        }
    }

    async readRemoteFiles(remotePath) {
        const stats = await this.sftp.stat(remotePath);
        if (stats.isDirectory) {
            const filesOnServer = await this.sftp.list(remotePath);
            for (const file of filesOnServer) {
                const filePath = path.posix.join(remotePath, file.name);
                const relativePath = this.getRelativePath(filePath, this.config.remoteDir);
                let removed = false;
                // remove extra files on remote side
                if (this.options.removeExtraFilesOnServer) {
                    removed = await this.removeExtraFilesOnServer(relativePath, file.type === 'd');
                }
                if (file.type === 'd') {
                    // recursion
                    if (!removed) {
                        console.log(`reading remote folder -> ${filePath}`);
                        this.remoteFiles.push({ path: relativePath, isDirectory: true });
                        await this.readRemoteFiles(filePath);
                    }
                } else {
                    if (!removed) {
                        console.log(`reading remote file -> ${filePath}`);
                        this.remoteFiles.push({ path: relativePath, size: file.size, mtime: file.modifyTime });
                    }
                }
            }
        } else {
            console.log(`reading remote file -> ${remotePath}`);
            this.remoteFiles.push({ path: this.getRelativePath(remotePath, this.config.remoteDir), size: stats.size, mtime: stats.modifyTime });
        }
    }

    async removeExtraFilesOnServer(remotePath, isDirectory) {
        const exist = this.localFiles.some(l => l.path === remotePath);
        if (exist) return false;
        if (this.isIgnoreFile(`${remotePath}${isDirectory ? '/' : ''}`)) {
            console.log(`ignoring remote ${remotePath}`);
            return false;
        }
        console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}removing extra ${isDirectory ? 'folder' : 'file'} '${remotePath}' on remote.`);
        const remoteFile = path.posix.join(this.config.remoteDir, remotePath);
        if (!this.options.dryRun) isDirectory ? await this.sftp.rmdir(remoteFile, true) : await this.sftp.delete(remoteFile);
        return true;
    }

    getRelativePath(file, dir) {
        const dirPath = path.resolve(dir);
        const filePath = path.resolve(file);
        return dirPath === filePath ? filePath : filePath.replace(dirPath, '');
    }

    isIgnoreFile(path) {
        return this.options.exclude.some(pattern => minimatch(path.replace(/^\//, ''), pattern));
    }
}

module.exports = { Deployer };