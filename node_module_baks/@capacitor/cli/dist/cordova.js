"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_1 = require("./plugin");
const fs_1 = require("./util/fs");
const path_1 = require("path");
const common_1 = require("./common");
const fs_extra_1 = require("fs-extra");
const common_2 = require("./android/common");
const common_3 = require("./ios/common");
const copy_1 = require("./tasks/copy");
const inquirer = require("inquirer");
const plist = require('plist');
const chalk = require('chalk');
/**
 * Build the root cordova_plugins.js file referencing each Plugin JS file.
 */
function generateCordovaPluginsJSFile(config, plugins, platform) {
    let pluginModules = [];
    let pluginExports = [];
    plugins.map((p) => {
        const pluginId = p.xml.$.id;
        const jsModules = plugin_1.getJSModules(p, platform);
        jsModules.map((jsModule) => {
            let clobbers = [];
            let merges = [];
            let clobbersModule = '';
            let mergesModule = '';
            let runsModule = '';
            let clobberKey = '';
            let mergeKey = '';
            if (jsModule.clobbers) {
                jsModule.clobbers.map((clobber) => {
                    clobbers.push(clobber.$.target);
                    clobberKey = clobber.$.target;
                });
                clobbersModule = `,
        "clobbers": [
          "${clobbers.join('",\n          "')}"
        ]`;
            }
            if (jsModule.merges) {
                jsModule.merges.map((merge) => {
                    merges.push(merge.$.target);
                    mergeKey = merge.$.target;
                });
                mergesModule = `,
        "merges": [
          "${merges.join('",\n          "')}"
        ]`;
            }
            if (jsModule.runs) {
                runsModule = ',\n        "runs": true';
            }
            const pluginModule = {
                clobber: clobberKey,
                merge: mergeKey,
                // mimics Cordova's module name logic if the name attr is missing
                pluginContent: `{
          "id": "${pluginId + '.' + (jsModule.$.name || jsModule.$.src.match(/([^\/]+)\.js/)[1])}",
          "file": "plugins/${pluginId}/${jsModule.$.src}",
          "pluginId": "${pluginId}"${clobbersModule}${mergesModule}${runsModule}
        }`
            };
            pluginModules.push(pluginModule);
        });
        pluginExports.push(`"${pluginId}": "${p.xml.$.version}"`);
    });
    return `
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
      ${pluginModules
        .sort((a, b) => (a.clobber && b.clobber) // Clobbers in alpha order
        ? a.clobber.localeCompare(b.clobber)
        : ((a.clobber || b.clobber) // Clobbers before anything else
            ? b.clobber.localeCompare(a.clobber)
            : a.merge.localeCompare(b.merge) // Merges in alpha order
        ))
        .map(e => e.pluginContent)
        .join(',\n      ')}
    ];
    module.exports.metadata =
    // TOP OF METADATA
    {
      ${pluginExports.join(',\n      ')}
    };
    // BOTTOM OF METADATA
    });
    `;
}
exports.generateCordovaPluginsJSFile = generateCordovaPluginsJSFile;
/**
 * Build the plugins/* files for each Cordova plugin installed.
 */
async function copyPluginsJS(config, cordovaPlugins, platform) {
    const webDir = getWebDir(config, platform);
    const pluginsDir = path_1.join(webDir, 'plugins');
    const cordovaPluginsJSFile = path_1.join(webDir, 'cordova_plugins.js');
    removePluginFiles(config, platform);
    await Promise.all(cordovaPlugins.map(async (p) => {
        const pluginId = p.xml.$.id;
        const pluginDir = path_1.join(pluginsDir, pluginId, 'www');
        fs_1.ensureDirSync(pluginDir);
        const jsModules = plugin_1.getJSModules(p, platform);
        await Promise.all(jsModules.map(async (jsModule) => {
            const filePath = path_1.join(webDir, 'plugins', pluginId, jsModule.$.src);
            fs_1.copySync(path_1.join(p.rootPath, jsModule.$.src), filePath);
            let data = await fs_1.readFileAsync(filePath, 'utf8');
            data = data.trim();
            // mimics Cordova's module name logic if the name attr is missing
            const name = pluginId + '.' + (jsModule.$.name || path_1.basename(jsModule.$.src, path_1.extname(jsModule.$.src)));
            data = `cordova.define("${name}", function(require, exports, module) { \n${data}\n});`;
            data = data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, '');
            await fs_1.writeFileAsync(filePath, data, 'utf8');
        }));
        const assets = plugin_1.getAssets(p, platform);
        assets.map((asset) => {
            const filePath = path_1.join(webDir, asset.$.target);
            fs_1.copySync(path_1.join(p.rootPath, asset.$.src), filePath);
        });
    }));
    fs_1.writeFileAsync(cordovaPluginsJSFile, generateCordovaPluginsJSFile(config, cordovaPlugins, platform));
}
exports.copyPluginsJS = copyPluginsJS;
async function copyCordovaJS(config, platform) {
    const cordovaPath = common_1.resolveNode(config, '@capacitor/core', 'cordova.js');
    if (!cordovaPath) {
        common_1.logFatal(`Unable to find node_modules/@capacitor/core/cordova.js. Are you sure`, '@capacitor/core is installed? This file is currently required for Capacitor to function.');
        return;
    }
    return fs_extra_1.copy(cordovaPath, path_1.join(getWebDir(config, platform), 'cordova.js'));
}
exports.copyCordovaJS = copyCordovaJS;
async function createEmptyCordovaJS(config, platform) {
    await fs_1.writeFileAsync(path_1.join(getWebDir(config, platform), 'cordova.js'), '');
    await fs_1.writeFileAsync(path_1.join(getWebDir(config, platform), 'cordova_plugins.js'), '');
}
exports.createEmptyCordovaJS = createEmptyCordovaJS;
function removePluginFiles(config, platform) {
    const webDir = getWebDir(config, platform);
    const pluginsDir = path_1.join(webDir, 'plugins');
    const cordovaPluginsJSFile = path_1.join(webDir, 'cordova_plugins.js');
    fs_1.removeSync(pluginsDir);
    fs_1.removeSync(cordovaPluginsJSFile);
}
exports.removePluginFiles = removePluginFiles;
async function autoGenerateConfig(config, cordovaPlugins, platform) {
    let xmlDir = path_1.join(config.android.resDirAbs, 'xml');
    const fileName = 'config.xml';
    if (platform === 'ios') {
        xmlDir = path_1.join(config.ios.platformDir, config.ios.nativeProjectName, config.ios.nativeProjectName);
    }
    fs_1.ensureDirSync(xmlDir);
    const cordovaConfigXMLFile = path_1.join(xmlDir, fileName);
    fs_1.removeSync(cordovaConfigXMLFile);
    let pluginEntries = [];
    cordovaPlugins.map(p => {
        const currentPlatform = plugin_1.getPluginPlatform(p, platform);
        if (currentPlatform) {
            const configFiles = currentPlatform['config-file'];
            if (configFiles) {
                const configXMLEntries = configFiles.filter(function (item) { return item.$ && item.$.target.includes(fileName); });
                configXMLEntries.map((entry) => {
                    if (entry.feature) {
                        const feature = { feature: entry.feature };
                        pluginEntries.push(feature);
                    }
                });
            }
        }
    });
    const pluginEntriesString = await Promise.all(pluginEntries.map(async (item) => {
        const xmlString = await common_1.writeXML(item);
        return xmlString;
    }));
    let pluginPreferencesString = [];
    if (config.app.extConfig && config.app.extConfig.cordova && config.app.extConfig.cordova.preferences) {
        pluginPreferencesString = await Promise.all(Object.keys(config.app.extConfig.cordova.preferences).map(async (key) => {
            return `
  <preference name="${key}" value="${config.app.extConfig.cordova.preferences[key]}" />`;
        }));
    }
    const content = `<?xml version='1.0' encoding='utf-8'?>
<widget version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
  <access origin="*" />
  ${pluginEntriesString.join('')}
  ${pluginPreferencesString.join('')}
</widget>`;
    await fs_1.writeFileAsync(cordovaConfigXMLFile, content);
}
exports.autoGenerateConfig = autoGenerateConfig;
function getWebDir(config, platform) {
    if (platform === 'ios') {
        return config.ios.webDirAbs;
    }
    if (platform === 'android') {
        return config.android.webDirAbs;
    }
    return '';
}
async function handleCordovaPluginsJS(cordovaPlugins, config, platform) {
    if (!fs_extra_1.existsSync(getWebDir(config, platform))) {
        await copy_1.copy(config, platform);
    }
    if (cordovaPlugins.length > 0) {
        plugin_1.printPlugins(cordovaPlugins, platform, 'cordova');
        await copyCordovaJS(config, platform);
        await copyPluginsJS(config, cordovaPlugins, platform);
    }
    else {
        removePluginFiles(config, platform);
        await createEmptyCordovaJS(config, platform);
    }
    await autoGenerateConfig(config, cordovaPlugins, platform);
}
exports.handleCordovaPluginsJS = handleCordovaPluginsJS;
async function getCordovaPlugins(config, platform) {
    const allPlugins = await plugin_1.getPlugins(config);
    let plugins = [];
    if (platform === config.ios.name) {
        plugins = common_3.getIOSPlugins(allPlugins);
    }
    else if (platform === config.android.name) {
        plugins = common_2.getAndroidPlugins(allPlugins);
    }
    return plugins
        .filter(p => plugin_1.getPluginType(p, platform) === 1 /* Cordova */);
}
exports.getCordovaPlugins = getCordovaPlugins;
async function logCordovaManualSteps(cordovaPlugins, config, platform) {
    cordovaPlugins.map(p => {
        const editConfig = plugin_1.getPlatformElement(p, platform, 'edit-config');
        const configFile = plugin_1.getPlatformElement(p, platform, 'config-file');
        editConfig.concat(configFile).map(async (configElement) => {
            if (configElement.$ && !configElement.$.target.includes('config.xml')) {
                if (platform === config.ios.name) {
                    if (configElement.$.target.includes('Info.plist')) {
                        logiOSPlist(configElement, config, p);
                    }
                }
            }
        });
    });
}
exports.logCordovaManualSteps = logCordovaManualSteps;
async function logiOSPlist(configElement, config, plugin) {
    const plistPath = path_1.resolve(config.ios.platformDir, config.ios.nativeProjectName, config.ios.nativeProjectName, 'Info.plist');
    const xmlMeta = await common_1.readXML(plistPath);
    let data = await fs_1.readFileAsync(plistPath, 'utf8');
    var plistData = plist.parse(data);
    const dict = xmlMeta.plist.dict.pop();
    if (!dict.key.includes(configElement.$.parent)) {
        let xml = buildConfigFileXml(configElement);
        xml = `<key>${configElement.$.parent}</key>${getConfigFileTagContent(xml)}`;
        common_1.logWarn(`Plugin ${plugin.id} requires you to add \n  ${xml} to your Info.plist to work`);
    }
    else if (configElement.array || configElement.dict) {
        if (configElement.array && configElement.array[0] && configElement.array[0].string) {
            var xml = '';
            configElement.array[0].string.map((element) => {
                if (!plistData[configElement.$.parent].includes(element)) {
                    xml = xml.concat(`<string>${element}</string>\n`);
                }
            });
            if (xml.length > 0) {
                common_1.logWarn(`Plugin ${plugin.id} requires you to add \n${xml} in the existing ${chalk.bold(configElement.$.parent)} array of your Info.plist to work`);
            }
        }
        else {
            logPossibleMissingItem(configElement, plugin);
        }
    }
}
function logPossibleMissingItem(configElement, plugin) {
    let xml = buildConfigFileXml(configElement);
    xml = getConfigFileTagContent(xml);
    xml = removeOuterTags(xml);
    common_1.logWarn(`Plugin ${plugin.id} might require you to add ${xml} in the existing ${chalk.bold(configElement.$.parent)} entry of your Info.plist to work`);
}
function buildConfigFileXml(configElement) {
    return common_1.buildXmlElement(configElement, 'config-file');
}
function getConfigFileTagContent(str) {
    return str.replace(/\<config-file.+\"\>|\<\/config-file>/g, '');
}
function removeOuterTags(str) {
    var start = str.indexOf('>') + 1;
    var end = str.lastIndexOf('<');
    return str.substring(start, end);
}
async function checkAndInstallDependencies(config, plugins, platform) {
    let needsUpdate = false;
    const cordovaPlugins = plugins
        .filter(p => plugin_1.getPluginType(p, platform) === 1 /* Cordova */);
    const incompatible = plugins.filter(p => plugin_1.getPluginType(p, platform) === 2 /* Incompatible */);
    await Promise.all(cordovaPlugins.map(async (p) => {
        let allDependencies = [];
        allDependencies = allDependencies.concat(plugin_1.getPlatformElement(p, platform, 'dependency'));
        if (p.xml['dependency']) {
            allDependencies = allDependencies.concat(p.xml['dependency']);
        }
        allDependencies = allDependencies.filter((dep) => !getIncompatibleCordovaPlugins(platform).includes(dep.$.id) && incompatible.filter(p => p.id === dep.$.id || p.xml.$.id === dep.$.id).length === 0);
        if (allDependencies) {
            await Promise.all(allDependencies.map(async (dep) => {
                let plugin = dep.$.id;
                if (plugin.includes('@') && plugin.indexOf('@') !== 0) {
                    plugin = plugin.split('@')[0];
                }
                if (cordovaPlugins.filter(p => p.id === plugin || p.xml.$.id === plugin).length === 0) {
                    if (dep.$.url && dep.$.url.startsWith('http')) {
                        plugin = dep.$.url;
                    }
                    common_1.logInfo(`installing missing dependency plugin ${plugin}`);
                    try {
                        await common_1.installDeps(config.app.rootDir, [plugin], config);
                        await config.updateAppPackage();
                        needsUpdate = true;
                    }
                    catch (e) {
                        common_1.log('\n');
                        common_1.logError(`couldn't install dependency plugin ${plugin}`);
                    }
                }
            }));
        }
    }));
    return needsUpdate;
}
exports.checkAndInstallDependencies = checkAndInstallDependencies;
function getIncompatibleCordovaPlugins(platform) {
    let pluginList = ['cordova-plugin-splashscreen', 'cordova-plugin-ionic-webview', 'cordova-plugin-crosswalk-webview',
        'cordova-plugin-wkwebview-engine', 'cordova-plugin-console', 'cordova-plugin-music-controls',
        'cordova-plugin-add-swift-support', 'cordova-plugin-ionic-keyboard', 'cordova-plugin-braintree',
        '@ionic-enterprise/filesystem', '@ionic-enterprise/keyboard', '@ionic-enterprise/splashscreen', 'cordova-support-google-services'];
    if (platform === 'ios') {
        pluginList.push('cordova-plugin-statusbar', '@ionic-enterprise/statusbar');
    }
    if (platform === 'android') {
        pluginList.push('cordova-plugin-compat');
    }
    return pluginList;
}
exports.getIncompatibleCordovaPlugins = getIncompatibleCordovaPlugins;
async function getCordovaPreferences(config) {
    const configXml = path_1.join(config.app.rootDir, 'config.xml');
    let cordova = {};
    if (fs_extra_1.existsSync(configXml)) {
        cordova.preferences = {};
        const xmlMeta = await common_1.readXML(configXml);
        if (xmlMeta.widget.preference) {
            xmlMeta.widget.preference.map((pref) => {
                cordova.preferences[pref.$.name] = pref.$.value;
            });
        }
    }
    if (config.app.extConfig && config.app.extConfig.cordova && config.app.extConfig.cordova.preferences && cordova.preferences) {
        const answer = await inquirer.prompt({
            type: 'confirm',
            name: 'confirm',
            message: 'capacitor.config.json already contains cordova preferences. Overwrite with values from config.xml?'
        });
        if (!answer.confirm) {
            cordova = config.app.extConfig.cordova;
        }
    }
    if (config.app.extConfig && !cordova.preferences) {
        cordova = config.app.extConfig.cordova;
    }
    return cordova;
}
exports.getCordovaPreferences = getCordovaPreferences;
async function writeCordovaAndroidManifest(cordovaPlugins, config, platform) {
    var _a;
    const pluginsFolder = path_1.resolve(config.app.rootDir, 'android', config.android.assets.pluginsFolderName);
    const manifestPath = path_1.join(pluginsFolder, 'src', 'main', 'AndroidManifest.xml');
    let rootXMLEntries = [];
    let applicationXMLEntries = [];
    let applicationXMLAttributes = [];
    cordovaPlugins.map(async (p) => {
        const editConfig = plugin_1.getPlatformElement(p, platform, 'edit-config');
        const configFile = plugin_1.getPlatformElement(p, platform, 'config-file');
        editConfig.concat(configFile).map(async (configElement) => {
            if (configElement.$ && (configElement.$.target && configElement.$.target.includes('AndroidManifest.xml') || configElement.$.file && configElement.$.file.includes('AndroidManifest.xml'))) {
                const keys = Object.keys(configElement).filter(k => k !== '$');
                keys.map(k => {
                    configElement[k].map((e) => {
                        const xmlElement = common_1.buildXmlElement(e, k);
                        const pathParts = getPathParts(configElement.$.parent || configElement.$.target);
                        if (pathParts.length > 1) {
                            if (pathParts.pop() === 'application') {
                                if (configElement.$.mode && configElement.$.mode === 'merge' && xmlElement.startsWith('<application')) {
                                    Object.keys(e.$).map((ek) => {
                                        applicationXMLAttributes.push(`${ek}="${e.$[ek]}"`);
                                    });
                                }
                                else if (!applicationXMLEntries.includes(xmlElement) && !contains(applicationXMLEntries, xmlElement, k)) {
                                    applicationXMLEntries.push(xmlElement);
                                }
                            }
                            else {
                                common_1.logInfo(`plugin ${p.id} requires to add \n  ${xmlElement} to your AndroidManifest.xml to work`);
                            }
                        }
                        else {
                            if (!rootXMLEntries.includes(xmlElement) && !contains(rootXMLEntries, xmlElement, k)) {
                                rootXMLEntries.push(xmlElement);
                            }
                        }
                    });
                });
            }
        });
    });
    let cleartextString = 'android:usesCleartextTraffic="true"';
    let cleartext = ((_a = config.app.extConfig.server) === null || _a === void 0 ? void 0 : _a.cleartext) && !applicationXMLAttributes.includes(cleartextString) ? cleartextString : '';
    let content = `<?xml version='1.0' encoding='utf-8'?>
<manifest package="capacitor.android.plugins"
xmlns:android="http://schemas.android.com/apk/res/android"
xmlns:amazon="http://schemas.amazon.com/apk/res/android">
<application ${applicationXMLAttributes.join('\n')} ${cleartext}>
${applicationXMLEntries.join('\n')}
</application>
${rootXMLEntries.join('\n')}
</manifest>`;
    content = content.replace(new RegExp(('$PACKAGE_NAME').replace('$', '\\$&'), 'g'), '${applicationId}');
    if (fs_extra_1.existsSync(manifestPath)) {
        await fs_1.writeFileAsync(manifestPath, content);
    }
}
exports.writeCordovaAndroidManifest = writeCordovaAndroidManifest;
function getPathParts(path) {
    const rootPath = 'manifest';
    path = path.replace('/*', rootPath);
    let parts = path.split('/').filter(part => part !== '');
    if (parts.length > 1 || parts.includes(rootPath)) {
        return parts;
    }
    return [rootPath, path];
}
function contains(a, obj, k) {
    const element = common_1.parseXML(obj);
    for (var i = 0; i < a.length; i++) {
        const current = common_1.parseXML(a[i]);
        if (element && current && current[k] && element[k] && current[k].$ && element[k].$ && element[k].$['android:name'] === current[k].$['android:name']) {
            return true;
        }
    }
    return false;
}
