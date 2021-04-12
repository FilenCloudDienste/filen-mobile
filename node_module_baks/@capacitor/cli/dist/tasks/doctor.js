"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const doctor_1 = require("../android/doctor");
const doctor_2 = require("../electron/doctor");
const doctor_3 = require("../ios/doctor");
const emoji_1 = require("../util/emoji");
const path_1 = require("path");
const chalk_1 = require("chalk");
async function doctorCommand(config, selectedPlatform) {
    common_1.log(`${emoji_1.emoji('💊', '')}   ${chalk_1.default.bold('Capacitor Doctor')}  ${emoji_1.emoji('💊', '')} \n`);
    await doctorCore(config);
    const platforms = config.selectPlatforms(selectedPlatform);
    await Promise.all(platforms.map(platformName => {
        return doctor(config, platformName);
    }));
}
exports.doctorCommand = doctorCommand;
async function doctorCore(config) {
    let cliVersion = await common_1.runCommand(`npm info @capacitor/cli version`);
    let coreVersion = await common_1.runCommand(`npm info @capacitor/core version`);
    let androidVersion = await common_1.runCommand(`npm info @capacitor/android version`);
    let electronVersion = await common_1.runCommand(`npm info @capacitor/android version`);
    let iosVersion = await common_1.runCommand(`npm info @capacitor/ios version`);
    common_1.log(`${chalk_1.default.bold.blue('Latest Dependencies:')}\n`);
    common_1.log(`  ${chalk_1.default.bold('@capacitor/cli:')}`, cliVersion.trim());
    common_1.log(`  ${chalk_1.default.bold('@capacitor/core:')}`, coreVersion.trim());
    common_1.log(`  ${chalk_1.default.bold('@capacitor/android:')}`, androidVersion.trim());
    common_1.log(`  ${chalk_1.default.bold('@capacitor/electron:')}`, electronVersion.trim());
    common_1.log(`  ${chalk_1.default.bold('@capacitor/ios:')}`, iosVersion.trim());
    common_1.log('');
    common_1.log(`${chalk_1.default.bold.blue('Installed Dependencies:')}\n`);
    await printInstalledPackages(config);
    common_1.log('');
}
exports.doctorCore = doctorCore;
async function printInstalledPackages(config) {
    const packageNames = ['@capacitor/cli', '@capacitor/core', '@capacitor/android', '@capacitor/ios'];
    await Promise.all(packageNames.map(async (packageName) => {
        const packagePath = common_1.resolveNode(config, packageName, 'package.json');
        await printPackageVersion(packageName, packagePath);
    }));
    const packagePath = common_1.resolveNodeFrom(config.electron.platformDir, '@capacitor/electron');
    await printPackageVersion('@capacitor/electron', packagePath ? path_1.join(packagePath, 'package.json') : packagePath);
}
async function printPackageVersion(packageName, packagePath) {
    let version;
    if (packagePath) {
        version = (await common_1.readJSON(packagePath)).version;
    }
    common_1.log(`  ${chalk_1.default.bold(packageName)}`, version || 'not installed');
}
async function doctor(config, platformName) {
    if (platformName === config.ios.name) {
        await doctor_3.doctorIOS(config);
    }
    else if (platformName === config.android.name) {
        await doctor_1.doctorAndroid(config);
    }
    else if (platformName === config.electron.name) {
        await doctor_2.doctorElectron(config);
        common_1.electronWarning();
    }
    else if (platformName === config.web.name) {
        return Promise.resolve();
    }
    else {
        throw `Platform ${platformName} is not valid.`;
    }
}
exports.doctor = doctor;
