/**
 * Initialize the ionic.native Angular module if we're running in ng1.
 * This iterates through the list of registered plugins and dynamically
 * creates Angular 1 services of the form $cordovaSERVICE, ex: $cordovaStatusBar.
 */
export function initAngular1(plugins) {
    if (typeof window !== 'undefined' && window.angular) {
        var ngModule_1 = window.angular.module('ionic.native', []);
        for (var name_1 in plugins) {
            var serviceName = '$cordova' + name_1;
            var cls = plugins[name_1];
            (function (serviceName, cls, name) {
                ngModule_1.service(serviceName, [
                    function () {
                        var funcs = window.angular.copy(cls);
                        funcs.__proto__['name'] = name;
                        return funcs;
                    },
                ]);
            })(serviceName, cls, name_1);
        }
    }
}
//# sourceMappingURL=ng1.js.map