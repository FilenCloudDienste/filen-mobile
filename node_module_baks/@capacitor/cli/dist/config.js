"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const common_1 = require("./common");
const definitions_1 = require("./definitions");
let Package;
let ExtConfig;
class Config {
    constructor(os, currentWorkingDir, cliBinDir) {
        this.windows = {
            androidStudioPath: 'C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe'
        };
        this.linux = {
            androidStudioPath: '/usr/local/android-studio/bin/studio.sh'
        };
        this.electron = {
            name: 'electron',
            platformDir: '',
            webDir: 'app',
            webDirAbs: '',
            assets: {
                templateName: 'electron-template',
                templateDir: ''
            }
        };
        this.android = {
            name: 'android',
            minVersion: '21',
            platformDir: '',
            webDir: 'app/src/main/assets/public',
            webDirAbs: '',
            resDir: 'app/src/main/res',
            resDirAbs: '',
            assets: {
                templateName: 'android-template',
                pluginsFolderName: 'capacitor-cordova-android-plugins',
                templateDir: '',
                pluginsDir: '',
            }
        };
        this.ios = {
            name: 'ios',
            minVersion: '11.0',
            cordovaSwiftVersion: '5.0',
            platformDir: '',
            webDir: 'public',
            webDirAbs: '',
            nativeProjectName: 'App',
            assets: {
                templateName: 'ios-template',
                pluginsFolderName: 'capacitor-cordova-ios-plugins',
                templateDir: '',
                pluginsDir: '',
            }
        };
        this.web = {
            name: 'web'
        };
        this.cli = {
            binDir: '',
            rootDir: '',
            assetsName: 'assets',
            assetsDir: '',
            package: Package,
            os: definitions_1.OS.Unknown,
            npmClient: ''
        };
        this.app = {
            rootDir: '',
            appId: '',
            appName: '',
            webDir: 'www',
            webDirAbs: '',
            package: Package,
            windowsAndroidStudioPath: 'C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe',
            linuxAndroidStudioPath: '',
            extConfigName: 'capacitor.config.json',
            extConfigFilePath: '',
            extConfig: ExtConfig,
            bundledWebRuntime: false,
            plugins: {},
            assets: {
                templateName: 'app-template',
                templateDir: '',
                pluginsTemplateDir: ''
            },
            server: {
                cleartext: false
            }
        };
        this.plugins = {
            assets: {
                templateName: 'plugin-template',
                templateDir: ''
            }
        };
        this.platforms = [];
        this.initOS(os);
        this.initCliConfig(cliBinDir);
        this.setCurrentWorkingDir(currentWorkingDir);
    }
    initOS(os) {
        switch (os) {
            case 'darwin':
                this.cli.os = definitions_1.OS.Mac;
                break;
            case 'win32':
                this.cli.os = definitions_1.OS.Windows;
                break;
            case 'linux':
                this.cli.os = definitions_1.OS.Linux;
                break;
        }
    }
    setCurrentWorkingDir(currentWorkingDir) {
        try {
            this.initAppConfig(path_1.resolve(currentWorkingDir));
            this.initPluginsConfig();
            this.loadExternalConfig();
            this.mergeConfigData();
            // Post-merge
            this.initAndroidConfig();
            this.initElectronConfig();
            this.initIosConfig();
            this.initWindowsConfig();
            this.initLinuxConfig();
            this.platforms.push(this.web.name);
        }
        catch (e) {
            common_1.logFatal(`Unable to load config`, e);
        }
    }
    initCliConfig(cliBinDir) {
        this.cli.binDir = cliBinDir;
        this.cli.rootDir = path_1.join(cliBinDir, '../');
        this.cli.assetsDir = path_1.join(this.cli.rootDir, this.cli.assetsName);
        this.cli.package = loadPackageJson(this.cli.rootDir);
    }
    initAppConfig(currentWorkingDir) {
        this.app.rootDir = currentWorkingDir;
        this.app.package = loadPackageJson(currentWorkingDir);
        this.app.assets.templateDir = path_1.join(this.cli.assetsDir, this.app.assets.templateName);
    }
    async updateAppPackage() {
        this.app.package = await common_1.readJSON(path_1.resolve(this.app.rootDir, 'package.json'));
    }
    initElectronConfig() {
        this.platforms.push(this.electron.name);
        this.electron.platformDir = path_1.resolve(this.app.rootDir, this.electron.name);
        this.electron.assets.templateDir = path_1.resolve(this.cli.assetsDir, this.electron.assets.templateName);
        this.electron.webDirAbs = path_1.resolve(this.electron.platformDir, this.electron.webDir);
    }
    initAndroidConfig() {
        this.platforms.push(this.android.name);
        this.android.platformDir = path_1.resolve(this.app.rootDir, this.android.name);
        this.android.assets.templateDir = path_1.resolve(this.cli.assetsDir, this.android.assets.templateName);
        this.android.assets.pluginsDir = path_1.resolve(this.cli.assetsDir, this.android.assets.pluginsFolderName);
        this.android.webDirAbs = path_1.resolve(this.android.platformDir, this.android.webDir);
        this.android.resDirAbs = path_1.resolve(this.android.platformDir, this.android.resDir);
    }
    initIosConfig() {
        this.platforms.push(this.ios.name);
        this.ios.platformDir = path_1.resolve(this.app.rootDir, this.ios.name);
        this.ios.assets.templateDir = path_1.resolve(this.cli.assetsDir, this.ios.assets.templateName);
        this.ios.assets.pluginsDir = path_1.resolve(this.cli.assetsDir, this.ios.assets.pluginsFolderName);
        this.ios.webDirAbs = path_1.resolve(this.ios.platformDir, this.ios.nativeProjectName, this.ios.webDir);
        if (this.app.extConfig && this.app.extConfig.ios && this.app.extConfig.ios.cordovaSwiftVersion) {
            this.ios.cordovaSwiftVersion = this.app.extConfig.ios.cordovaSwiftVersion;
        }
        if (this.app.extConfig && this.app.extConfig.ios && this.app.extConfig.ios.minVersion) {
            this.ios.minVersion = this.app.extConfig.ios.minVersion;
        }
    }
    initWindowsConfig() {
        if (this.cli.os !== definitions_1.OS.Windows) {
            return;
        }
        this.windows.androidStudioPath = this.app.windowsAndroidStudioPath;
    }
    initLinuxConfig() {
        if (this.app.linuxAndroidStudioPath) {
            this.linux.androidStudioPath = this.app.linuxAndroidStudioPath;
        }
    }
    initPluginsConfig() {
        this.plugins.assets.templateDir = path_1.join(this.cli.assetsDir, this.plugins.assets.templateName);
    }
    mergeConfigData() {
        const extConfig = this.app.extConfig || {};
        Object.assign(this.app, extConfig);
        // Build the absolute path to the web directory
        this.app.webDirAbs = path_1.resolve(this.app.rootDir, this.app.webDir);
    }
    loadExternalConfig() {
        this.app.extConfigFilePath = path_1.join(this.app.rootDir, this.app.extConfigName);
        try {
            const extConfigStr = fs_1.readFileSync(this.app.extConfigFilePath, 'utf8');
            try {
                // we've got an capacitor.json file, let's parse it
                this.app.extConfig = JSON.parse(extConfigStr);
                this.cli.npmClient = this.app.extConfig.npmClient || '';
            }
            catch (e) {
                common_1.logFatal(`error parsing: ${path_1.basename(this.app.extConfigFilePath)}\n`, e);
            }
        }
        catch (_a) {
            // it's ok if there's no capacitor.json file
        }
    }
    foundExternalConfig() {
        return !!this.app.extConfig;
    }
    selectPlatforms(selectedPlatformName) {
        if (selectedPlatformName) {
            // already passed in a platform name
            const platformName = selectedPlatformName.toLowerCase().trim();
            if (!this.isValidPlatform(platformName)) {
                common_1.logFatal(`Invalid platform: ${platformName}`);
            }
            else if (!this.platformDirExists(platformName)) {
                this.platformNotCreatedError(platformName);
            }
            // return the platform in an string array
            return [platformName];
        }
        // wasn't given a platform name, so let's
        // get the platforms that have already been created
        return this.getExistingPlatforms();
    }
    async askPlatform(selectedPlatformName, promptMessage) {
        if (!selectedPlatformName) {
            const inquirer = await Promise.resolve().then(() => require('inquirer'));
            const answer = await inquirer.prompt({
                type: 'list',
                name: 'mode',
                message: promptMessage,
                choices: this.platforms
            });
            return answer.mode.toLowerCase().trim();
        }
        const platformName = selectedPlatformName.toLowerCase().trim();
        if (!this.isValidPlatform(platformName)) {
            common_1.logFatal(`Invalid platform: "${platformName}". Valid platforms include: ${this.platforms.join(', ')}`);
        }
        return platformName;
    }
    getExistingPlatforms() {
        const platforms = [];
        if (this.platformDirExists(this.android.name)) {
            platforms.push(this.android.name);
        }
        if (this.platformDirExists(this.ios.name)) {
            platforms.push(this.ios.name);
        }
        if (this.platformDirExists(this.electron.name)) {
            platforms.push(this.electron.name);
        }
        platforms.push(this.web.name);
        return platforms;
    }
    platformDirExists(platformName) {
        let platformDir = null;
        try {
            let testDir = path_1.join(this.app.rootDir, platformName);
            if (platformName === 'web') {
                testDir = this.app.webDirAbs;
            }
            fs_1.accessSync(testDir);
            platformDir = testDir;
        }
        catch (e) { }
        return platformDir;
    }
    isValidPlatform(platform) {
        return this.platforms.includes(platform);
    }
    platformNotCreatedError(platformName) {
        const chalk = require('chalk');
        if (platformName === 'web') {
            common_1.logFatal(`Could not find the web platform directory. Make sure ${chalk.bold(this.app.webDir)} exists.`);
        }
        common_1.logFatal(`${chalk.bold(platformName)}" platform has not been created. Use "npx cap add ${platformName}" to add the platform project.`);
    }
}
exports.Config = Config;
function loadPackageJson(dir) {
    let p = null;
    try {
        p = require(path_1.join(dir, 'package.json'));
    }
    catch (e) { }
    return p;
}
