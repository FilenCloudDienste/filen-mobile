"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
async function serveWeb(config) {
    await common_1.runTask(`Serving web content in: ${config.app.webDir}`, () => {
        return common_1.runCommand(`npx @stencil/core@0.18.1 serve --open --root ${config.app.webDir}`);
    });
}
exports.serveWeb = serveWeb;
