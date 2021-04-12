"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const fs_1 = require("../util/fs");
const promise_1 = require("../util/promise");
const copy_1 = require("../web/copy");
const copy_2 = require("../electron/copy");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const cordova_1 = require("../cordova");
const chalk_1 = require("chalk");
async function copyCommand(config, selectedPlatformName) {
    if (selectedPlatformName && !config.isValidPlatform(selectedPlatformName)) {
        const platformFolder = common_1.resolvePlatform(config, selectedPlatformName);
        if (platformFolder) {
            const result = await common_1.runPlatformHook(`cd "${platformFolder}" && ${await common_1.hasYarn(config) ? 'yarn' : 'npm'} run capacitor:copy`);
            common_1.log(result);
        }
        else {
            common_1.logError(`platform ${selectedPlatformName} not found`);
        }
    }
    else {
        const platforms = config.selectPlatforms(selectedPlatformName);
        if (platforms.length === 0) {
            common_1.logInfo(`There are no platforms to copy yet. Create one with \`capacitor create\`.`);
            return;
        }
        try {
            await promise_1.allSerial(platforms.map(platformName => () => copy(config, platformName)));
        }
        catch (e) {
            common_1.logError(e);
        }
    }
}
exports.copyCommand = copyCommand;
async function copy(config, platformName) {
    await common_1.runTask(chalk_1.default `{green {bold copy}}`, async () => {
        const result = await common_1.checkWebDir(config);
        if (result) {
            throw result;
        }
        if (platformName === config.ios.name) {
            await copyWebDir(config, config.ios.webDirAbs);
            await copyNativeBridge(config, config.ios.webDirAbs);
            await copyCapacitorConfig(config, path_1.join(config.ios.platformDir, config.ios.nativeProjectName, config.ios.nativeProjectName));
            const cordovaPlugins = await cordova_1.getCordovaPlugins(config, platformName);
            await cordova_1.handleCordovaPluginsJS(cordovaPlugins, config, platformName);
        }
        else if (platformName === config.android.name) {
            await copyWebDir(config, config.android.webDirAbs);
            await copyNativeBridge(config, config.android.webDirAbs);
            await copyCapacitorConfig(config, path_1.join(config.android.platformDir, 'app/src/main/assets'));
            const cordovaPlugins = await cordova_1.getCordovaPlugins(config, platformName);
            await cordova_1.handleCordovaPluginsJS(cordovaPlugins, config, platformName);
            await cordova_1.writeCordovaAndroidManifest(cordovaPlugins, config, platformName);
        }
        else if (platformName === config.web.name) {
            await copy_1.copyWeb(config);
        }
        else if (platformName === config.electron.name) {
            await copy_2.copyElectron(config);
            await copyCapacitorConfig(config, config.electron.platformDir);
            common_1.electronWarning();
        }
        else {
            throw `Platform ${platformName} is not valid.`;
        }
    });
}
exports.copy = copy;
async function copyNativeBridge(config, nativeAbsDir) {
    let bridgePath = common_1.resolveNode(config, '@capacitor/core', 'native-bridge.js');
    if (!bridgePath) {
        common_1.logFatal(`Unable to find node_modules/@capacitor/core/native-bridge.js. Are you sure`, '@capacitor/core is installed? This file is required for Capacitor to function');
        return;
    }
    await common_1.runTask('Copying native bridge', async () => {
        return fs_extra_1.copy(bridgePath, path_1.join(nativeAbsDir, 'native-bridge.js'));
    });
}
async function copyCapacitorConfig(config, nativeAbsDir) {
    const configPath = path_1.resolve(config.app.extConfigFilePath);
    if (!await fs_1.existsAsync(configPath)) {
        return;
    }
    await common_1.runTask('Copying capacitor.config.json', async () => {
        return fs_extra_1.copy(configPath, path_1.join(nativeAbsDir, 'capacitor.config.json'));
    });
}
async function copyWebDir(config, nativeAbsDir) {
    var chalk = require('chalk');
    const webAbsDir = config.app.webDirAbs;
    const webRelDir = path_1.basename(webAbsDir);
    const nativeRelDir = path_1.relative(config.app.rootDir, nativeAbsDir);
    await common_1.runTask(`Copying web assets from ${chalk.bold(webRelDir)} to ${chalk.bold(nativeRelDir)}`, async () => {
        await fs_extra_1.remove(nativeAbsDir);
        return fs_extra_1.copy(webAbsDir, nativeAbsDir);
    });
}
