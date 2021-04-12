"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const definitions_1 = require("../definitions");
const emoji_1 = require("../util/emoji");
const fs_1 = require("../util/fs");
const plugin_1 = require("../plugin");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const term_1 = require("../util/term");
async function newPluginCommand(config) {
    try {
        if (!term_1.isInteractive()) {
            return;
        }
        await newPlugin(config);
    }
    catch (e) {
        common_1.logFatal(e);
    }
}
exports.newPluginCommand = newPluginCommand;
async function newPlugin(config) {
    common_1.log(`${emoji_1.emoji('✏️', '*')}  Creating new Capacitor plugin`);
    const inquirer = await Promise.resolve().then(() => require('inquirer'));
    const requiredInput = (input) => {
        if (!input || input.trim() === '') {
            return false;
        }
        return true;
    };
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Plugin npm name (kebab-case. ex: capacitor-plugin-example):',
            validate: requiredInput
        },
        {
            type: 'input',
            name: 'domain',
            message: 'Plugin id (domain-style syntax. ex: com.mycompany.plugins.example)',
            validate: requiredInput
        },
        {
            type: 'input',
            name: 'className',
            message: 'Plugin class name (ex: Example)',
            validate: requiredInput
        },
        {
            type: 'input',
            name: 'description',
            message: 'description:',
            validate: requiredInput
        },
        {
            type: 'input',
            name: 'git',
            message: 'git repository:',
            validate: requiredInput
        },
        {
            type: 'input',
            name: 'author',
            message: 'author:'
        },
        {
            type: 'input',
            name: 'license',
            message: 'license:',
            default: 'MIT'
        },
        {
            type: 'confirm',
            name: 'confirm',
            message: `package.json will be created, do you want to continue?`
        }
    ]);
    console.log('\n');
    if (answers.confirm) {
        const pluginPath = plugin_1.removeScope(answers.name);
        const domain = answers.domain;
        const className = answers.className;
        const cliVersion = config.cli.package.version;
        if (await fs_1.existsAsync(pluginPath)) {
            common_1.logFatal(`Directory ${pluginPath} already exists. Not overwriting.`);
        }
        await fs_1.mkdirAsync(pluginPath);
        await common_1.runTask('Adding plugin files', async () => {
            await fs_extra_1.copy(config.plugins.assets.templateDir, pluginPath);
            await common_1.renameGitignore(pluginPath);
            await createTSPlugin(config, pluginPath, domain, className, answers);
            await createIosPlugin(config, pluginPath, domain, className, answers);
            await createAndroidPlugin(config, pluginPath, domain, className);
        });
        await common_1.runTask('Writing package.json', () => {
            return common_1.writePrettyJSON(path_1.join(pluginPath, 'package.json'), generatePackageJSON(answers, cliVersion));
        });
        await common_1.runTask('Installing NPM dependencies', async () => {
            return common_1.runCommand(`cd "${pluginPath}" && npm install`);
        });
        if (config.cli.os === definitions_1.OS.Mac) {
            await common_1.runTask('Building iOS project', async () => {
                const iosPath = path_1.join(pluginPath, 'ios');
                return common_1.runCommand(`cd "${iosPath}" && pod install`);
            });
        }
        common_1.logInfo(`Your Capacitor plugin was created at ${pluginPath}`);
    }
    else {
        common_1.logInfo('Aborted');
    }
}
exports.newPlugin = newPlugin;
async function createTSPlugin(config, pluginPath, domain, className, answers) {
    const newPluginPath = path_1.join(pluginPath, 'src');
    const originalDefinitions = await fs_1.readFileAsync(path_1.join(newPluginPath, 'definitions.ts'), 'utf8');
    const originalWeb = await fs_1.readFileAsync(path_1.join(newPluginPath, 'web.ts'), 'utf8');
    let definitions = originalDefinitions.replace(/Echo/g, className);
    const web = originalWeb.replace(/MyPlugin/g, className);
    await fs_1.writeFileAsync(path_1.join(newPluginPath, `definitions.ts`), definitions, 'utf8');
    await fs_1.writeFileAsync(path_1.join(newPluginPath, `web.ts`), web, 'utf8');
}
async function createIosPlugin(config, pluginPath, domain, className, answers) {
    const newPluginPath = path_1.join(pluginPath, 'ios', 'Plugin');
    const originalPluginSwift = await fs_1.readFileAsync(path_1.join(newPluginPath, 'Plugin.swift'), 'utf8');
    const originalPluginObjc = await fs_1.readFileAsync(path_1.join(newPluginPath, 'Plugin.m'), 'utf8');
    const pluginSwift = originalPluginSwift.replace(/CLASS_NAME/g, className);
    const pluginObjc = originalPluginObjc.replace(/CLASS_NAME/g, className);
    if (!answers.git) {
        common_1.logWarn('You will need to add a homepage and git repo to your generated podspec before installing or CocoaPods will complain');
    }
    if (!answers.description) {
        common_1.logWarn('You will need to add a summary to your generated podspec before installing or CocoaPods will complain');
    }
    await fs_1.writeFileAsync(path_1.join(pluginPath, `${plugin_1.fixName(answers.name)}.podspec`), generatePodspec(config, answers), 'utf8');
    await fs_1.writeFileAsync(path_1.join(newPluginPath, 'Plugin.swift'), pluginSwift, 'utf8');
    await fs_1.writeFileAsync(path_1.join(newPluginPath, 'Plugin.m'), pluginObjc, 'utf8');
}
function generatePodspec(config, answers) {
    return `require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = '${plugin_1.fixName(answers.name)}'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['repository']['url']
  s.author = package['author']
  s.source = { :git => package['repository']['url'], :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target  = '${config.ios.minVersion}'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
`;
}
async function createAndroidPlugin(config, pluginPath, domain, className) {
    const domainPath = domain.split('.').join('/');
    // Android specific stuff
    const newPluginPath = path_1.join(pluginPath, 'android');
    // Update the AndroidManifest to point to our new package
    await fs_1.writeFileAsync(path_1.join(newPluginPath, 'src/main/AndroidManifest.xml'), generateAndroidManifest(domain, pluginPath));
    // Make the package source path to the new plugin Java file
    const newPluginJavaPath = path_1.join(newPluginPath, `src/main/java/${domainPath}/${className}.java`);
    await fs_extra_1.mkdirs(path_1.dirname(newPluginJavaPath));
    // Read the original plugin java template and replace package/class names
    const originalPluginJava = await fs_1.readFileAsync(path_1.join(pluginPath, 'android/Plugin.java'), 'utf8');
    const pluginJava = originalPluginJava.replace(/PACKAGE_NAME/g, domain).replace(/CLASS_NAME/g, className);
    // Write the new plugin file
    await fs_1.writeFileAsync(newPluginJavaPath, pluginJava, 'utf8');
    // Remove the old template
    await fs_extra_1.unlink(path_1.join(pluginPath, 'android/Plugin.java'));
}
function generateAndroidManifest(domain, pluginPath) {
    const pluginPackage = pluginPath.split('-').join('');
    return `
  <manifest xmlns:android="http://schemas.android.com/apk/res/android"
      package="${domain}.${pluginPackage}">
  </manifest>
  `;
}
function generatePackageJSON(answers, cliVersion) {
    return {
        'name': answers.name,
        'version': '0.0.1',
        'description': answers.description,
        'main': 'dist/plugin.js',
        'module': 'dist/esm/index.js',
        'types': 'dist/esm/index.d.ts',
        'scripts': {
            'lint': 'npm run prettier -- --check && npm run swiftlint -- lint',
            'prettier': 'prettier "**/*.{css,html,ts,js,java}"',
            'swiftlint': 'node-swiftlint',
            'build': 'npm run clean && tsc && rollup -c rollup.config.js',
            'clean': 'rimraf ./dist',
            'watch': 'tsc --watch',
            'prepublishOnly': 'npm run build'
        },
        'author': answers.author,
        'license': answers.license,
        'devDependencies': {
            '@capacitor/android': `^${cliVersion}`,
            '@capacitor/core': `^${cliVersion}`,
            '@capacitor/ios': `^${cliVersion}`,
            '@ionic/prettier-config': '^1.0.0',
            '@ionic/swiftlint-config': '^1.0.0',
            '@rollup/plugin-node-resolve': '^8.1.0',
            'prettier': '^2.0.5',
            'prettier-plugin-java': '^0.8.0',
            'rimraf': '^3.0.0',
            'rollup': '^2.21.0',
            'swiftlint': '^1.0.1',
            'typescript': '~3.8.3'
        },
        'peerDependencies': {
            '@capacitor/core': `^${cliVersion}`
        },
        'files': [
            'dist/',
            'ios/',
            'android/',
            `${plugin_1.fixName(answers.name)}.podspec`
        ],
        'keywords': [
            'capacitor',
            'plugin',
            'native'
        ],
        'capacitor': {
            'ios': {
                'src': 'ios',
            },
            'android': {
                'src': 'android'
            }
        },
        'prettier': '@ionic/prettier-config',
        'swiftlint': '@ionic/swiftlint-config',
        'repository': {
            'type': 'git',
            'url': answers.git
        },
        'bugs': {
            'url': `${answers.git}/issues`
        }
    };
}
