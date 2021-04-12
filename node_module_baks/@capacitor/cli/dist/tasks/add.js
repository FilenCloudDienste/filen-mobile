"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const definitions_1 = require("../definitions");
const add_1 = require("../android/add");
const add_2 = require("../electron/add");
const add_3 = require("../ios/add");
const common_1 = require("../android/common");
const common_2 = require("../ios/common");
const common_3 = require("../common");
const sync_1 = require("./sync");
const chalk_1 = require("chalk");
const path_1 = require("path");
async function addCommand(config, selectedPlatformName) {
    if (selectedPlatformName && !config.isValidPlatform(selectedPlatformName)) {
        const platformFolder = common_3.resolvePlatform(config, selectedPlatformName);
        if (platformFolder) {
            const result = await common_3.runPlatformHook(`cd "${platformFolder}" && ${await common_3.hasYarn(config) ? 'yarn' : 'npm'} run capacitor:add`);
            common_3.log(result);
        }
        else {
            common_3.logError(`platform ${selectedPlatformName} not found`);
        }
    }
    else {
        const platformName = await config.askPlatform(selectedPlatformName, `Please choose a platform to add:`);
        if (platformName === config.web.name) {
            webWarning();
            return;
        }
        else if (platformName === config.electron.name) {
            common_3.electronWarning();
        }
        const existingPlatformDir = config.platformDirExists(platformName);
        if (existingPlatformDir) {
            common_3.logFatal(`"${platformName}" platform already exists.
      To add a new "${platformName}" platform, please remove "${existingPlatformDir}" and run this command again.
      WARNING! your native IDE project will be completely removed.`);
        }
        try {
            await common_3.check(config, [common_3.checkPackage, common_3.checkAppConfig, ...addChecks(config, platformName)]);
            await generateCapacitorConfig(config);
            await common_3.check(config, [common_3.checkWebDir]);
            await doAdd(config, platformName);
            await editPlatforms(config, platformName);
            if (shouldSync(config, platformName)) {
                await sync_1.sync(config, platformName, false);
            }
            if (platformName === config.ios.name || platformName === config.android.name) {
                common_3.log(chalk_1.default `\nNow you can run {green {bold npx cap open ${platformName}}} to launch ${platformName === config.ios.name ? 'Xcode' : 'Android Studio'}`);
            }
        }
        catch (e) {
            common_3.logFatal(e);
        }
    }
}
exports.addCommand = addCommand;
async function generateCapacitorConfig(config) {
    if (config.foundExternalConfig()) {
        return;
    }
    const inquirer = await Promise.resolve().then(() => require('inquirer'));
    const answers = await inquirer.prompt([{
            type: 'input',
            name: 'webDir',
            message: 'What directory are your web assets in? (index.html, built JavaScript, etc.):',
            default: 'www'
        }]);
    const webDir = answers.webDir;
    await common_3.runTask(`Creating ${config.app.extConfigName}`, () => {
        return common_3.writePrettyJSON(config.app.extConfigFilePath, {
            webDir: webDir
        });
    });
    common_3.logInfo(`💡 You can change the web directory anytime by modifing ${config.app.extConfigName}`);
    config.app.webDir = webDir;
    config.app.webDirAbs = path_1.resolve(config.app.rootDir, webDir);
}
exports.generateCapacitorConfig = generateCapacitorConfig;
function addChecks(config, platformName) {
    if (platformName === config.ios.name) {
        return add_3.addIOSChecks;
    }
    else if (platformName === config.android.name) {
        return [];
    }
    else if (platformName === config.web.name) {
        return [];
    }
    else if (platformName === config.electron.name) {
        return [];
    }
    else {
        throw `Platform ${platformName} is not valid.`;
    }
}
exports.addChecks = addChecks;
async function doAdd(config, platformName) {
    await common_3.runTask(chalk_1.default `{green {bold add}}`, async () => {
        if (platformName === config.ios.name) {
            await add_3.addIOS(config);
        }
        else if (platformName === config.android.name) {
            await add_1.addAndroid(config);
        }
        else if (platformName === config.electron.name) {
            await add_2.addElectron(config);
        }
    });
}
exports.doAdd = doAdd;
async function editPlatforms(config, platformName) {
    if (platformName === config.ios.name) {
        await common_2.editProjectSettingsIOS(config);
    }
    else if (platformName === config.android.name) {
        await common_1.editProjectSettingsAndroid(config);
    }
}
function shouldSync(config, platformName) {
    // Don't sync if we're adding the iOS platform not on a mac
    if (config.cli.os !== definitions_1.OS.Mac && platformName === 'ios') {
        return false;
    }
    return true;
}
function webWarning() {
    common_3.logError(`Not adding platform ${chalk_1.default.bold('web')}`);
    common_3.log(`\nIn Capacitor, the 'web' platform is just your web app!`);
    common_3.log(`For example, if you have a React or Angular project, the 'web' platform is that project.`);
    common_3.log(`To add Capacitor functionality to your web app, follow the Web Getting Started Guide: https://capacitorjs.com/docs/web`);
}
