"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Emoji falback, right now just uses fallback on windows,
// but could expand to be more sophisticated to allow emoji
// on Hyper term on windows, for example.
exports.emoji = (x, fallback) => {
    if (process.platform === 'win32') {
        return fallback;
    }
    return x;
};
