"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var util_1 = require("./util");
var nav = typeof navigator === 'object' ? navigator : undefined;
var isBatteryApiSupported = nav && typeof nav.getBattery === 'function';
function useBatteryMock() {
    return { isSupported: false };
}
function useBattery() {
    var _a = react_1.useState({ isSupported: true, fetched: false }), state = _a[0], setState = _a[1];
    react_1.useEffect(function () {
        var isMounted = true;
        var battery = null;
        var handleChange = function () {
            if (!isMounted || !battery) {
                return;
            }
            var newState = {
                isSupported: true,
                fetched: true,
                level: battery.level,
                charging: battery.charging,
                dischargingTime: battery.dischargingTime,
                chargingTime: battery.chargingTime,
            };
            !util_1.isDeepEqual(state, newState) && setState(newState);
        };
        nav.getBattery().then(function (bat) {
            if (!isMounted) {
                return;
            }
            battery = bat;
            util_1.on(battery, 'chargingchange', handleChange);
            util_1.on(battery, 'chargingtimechange', handleChange);
            util_1.on(battery, 'dischargingtimechange', handleChange);
            util_1.on(battery, 'levelchange', handleChange);
            handleChange();
        });
        return function () {
            isMounted = false;
            if (battery) {
                util_1.off(battery, 'chargingchange', handleChange);
                util_1.off(battery, 'chargingtimechange', handleChange);
                util_1.off(battery, 'dischargingtimechange', handleChange);
                util_1.off(battery, 'levelchange', handleChange);
            }
        };
    }, []);
    return state;
}
exports.default = isBatteryApiSupported ? useBattery : useBatteryMock;
