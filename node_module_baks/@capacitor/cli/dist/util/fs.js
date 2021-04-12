"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fsExtra = require("fs-extra");
const fs = require("fs");
const util = require("util");
exports.existsSync = (path) => {
    return fs.existsSync(path);
};
exports.mkdirAsync = util.promisify(fs.mkdir);
exports.symlinkAsync = util.promisify(fs.symlink);
exports.readFileAsync = util.promisify(fs.readFile);
exports.writeFileAsync = util.promisify(fs.writeFile);
exports.readdirAsync = util.promisify(fs.readdir);
exports.statAsync = util.promisify(fs.stat);
exports.lstatAsync = util.promisify(fs.lstat);
exports.renameAsync = util.promisify(fs.rename);
exports.copyAsync = fsExtra.copy;
exports.removeAsync = fsExtra.remove;
exports.removeSync = fsExtra.removeSync;
exports.ensureDirSync = fsExtra.ensureDirSync;
exports.copySync = fsExtra.copySync;
exports.readFileSync = fsExtra.readFileSync;
exports.writeFileSync = fsExtra.writeFileSync;
exports.existsAsync = async (path) => {
    try {
        const stat = await exports.statAsync(path);
        return true;
    }
    catch (_a) {
        return false;
    }
};
exports.convertToUnixPath = (path) => {
    return path.replace(/\\/g, '/');
};
