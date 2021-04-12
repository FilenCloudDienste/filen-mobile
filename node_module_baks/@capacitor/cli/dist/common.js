"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const timers_1 = require("timers");
const path_1 = require("path");
const fs_1 = require("./util/fs");
const fs_2 = require("fs");
const emoji_1 = require("./util/emoji");
const term_1 = require("./util/term");
const semver = require("semver");
const inquirer = require("inquirer");
const chalk = require('chalk');
async function check(config, checks) {
    const results = await Promise.all(checks.map(f => f(config)));
    const errors = results.filter(r => r != null);
    if (errors.length > 0) {
        throw errors.join('\n');
    }
}
exports.check = check;
async function checkWebDir(config) {
    const invalidFolders = ['', '.', '..', '../', './'];
    if (invalidFolders.includes(config.app.webDir)) {
        return `"${config.app.webDir}" is not a valid value for webDir`;
    }
    if (!await fs_1.existsAsync(config.app.webDirAbs)) {
        return `Capacitor could not find the web assets directory "${config.app.webDirAbs}".
    Please create it and make sure it has an index.html file. You can change
    the path of this directory in capacitor.config.json (webDir option).
    You may need to compile the web assets for your app (typically 'npm run build').
    More info: https://capacitorjs.com/docs/basics/building-your-app`;
    }
    if (!await fs_1.existsAsync(path_1.join(config.app.webDirAbs, 'index.html'))) {
        return `The web directory (${config.app.webDirAbs}) must contain a "index.html".
    It will be the entry point for the web portion of the Capacitor app.`;
    }
    return null;
}
exports.checkWebDir = checkWebDir;
async function checkPackage(_config) {
    if (!await fs_1.existsAsync('package.json')) {
        return `Capacitor needs to run at the root of an npm package.
    Make sure you have a "package.json" in the directory where you run capacitor.
    More info: https://docs.npmjs.com/cli/init`;
    }
    return null;
}
exports.checkPackage = checkPackage;
async function checkAppConfig(config) {
    if (!config.app.appId) {
        return 'Missing appId for new platform. Please add it in capacitor.config.json or run npx cap init.';
    }
    if (!config.app.appName) {
        return 'Missing appName for new platform. Please add it in capacitor.config.json or run npx cap init.';
    }
    const appIdError = await checkAppId(config, config.app.appId);
    if (appIdError) {
        return appIdError;
    }
    const appNameError = await checkAppName(config, config.app.appName);
    if (appNameError) {
        return appNameError;
    }
    const npmClientError = await checkNpmClient(config, config.cli.npmClient);
    if (npmClientError) {
        return npmClientError;
    }
    return null;
}
exports.checkAppConfig = checkAppConfig;
async function checkAppDir(config, dir) {
    if (!/^\S*$/.test(dir)) {
        return `Your app directory should not contain spaces`;
    }
    return null;
}
exports.checkAppDir = checkAppDir;
async function checkAppId(config, id) {
    if (!id) {
        return `Invalid App ID. Must be in Java package form with no dashes (ex: com.example.app)`;
    }
    if (/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(id.toLowerCase())) {
        return null;
    }
    return `Invalid App ID "${id}". Must be in Java package form with no dashes (ex: com.example.app)`;
}
exports.checkAppId = checkAppId;
async function checkAppName(config, name) {
    // We allow pretty much anything right now, have fun
    if (!name || !name.length) {
        return `Must provide an app name. For example: 'Spacebook'`;
    }
    return null;
}
exports.checkAppName = checkAppName;
async function checkNpmClient(config, client) {
    // npm client must be npm, yarn, or undefined
    if (client && client !== 'npm' && client !== 'yarn') {
        return `npm client must be "npm" or "yarn". If you are not sure, choose "npm"`;
    }
    return null;
}
exports.checkNpmClient = checkNpmClient;
async function readJSON(path) {
    const data = await fs_1.readFileAsync(path, 'utf8');
    return JSON.parse(data);
}
exports.readJSON = readJSON;
function writePrettyJSON(path, data) {
    return fs_1.writeFileAsync(path, JSON.stringify(data, null, '  ') + '\n');
}
exports.writePrettyJSON = writePrettyJSON;
function readXML(path) {
    return new Promise((resolve, reject) => {
        fs_2.readFile(path, 'utf8', async (err, xmlStr) => {
            if (err) {
                reject(`Unable to read: ${path}`);
            }
            else {
                const xml2js = await Promise.resolve().then(() => require('xml2js'));
                xml2js.parseString(xmlStr, (err, result) => {
                    if (err) {
                        reject(`Error parsing: ${path}, ${err}`);
                    }
                    else {
                        resolve(result);
                    }
                });
            }
        });
    });
}
exports.readXML = readXML;
function parseXML(xmlStr) {
    const parseString = require('xml2js').parseString;
    var xmlObj;
    parseString(xmlStr, (err, result) => {
        if (!err) {
            xmlObj = result;
        }
    });
    return xmlObj;
}
exports.parseXML = parseXML;
function writeXML(object) {
    return new Promise(async (resolve, reject) => {
        const xml2js = await Promise.resolve().then(() => require('xml2js'));
        const builder = new xml2js.Builder({ headless: true, explicitRoot: false, rootName: 'deleteme' });
        let xml = builder.buildObject(object);
        xml = xml.replace('<deleteme>', '').replace('</deleteme>', '');
        resolve(xml);
    });
}
exports.writeXML = writeXML;
function buildXmlElement(configElement, rootName) {
    const xml2js = require('xml2js');
    const builder = new xml2js.Builder({ headless: true, explicitRoot: false, rootName: rootName });
    return builder.buildObject(configElement);
}
exports.buildXmlElement = buildXmlElement;
/**
 * Check for or create our main configuration file.
 * @param config
 */
async function getOrCreateConfig(config) {
    const configPath = path_1.join(config.app.rootDir, config.app.extConfigName);
    if (await fs_1.existsAsync(configPath)) {
        return configPath;
    }
    await writePrettyJSON(config.app.extConfigFilePath, {
        appId: config.app.appId,
        appName: config.app.appName,
        bundledWebRuntime: config.app.bundledWebRuntime,
        npmClient: config.cli.npmClient,
        webDir: path_1.basename(path_1.resolve(config.app.rootDir, config.app.webDir)),
        plugins: {
            SplashScreen: {
                launchShowDuration: 0
            }
        }
    });
    // Store our newly created or found external config as the default
    config.loadExternalConfig();
}
exports.getOrCreateConfig = getOrCreateConfig;
async function mergeConfig(config, settings) {
    const configPath = path_1.join(config.app.rootDir, config.app.extConfigName);
    await writePrettyJSON(config.app.extConfigFilePath, Object.assign(Object.assign({}, config.app.extConfig), settings));
    // Store our newly created or found external config as the default
    config.loadExternalConfig();
}
exports.mergeConfig = mergeConfig;
function log(...args) {
    console.log(...args);
}
exports.log = log;
function logSuccess(...args) {
    const chalk = require('chalk');
    console.log(chalk.green('[success]'), ...args);
}
exports.logSuccess = logSuccess;
function logInfo(...args) {
    const chalk = require('chalk');
    console.log(chalk.bold.cyan('[info]'), ...args);
}
exports.logInfo = logInfo;
function logWarn(...args) {
    const chalk = require('chalk');
    console.log(chalk.bold.yellow('[warn]'), ...args);
}
exports.logWarn = logWarn;
function logError(...args) {
    const chalk = require('chalk');
    console.error(chalk.red('[error]'), ...args);
}
exports.logError = logError;
function logFatal(...args) {
    logError(...args);
    return process.exit(1);
}
exports.logFatal = logFatal;
async function isInstalled(command) {
    const which = await Promise.resolve().then(() => require('which'));
    return new Promise((resolve) => {
        which(command, (err) => {
            if (err) {
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
}
exports.isInstalled = isInstalled;
function wait(time) {
    return new Promise((resolve) => timers_1.setTimeout(resolve, time));
}
exports.wait = wait;
function runPlatformHook(command) {
    return new Promise((resolve, reject) => {
        const cmd = child_process_1.spawn(command, {
            stdio: 'inherit',
            shell: true
        });
        cmd.on('close', (code) => {
            resolve('');
        });
        cmd.on('error', (err) => {
            reject(err);
        });
    });
}
exports.runPlatformHook = runPlatformHook;
function runCommand(command) {
    return new Promise((resolve, reject) => {
        child_process_1.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(stdout + stderr);
            }
            else {
                resolve(stdout);
            }
        });
    });
}
exports.runCommand = runCommand;
async function runTask(title, fn) {
    const ora = require('ora');
    const spinner = ora(title).start();
    try {
        const start = process.hrtime();
        let taskInfoMessage;
        const value = await fn((message) => taskInfoMessage = message);
        const elapsed = process.hrtime(start);
        const chalk = require('chalk');
        if (taskInfoMessage) {
            spinner.info(`${title} ${chalk.dim('– ' + taskInfoMessage)}`);
        }
        else {
            spinner.succeed(`${title} ${chalk.dim('in ' + formatHrTime(elapsed))}`);
        }
        return value;
    }
    catch (e) {
        spinner.fail(`${title}: ${e.message ? e.message : ''}`);
        spinner.stop();
        throw e;
    }
}
exports.runTask = runTask;
const TIME_UNITS = ['s', 'ms', 'μp'];
function formatHrTime(hrtime) {
    let time = (hrtime[0] + (hrtime[1] / 1e9));
    let index = 0;
    for (; index < TIME_UNITS.length - 1; index++, time *= 1000) {
        if (time >= 1) {
            break;
        }
    }
    return time.toFixed(2) + TIME_UNITS[index];
}
exports.formatHrTime = formatHrTime;
async function getName(config, name) {
    if (!name) {
        const answers = await inquirer.prompt([{
                type: 'input',
                name: 'name',
                default: config.app.appName ? config.app.appName : config.app.package && config.app.package.name ? config.app.package.name : 'App',
                message: `App name`
            }]);
        return answers.name;
    }
    return name;
}
exports.getName = getName;
async function getAppId(config, id) {
    if (!id) {
        const answers = await inquirer.prompt([{
                type: 'input',
                name: 'id',
                default: config.app.appId ? config.app.appId : 'com.example.app',
                message: 'App Package ID (in Java package format, no dashes)'
            }]);
        return answers.id;
    }
    return id;
}
exports.getAppId = getAppId;
function getNpmClient(config, npmClient) {
    return new Promise(async (resolve) => {
        if (!npmClient) {
            if (await exports.hasYarn(config))
                return resolve('yarn');
            child_process_1.exec('yarn --version', async (err, stdout) => {
                // Don't show prompt if yarn is not installed
                if (err || !term_1.isInteractive()) {
                    resolve('npm');
                }
                else {
                    const answers = await inquirer.prompt([{
                            type: 'list',
                            name: 'npmClient',
                            message: 'Which npm client would you like to use?',
                            choices: ['npm', 'yarn']
                        }]);
                    resolve(answers.npmClient);
                }
            });
        }
        else {
            resolve(npmClient);
        }
    });
}
exports.getNpmClient = getNpmClient;
async function copyTemplate(src, dst) {
    await fs_1.copyAsync(src, dst);
    await renameGitignore(dst);
}
exports.copyTemplate = copyTemplate;
async function renameGitignore(dst) {
    // npm renames .gitignore to something else, so our templates
    // have .gitignore as gitignore, we need to rename it here.
    const gitignorePath = path_1.join(dst, 'gitignore');
    if (await fs_1.existsAsync(gitignorePath)) {
        await fs_1.renameAsync(gitignorePath, path_1.join(dst, '.gitignore'));
    }
}
exports.renameGitignore = renameGitignore;
async function printNextSteps(config, appDir) {
    log('\n');
    log(`${chalk.bold(`${emoji_1.emoji('🎉', '*')}   Your Capacitor project is ready to go!  ${emoji_1.emoji('🎉', '*')}`)}\n`);
    if (appDir !== '') {
        log(`Next steps:`);
        log('');
        log(chalk `cd {bold ./${appDir}}`);
        log('');
    }
    log(`Add platforms using "npx cap add":\n`);
    log(`  npx cap add android`);
    log(`  npx cap add ios`);
    log(`  npx cap add electron`);
    log('');
    log(`Follow the Developer Workflow guide to get building:\n${chalk.bold(`https://capacitorjs.com/docs/basics/workflow`)}\n`);
}
exports.printNextSteps = printNextSteps;
async function getCoreVersion(config) {
    const corePackagePath = resolveNode(config, '@capacitor/core', 'package.json');
    if (!corePackagePath) {
        logFatal('Unable to find node_modules/@capacitor/core/package.json. Are you sure', '@capacitor/core is installed? This file is currently required for Capacitor to function.');
    }
    return (await readJSON(corePackagePath)).version;
}
exports.getCoreVersion = getCoreVersion;
async function getCLIVersion(config) {
    const cliPackagePath = resolveNode(config, '@capacitor/cli', 'package.json');
    if (!cliPackagePath) {
        logFatal('Unable to find node_modules/@capacitor/cli/package.json. Are you sure', '@capacitor/cli is installed? This file is currently required for Capacitor to function.');
    }
    return (await readJSON(cliPackagePath)).version;
}
exports.getCLIVersion = getCLIVersion;
async function getPlatformVersion(config, platform) {
    const platformPackagePath = resolveNode(config, `@capacitor/${platform}`, 'package.json');
    if (!platformPackagePath) {
        logFatal(`Unable to find node_modules/@capacitor/${platform}/package.json. Are you sure`, `@capacitor/${platform} is installed? This file is currently required for Capacitor to function.`);
    }
    return (await readJSON(platformPackagePath)).version;
}
exports.getPlatformVersion = getPlatformVersion;
async function checkPlatformVersions(config, platform) {
    const coreVersion = await getCoreVersion(config);
    const platformVersion = await getPlatformVersion(config, platform);
    if (semver.diff(coreVersion, platformVersion) === 'minor' || semver.diff(coreVersion, platformVersion) === 'major') {
        log('\n');
        logWarn(`Your @capacitor/core version doesn't match your @capacitor/${platform} version`);
        log(`Consider updating to matching version ${chalk `{bold npm install @capacitor/core@${platformVersion}}`}`);
    }
}
exports.checkPlatformVersions = checkPlatformVersions;
function resolvePlatform(config, platform) {
    if (platform[0] !== '@') {
        const core = resolveNode(config, `@capacitor/${platform}`);
        if (core) {
            return core;
        }
        const community = resolveNode(config, `@capacitor-community/${platform}`);
        if (community) {
            return community;
        }
    }
    // third-party
    return resolveNode(config, platform);
}
exports.resolvePlatform = resolvePlatform;
function resolveNode(config, ...pathSegments) {
    const id = pathSegments[0];
    const path = pathSegments.slice(1);
    let modulePath;
    const starts = [config.app.rootDir];
    for (let start of starts) {
        modulePath = resolveNodeFrom(start, id);
        if (modulePath) {
            break;
        }
    }
    if (!modulePath) {
        return null;
    }
    return path_1.join(modulePath, ...path);
}
exports.resolveNode = resolveNode;
function resolveNodeFrom(start, id) {
    const rootPath = path_1.parse(start).root;
    let basePath = path_1.resolve(start);
    let modulePath;
    while (true) {
        modulePath = path_1.join(basePath, 'node_modules', id);
        if (fs_2.existsSync(modulePath)) {
            return modulePath;
        }
        if (basePath === rootPath) {
            return null;
        }
        basePath = path_1.dirname(basePath);
    }
}
exports.resolveNodeFrom = resolveNodeFrom;
// Does the current project use yarn?
exports.hasYarn = async (config, projectDir) => {
    // npmClient in config
    const npmClient = config.cli.npmClient;
    if (npmClient === 'yarn') {
        return true;
    }
    else if (npmClient === 'npm') {
        return false;
    }
    // yarn.lock
    return fs_2.existsSync(path_1.join(projectDir || process.cwd(), 'yarn.lock'));
};
// Install deps with NPM or Yarn
async function installDeps(projectDir, deps, config) {
    return runCommand(`cd "${projectDir}" && ${await exports.hasYarn(config, projectDir) ? 'yarn add' : 'npm install --save'} ${deps.join(' ')}`);
}
exports.installDeps = installDeps;
async function checkNPMVersion() {
    const minVersion = '5.5.0';
    const version = await runCommand('npm -v');
    const semver = await Promise.resolve().then(() => require('semver'));
    if (semver.gt(minVersion, version)) {
        return `Capacitor CLI requires at least NPM ${minVersion}`;
    }
    return null;
}
exports.checkNPMVersion = checkNPMVersion;
function electronWarning() {
    logWarn(`The electron platform is deprecated!`);
    log(`\nPlease use the Capacitor Community Electron Platform: https://github.com/capacitor-community/electron\n`);
}
exports.electronWarning = electronWarning;
