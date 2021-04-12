"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const path_1 = require("path");
const fs_1 = require("../util/fs");
async function copyElectron(config) {
    const chalk = require('chalk');
    const webAbsDir = config.app.webDirAbs;
    const webRelDir = path_1.basename(webAbsDir);
    const nativeRelDir = path_1.relative(config.app.rootDir, config.electron.webDirAbs);
    return await common_1.runTask(`Copying web assets from ${chalk.bold(webRelDir)} to ${chalk.bold(nativeRelDir)}`, async () => {
        await fs_1.removeAsync(config.electron.webDirAbs);
        return common_1.copyTemplate(webAbsDir, config.electron.webDirAbs);
    });
}
exports.copyElectron = copyElectron;
