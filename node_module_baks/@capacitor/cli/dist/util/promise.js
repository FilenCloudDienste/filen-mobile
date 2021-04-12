"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function allSerial(funcs) {
    return funcs.reduce((promise, func) => promise.then(result => func().then(x => result.concat(x))), Promise.resolve([]));
}
exports.allSerial = allSerial;
