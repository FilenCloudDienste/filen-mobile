"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const fs_1 = require("../util/fs");
const path_1 = require("path");
async function doctorElectron(config) {
    try {
        await common_1.check(config, [
            common_1.checkWebDir,
            common_1.checkNPMVersion,
            checkAppSrcDirs,
            checkElectronInstall
        ]);
        common_1.logSuccess('electron looking great! 👌');
    }
    catch (e) {
        common_1.logFatal(e);
    }
}
exports.doctorElectron = doctorElectron;
async function checkAppSrcDirs(config) {
    const appDir = path_1.join(config.electron.platformDir, 'app');
    if (!await fs_1.existsAsync(appDir)) {
        return `"app" directory is missing in: ${config.electron.platformDir}`;
    }
    const appIndexHtml = path_1.join(appDir, 'index.html');
    if (!await fs_1.existsAsync(appIndexHtml)) {
        return `"index.html" directory is missing in: ${appDir}`;
    }
    return checkElectronIndexFile(config, config.electron.platformDir);
}
async function checkElectronIndexFile(config, electronDir) {
    const indexFileName = 'index.js';
    const indexFilePath = path_1.join(electronDir, indexFileName);
    if (!await fs_1.existsAsync(indexFilePath)) {
        return `"${indexFilePath}" is missing in: ${electronDir}`;
    }
    return null;
}
async function checkElectronInstall(config) {
    if (common_1.resolveNodeFrom(config.electron.platformDir, 'electron')) {
        return null;
    }
    else {
        return 'electron not installed';
    }
}
