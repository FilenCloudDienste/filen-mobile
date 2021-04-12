"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
async function copyWeb(config) {
    if (config.app.bundledWebRuntime) {
        const runtimePath = common_1.resolveNode(config, '@capacitor/core', 'dist', 'capacitor.js');
        if (!runtimePath) {
            common_1.logFatal(`Unable to find node_modules/@capacitor/core/dist/capacitor.js. Are you sure`, '@capacitor/core is installed? This file is required for Capacitor to function');
            return;
        }
        return common_1.runTask(`Copying capacitor.js to web dir`, () => {
            return fs_extra_1.copy(runtimePath, path_1.join(config.app.webDirAbs, 'capacitor.js'));
        });
    }
}
exports.copyWeb = copyWeb;
