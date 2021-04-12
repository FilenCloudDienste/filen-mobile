"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHookState = void 0;
function resolveHookState(newState, currentState) {
    if (typeof newState === 'function') {
        return newState(currentState);
    }
    return newState;
}
exports.resolveHookState = resolveHookState;
