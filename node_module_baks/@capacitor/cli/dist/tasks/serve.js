"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const serve_1 = require("../web/serve");
async function serveCommand(config) {
    try {
        await serve(config);
    }
    catch (e) {
        common_1.logFatal(e);
    }
}
exports.serveCommand = serveCommand;
async function serve(config) {
    return serve_1.serveWeb(config);
}
exports.serve = serve;
