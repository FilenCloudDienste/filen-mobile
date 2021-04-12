"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const copy_1 = require("./copy");
const common_1 = require("../common");
const fs_1 = require("../util/fs");
const emoji_1 = require("../util/emoji");
const term_1 = require("../util/term");
const inquirer = require("inquirer");
const chalk_1 = require("chalk");
async function createCommand(config, dir, name, id, client) {
    try {
        if (!term_1.checkInteractive(dir, name, id)) {
            return;
        }
        // Get app name
        const appName = await common_1.getName(config, name);
        // Get app identifier
        const appId = await common_1.getAppId(config, id);
        // Prompt for app name if not provided
        const appDir = await getDir(config, dir);
        // Get npm client
        const npmClient = await common_1.getNpmClient(config, client);
        await common_1.check(config, [
            (config) => common_1.checkAppDir(config, dir),
            (config) => common_1.checkAppId(config, appId),
            (config) => common_1.checkAppName(config, appName),
            (config) => common_1.checkNpmClient(config, npmClient)
        ]);
        const cliVersion = require('../../package.json').version;
        common_1.log(chalk_1.default `\n{bold ${emoji_1.emoji('⚡️', '*')}   Welcome to Capacitor (CLI v${cliVersion}) ${emoji_1.emoji('⚡️', '*')}}\n`);
        // Create the directory
        await makeDirectory(config, appDir);
        // Set current working directory for config
        config.setCurrentWorkingDir(appDir);
        // Set some default settings
        config.app.appName = appName;
        config.app.appId = appId;
        config.app.bundledWebRuntime = true;
        config.cli.npmClient = npmClient;
        await common_1.getOrCreateConfig(config);
        // Copy the starter project
        await create(config, appDir, appName, appId);
        // npm install
        await common_1.runTask(chalk_1.default `Installing dependencies`, () => {
            return common_1.installDeps(appDir, ['@capacitor/cli', '@capacitor/core'], config);
        });
        // Copy web and capacitor to web assets
        await copy_1.copy(config, config.web.name);
        // Say something nice
        common_1.printNextSteps(config, appDir);
    }
    catch (e) {
        // String errors are our check errors (most likely)
        if (typeof e === 'string') {
            common_1.log('Usage: npx @capacitor/cli create appDir appName appId npmClient?');
            common_1.log('Example: npx @capacitor/cli create my-app "My App" "com.example.myapp"');
        }
        common_1.logFatal(e);
    }
}
exports.createCommand = createCommand;
async function getDir(config, dir) {
    if (!dir) {
        const answers = await inquirer.prompt([{
                type: 'input',
                name: 'dir',
                message: `Directory for new app`,
                validate: function (input) {
                    if (!input || input.trim() === '') {
                        return false;
                    }
                    return true;
                }
            }]);
        return answers.dir;
    }
    return dir;
}
async function makeDirectory(config, dir) {
    if (await fs_1.existsAsync(dir)) {
        common_1.logFatal(`The directory ${chalk_1.default.bold(dir)} already exists. Please remove it before creating your app`);
    }
    await fs_1.mkdirAsync(dir);
}
async function create(config, dir, appName, appId) {
    const templateDir = config.app.assets.templateDir;
    await common_1.runTask(chalk_1.default `Creating app {bold ${appName}} in {bold ${dir}} with id {bold ${appId}}`, () => {
        return fs_1.copyAsync(templateDir, dir);
    });
}
exports.create = create;
