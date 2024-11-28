const { lstat, opendir } = require('fs/promises');
const Client = require('ssh2-sftp-client');
const path = require('path');
const { minimatch } = require('minimatch');

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
        this.removeExtraFiles = [];

    }

    async sync() {
        await this.sftp.connect(this.config);
        console.log('connected to server');

        await this.listLocalFiles(this.config.localDir);
        console.log(`found ${this.localFiles.length} local files`);

        await this.listRemoteFiles(this.config.remoteDir);
        console.log(`found ${this.remoteFiles.length} remote files`);

        await this.upload();
        console.log('upload successfully');
        if (this.options.removeExtraFilesOnServer) await this.deleteExtraFilesOnServer();

        await this.sftp.end();
        console.log('disconnected from server');
    }

    async upload() {
        // upload files to remote
        for (const l of this.localFiles) {
            const r = this.remoteFiles.find(r => r.path === l.path.replace(/\\/g, '/'));
            const localFile = path.join(this.config.localDir, l.path);
            const remoteFile = path.posix.join(this.config.remoteDir, l.path.replace(/\\/g, '/'));
            if (this.options.forceUpload) {
                console.log(`${this.options.dryRun ? 'Dry-run: ' : ''} force upload -> ${l.path}`);
                // remove before upload
                if (r) {
                    if (r.isDirectory) {
                        console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}deleting folder -> ${remoteFile}`);
                        if (!this.options.dryRun) await this.sftp.rmdir(remoteFile, true);
                    } else {
                        console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}deleting file -> ${remoteFile}`);
                        if (!this.options.dryRun) await this.sftp.delete(remoteFile, true);
                    }
                }
                if (l.isDirectory) {
                    console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}creating folder -> ${remoteFile}`);
                    if (!this.options.dryRun) await this.sftp.mkdir(remoteFile, true);
                } else {
                    console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}uploading file -> ${remoteFile}`);
                    if (!this.options.dryRun) await this.sftp.put(localFile, remoteFile);
                }

            } else {
                if (r) {
                    if (r.isDirectory !== l.isDirectory) {
                        throw new Error(`remote has different file type and same name of ${r.path}, consider using 'forceUpload' to overwrite it.`);
                    } else if (!r.isDirectory) {
                        if (r.size !== l.size) {
                            console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}replace different -> ${l.path}`);
                            if (!this.options.dryRun) await this.sftp.put(localFile, remoteFile);
                        } else if (r.mtime < l.mtime) {
                            console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}replace newer -> ${l.path}`);
                            if (!this.options.dryRun) await this.sftp.put(localFile, remoteFile);
                        } else {
                            console.log(`server has same file: ${localFile}, skipping upload.`);
                        }
                    }
                } else if (!l.isDirectory) {
                    console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}creating file -> ${remoteFile}`);
                    if (!this.options.dryRun) {
                        await this.sftp.mkdir(path.dirname(remoteFile), true);
                        await this.sftp.put(localFile, remoteFile);
                    }
                } else {
                    console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}creating folder -> ${remoteFile}`);
                    if (!this.options.dryRun) await this.sftp.mkdir(remoteFile, true);
                }
            }
        }
    }


    async listLocalFiles(localPath) {
        const stats = await lstat(localPath);
        if (stats.isDirectory()) {
            const dir = await opendir(localPath);
            for await (const file of dir) {
                const filePath = path.join(localPath, file.name);
                const relativePath = this.getRelativePath(filePath, false);
                if (this.isIgnoreFile(relativePath)) {
                    console.log(`ignored local -> ${relativePath}`);
                    continue;
                }
                if (file.isDirectory()) {
                    this.localFiles.push({ path: relativePath, isDirectory: true });
                    // recursion
                    await this.listLocalFiles(filePath);
                } else {
                    const fileState = await lstat(filePath);
                    this.localFiles.push({ path: relativePath, size: fileState.size, mtime: fileState.mtimeMs });
                }
            }
        } else {
            this.localFiles.push({ path: this.getRelativePath(localPath, false), size: stats.size, mtime: stats.mtimeMs });
        }
    }

    async listRemoteFiles(remotePath) {
        let fileInfo = await this.sftp.exists(remotePath);
        if (!fileInfo) {
            console.log(`remote folder not exist -> ${remotePath}`);
            return;
        }
        if (fileInfo === 'd') {
            const filesOnServer = await this.sftp.list(remotePath);
            for (const file of filesOnServer) {
                const filePath = path.posix.join(remotePath, file.name);
                const relativePath = this.getRelativePath(filePath, true);

                if (this.isIgnoreFile(`${relativePath}${file.type === 'd' ? '/' : ''}`)) {
                    console.log(`ignoring remote ${relativePath}`);
                    continue;
                }

                if (this.options.removeExtraFilesOnServer) {
                    const localFile = this.localFiles.find(l => relativePath === l.path.replace(/\\/g, '/'));
                    if (!localFile) {
                        console.log(`found extra remote file -> ${filePath}`);
                        this.removeExtraFiles.push({ filePath, isDirectory: file.type === 'd' });
                    }
                }

                if (file.type === 'd') {
                    // recursion
                    this.remoteFiles.push({ path: relativePath, isDirectory: true });
                    await this.listRemoteFiles(filePath);
                } else {
                    this.remoteFiles.push({ path: relativePath, size: file.size, mtime: file.modifyTime });
                }
            }
        } else {
            this.remoteFiles.push({ path: this.getRelativePath(remotePath, true), size: stats.size, mtime: stats.modifyTime });
        }
    }


    async deleteExtraFilesOnServer() {
        for (const file of this.removeExtraFiles) {
            console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}removing extra ${file.isDirectory ? 'folder' : 'file'} '${file.filePath}' on remote.`);
            if (!this.options.dryRun) file.isDirectory ? await this.sftp.rmdir(file.filePath, true) : await this.sftp.delete(file.filePath);
        }
    }

    async removeExtraFilesOnServer(remotePath, isDirectory) {
        const exist = this.localFiles.some(l => l.path === remotePath);
        if (exist) return false;
        console.log(`${this.options.dryRun ? 'Dry-run: ' : ''}removing extra ${isDirectory ? 'folder' : 'file'} '${remotePath}' on remote.`);
        const remoteFile = path.posix.join(this.config.remoteDir, remotePath);
        if (!this.options.dryRun) isDirectory ? await this.sftp.rmdir(remoteFile, true) : await this.sftp.delete(remoteFile);
        return true;
    }

    getRelativePath(file, isRemote) {
        const dirPath = isRemote ? path.posix.resolve(this.config.remoteDir) : path.posix.resolve(this.config.localDir);
        const filePath = isRemote ? path.posix.resolve(file) : path.posix.resolve(file);
        return dirPath === filePath ? filePath : filePath.replace(`${dirPath}/`, '');
    }

    isIgnoreFile(path) {
        return this.options.exclude.some(pattern => minimatch(path, pattern));
    }
}

module.exports = { Deployer };