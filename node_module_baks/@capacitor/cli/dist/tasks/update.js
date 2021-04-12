"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const update_1 = require("../android/update");
const update_2 = require("../ios/update");
const promise_1 = require("../util/promise");
const common_1 = require("../common");
const chalk_1 = require("chalk");
async function updateCommand(config, selectedPlatformName, deployment) {
    if (selectedPlatformName && !config.isValidPlatform(selectedPlatformName)) {
        const platformFolder = common_1.resolvePlatform(config, selectedPlatformName);
        if (platformFolder) {
            const result = await common_1.runPlatformHook(`cd "${platformFolder}" && ${await common_1.hasYarn(config) ? 'yarn' : 'npm'} run capacitor:update`);
            common_1.log(result);
        }
        else {
            common_1.logError(`platform ${selectedPlatformName} not found`);
        }
    }
    else {
        const then = +new Date;
        const platforms = config.selectPlatforms(selectedPlatformName);
        if (platforms.length === 0) {
            common_1.logInfo(`There are no platforms to update yet. Create one with "capacitor create".`);
            return;
        }
        try {
            await common_1.check(config, [common_1.checkPackage, ...updateChecks(config, platforms)]);
            await promise_1.allSerial(platforms.map(platformName => async () => await update(config, platformName, deployment)));
            const now = +new Date;
            const diff = (now - then) / 1000;
            common_1.log(`Update finished in ${diff}s`);
        }
        catch (e) {
            common_1.logFatal(e);
        }
    }
}
exports.updateCommand = updateCommand;
function updateChecks(config, platforms) {
    const checks = [];
    for (let platformName of platforms) {
        if (platformName === config.ios.name) {
            checks.push(...update_2.updateIOSChecks);
        }
        else if (platformName === config.android.name) {
            return [];
        }
        else if (platformName === config.web.name) {
            return [];
        }
        else if (platformName === config.electron.name) {
            common_1.electronWarning();
            return [];
        }
        else {
            throw `Platform ${platformName} is not valid.`;
        }
    }
    return checks;
}
exports.updateChecks = updateChecks;
async function update(config, platformName, deployment) {
    await common_1.runTask(chalk_1.default `{green {bold update}} {bold ${platformName}}`, async () => {
        if (platformName === config.ios.name) {
            await update_2.updateIOS(config, deployment);
        }
        else if (platformName === config.android.name) {
            await update_1.updateAndroid(config);
        }
    });
}
exports.update = update;
