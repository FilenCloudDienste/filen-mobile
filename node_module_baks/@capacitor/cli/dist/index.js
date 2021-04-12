"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const chalk_1 = require("chalk");
const create_1 = require("./tasks/create");
const init_1 = require("./tasks/init");
const copy_1 = require("./tasks/copy");
const list_1 = require("./tasks/list");
const update_1 = require("./tasks/update");
const open_1 = require("./tasks/open");
const serve_1 = require("./tasks/serve");
const sync_1 = require("./tasks/sync");
const config_1 = require("./config");
const add_1 = require("./tasks/add");
const new_plugin_1 = require("./tasks/new-plugin");
const doctor_1 = require("./tasks/doctor");
const emoji_1 = require("./util/emoji");
process.on('unhandledRejection', error => {
    const chalk = require('chalk');
    console.error(chalk.red('[fatal]'), error);
});
function run(process, cliBinDir) {
    const config = new config_1.Config(process.platform, process.cwd(), cliBinDir);
    program
        .version(config.cli.package.version);
    program
        .command('create [directory] [name] [id]')
        .description('Creates a new Capacitor project')
        .option('--npm-client [npmClient]', 'Optional: npm client to use for dependency installation')
        .action((directory, name, id, { npmClient }) => {
        return create_1.createCommand(config, directory, name, id, npmClient);
    });
    program
        .command('init [appName] [appId]')
        .description('Initializes a new Capacitor project in the current directory')
        .option('--web-dir [value]', 'Optional: Directory of your projects built web assets', config.app.webDir ? config.app.webDir : 'www')
        .option('--npm-client [npmClient]', 'Optional: npm client to use for dependency installation')
        .action((appName, appId, { webDir, npmClient }) => {
        return init_1.initCommand(config, appName, appId, webDir, npmClient);
    });
    program
        .command('serve')
        .description('Serves a Capacitor Progressive Web App in the browser')
        .action(() => {
        return serve_1.serveCommand(config);
    });
    program
        .command('sync [platform]')
        .description('copy + update')
        .option('--deployment', 'Optional: if provided, Podfile.lock won\'t be deleted and pod install will use --deployment option')
        .action((platform, { deployment }) => {
        return sync_1.syncCommand(config, platform, deployment);
    });
    program
        .command('update [platform]')
        .description(`updates the native plugins and dependencies based in package.json`)
        .option('--deployment', 'Optional: if provided, Podfile.lock won\'t be deleted and pod install will use --deployment option')
        .action((platform, { deployment }) => {
        return update_1.updateCommand(config, platform, deployment);
    });
    program
        .command('copy [platform]')
        .description('copies the web app build into the native app')
        .action(platform => {
        return copy_1.copyCommand(config, platform);
    });
    program
        .command('open [platform]')
        .description('opens the native project workspace (xcode for iOS)')
        .action(platform => {
        return open_1.openCommand(config, platform);
    });
    program
        .command('add [platform]')
        .description('add a native platform project')
        .action((platform) => {
        return add_1.addCommand(config, platform);
    });
    program
        .command('ls [platform]')
        .description('list installed Cordova and Capacitor plugins')
        .action(platform => {
        return list_1.listCommand(config, platform);
    });
    program
        .command('doctor [platform]')
        .description('checks the current setup for common errors')
        .action(platform => {
        return doctor_1.doctorCommand(config, platform);
    });
    program
        .command('plugin:generate')
        .description('start a new Capacitor plugin')
        .action(() => {
        return new_plugin_1.newPluginCommand(config);
    });
    program
        .arguments('<command>')
        .action((cmd) => {
        program.outputHelp();
        console.log(`  ` + chalk_1.default.red(`\n  Unknown command ${chalk_1.default.yellow(cmd)}.`));
        console.log();
    });
    program.parse(process.argv);
    if (program.rawArgs.length < 3) {
        console.log(`\n  ${emoji_1.emoji('⚡️', '--')}  ${chalk_1.default.bold('Capacitor - Cross-Platform apps with JavaScript and the Web')}  ${emoji_1.emoji('⚡️', '--')}`);
        program.help();
    }
}
exports.run = run;
