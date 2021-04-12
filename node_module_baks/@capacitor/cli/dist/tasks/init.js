"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const cordova_1 = require("../cordova");
const term_1 = require("../util/term");
const chalk = require('chalk');
async function initCommand(config, name, id, webDir, client) {
    if (webDir === '') {
        webDir = 'www';
    }
    try {
        if (!term_1.checkInteractive(name, id)) {
            return;
        }
        // Get app name
        const appName = await common_1.getName(config, name);
        // Get app identifier
        const appId = await common_1.getAppId(config, id);
        // Get npm client
        const npmClient = await common_1.getNpmClient(config, client);
        await common_1.check(config, [
            (config) => common_1.checkAppName(config, appName),
            (config) => common_1.checkAppId(config, appId),
            (config) => common_1.checkNpmClient(config, npmClient)
        ]);
        const cordova = await cordova_1.getCordovaPreferences(config);
        await common_1.runTask(`Initializing Capacitor project in ${chalk.blue(config.app.rootDir)}`, async () => {
            config.app.appId = appId;
            config.app.appName = appName;
            config.app.webDir = webDir;
            config.cli.npmClient = npmClient;
            // Get or create our config
            await common_1.getOrCreateConfig(config);
            await common_1.mergeConfig(config, {
                appId,
                appName,
                webDir,
                npmClient,
                cordova
            });
        });
        await common_1.printNextSteps(config, '');
    }
    catch (e) {
        common_1.log('Usage: npx cap init appName appId\n');
        common_1.log('Example: npx cap init "My App" "com.example.myapp"\n');
        common_1.logFatal(e);
    }
}
exports.initCommand = initCommand;
