"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const common_1 = require("./common");
async function getPlugins(config) {
    const deps = getDependencies(config);
    const plugins = await Promise.all(deps.map(async (p) => resolvePlugin(config, p)));
    return plugins.filter(p => !!p);
}
exports.getPlugins = getPlugins;
async function resolvePlugin(config, name) {
    try {
        const rootPath = common_1.resolveNode(config, name);
        if (!rootPath) {
            common_1.logFatal(`Unable to find node_modules/${name}. Are you sure ${name} is installed?`);
            return null;
        }
        const packagePath = path_1.join(rootPath, 'package.json');
        const meta = await common_1.readJSON(packagePath);
        if (!meta) {
            return null;
        }
        if (meta.capacitor) {
            return {
                id: name,
                name: fixName(name),
                version: meta.version,
                rootPath: rootPath,
                repository: meta.repository,
                manifest: meta.capacitor
            };
        }
        const pluginXMLPath = path_1.join(rootPath, 'plugin.xml');
        const xmlMeta = await common_1.readXML(pluginXMLPath);
        return {
            id: name,
            name: fixName(name),
            version: meta.version,
            rootPath: rootPath,
            repository: meta.repository,
            xml: xmlMeta.plugin
        };
    }
    catch (e) { }
    return null;
}
exports.resolvePlugin = resolvePlugin;
function getDependencies(config) {
    const dependencies = config.app.package.dependencies ? config.app.package.dependencies : [];
    const devDependencies = config.app.package.devDependencies ? config.app.package.devDependencies : [];
    return Object.keys(dependencies).concat(Object.keys(devDependencies));
}
exports.getDependencies = getDependencies;
function fixName(name) {
    name = name
        .replace(/\//g, '_')
        .replace(/-/g, '_')
        .replace(/@/g, '')
        .replace(/_\w/g, (m) => m[1].toUpperCase());
    return name.charAt(0).toUpperCase() + name.slice(1);
}
exports.fixName = fixName;
function removeScope(name) {
    var parts = name.split('/');
    if (parts.length > 1) {
        name = parts[parts.length - 1];
    }
    return name;
}
exports.removeScope = removeScope;
function printPlugins(plugins, platform, type = 'capacitor') {
    const plural = plugins.length === 1 ? '' : 's';
    if (type === 'cordova') {
        common_1.log(`  Found ${plugins.length} Cordova plugin${plural} for ${platform}`);
    }
    else if (type === 'incompatible' && plugins.length > 0) {
        common_1.log(`  Found ${plugins.length} incompatible Cordova plugin${plural} for ${platform}, skipped install`);
    }
    else if (type === 'capacitor') {
        common_1.log(`  Found ${plugins.length} Capacitor plugin${plural} for ${platform}:`);
    }
    const chalk = require('chalk');
    for (let p of plugins) {
        common_1.log(`    ${chalk.bold(`${p.id}`)} (${chalk.green(p.version)})`);
    }
}
exports.printPlugins = printPlugins;
function getPluginPlatform(p, platform) {
    const platforms = p.xml.platform;
    if (platforms) {
        const platforms = p.xml.platform.filter(function (item) { return item.$.name === platform; });
        return platforms[0];
    }
    return [];
}
exports.getPluginPlatform = getPluginPlatform;
function getPlatformElement(p, platform, elementName) {
    const platformTag = getPluginPlatform(p, platform);
    if (platformTag) {
        const element = platformTag[elementName];
        if (element) {
            return element;
        }
    }
    return [];
}
exports.getPlatformElement = getPlatformElement;
function getPluginType(p, platform) {
    if (platform === 'ios') {
        return p.ios.type;
    }
    if (platform === 'android') {
        return p.android.type;
    }
    return 0 /* Core */;
}
exports.getPluginType = getPluginType;
/**
 * Get each JavaScript Module for the given plugin
 */
function getJSModules(p, platform) {
    return getAllElements(p, platform, 'js-module');
}
exports.getJSModules = getJSModules;
/**
 * Get each asset tag for the given plugin
 */
function getAssets(p, platform) {
    return getAllElements(p, platform, 'asset');
}
exports.getAssets = getAssets;
function getFilePath(config, plugin, path) {
    if (path.startsWith('node_modules')) {
        let pathSegments = path.split('/').slice(1);
        if (pathSegments[0].startsWith('@')) {
            pathSegments = [pathSegments[0] + '/' + pathSegments[1], ...pathSegments.slice(2)];
        }
        let filePath = common_1.resolveNode(config, ...pathSegments);
        if (!filePath) {
            throw new Error(`Can't resolve module ${pathSegments[0]}`);
        }
        return filePath;
    }
    return path_1.join(plugin.rootPath, path);
}
exports.getFilePath = getFilePath;
/**
 * For a given plugin, return all the plugin.xml elements with elementName, checking root and specified platform
 */
function getAllElements(p, platform, elementName) {
    let modules = [];
    if (p.xml[elementName]) {
        modules = modules.concat(p.xml[elementName]);
    }
    const platformModules = getPluginPlatform(p, platform);
    if (platformModules && platformModules[elementName]) {
        modules = modules.concat(platformModules[elementName]);
    }
    return modules;
}
exports.getAllElements = getAllElements;
