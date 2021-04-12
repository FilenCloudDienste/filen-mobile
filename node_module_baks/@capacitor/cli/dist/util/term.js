"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
// Given input variables to a command, make sure all are provided if the terminal
// is not interactive (because we won't be able to prompt the user)
exports.checkInteractive = (...args) => {
    if (exports.isInteractive()) {
        return true;
    }
    // Fail if no args are provided, treat this as just a check of whether the term is
    // interactive or not.
    if (!args.length) {
        return false;
    }
    // Make sure none of the provided args are empty, otherwise print the interactive
    // warning and return false
    if (!!args.filter(arg => !!!arg).length) {
        common_1.logError('Non-interactive shell detected. Run the command with --help to see a list of arguments that must be provided.');
        return false;
    }
    return true;
};
exports.isInteractive = () => {
    return Boolean(process.stdin.isTTY && process.stdout.isTTY && process.stderr.isTTY);
};
