"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const common_1 = require("../common");
const fs_1 = require("../util/fs");
const path_1 = require("path");
async function openElectron(config) {
    const dir = config.electron.platformDir;
    common_1.logInfo(`Opening Electron project at ${dir}`);
    if (!await fs_1.existsAsync(path_1.resolve(config.app.rootDir, dir))) {
        throw new Error('Electron project does not exist. Create one with "npx cap add electron"');
    }
    return new Promise(async (resolve, reject) => {
        child_process_1.exec(`npm run electron:start`, { cwd: dir }, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
exports.openElectron = openElectron;
