cordova.define("cordova-plugin-simple-file-chooser.Chooser", function(require, exports, module) { 
module.exports = {
    getFile: function (accept, successCallback, failureCallback) {
        var result = new Promise(function (resolve, reject) {
            cordova.exec(
                function (json) {
                    try {
                        resolve(JSON.parse(json));
                    }
                    catch (err) {
                        reject(err);
                    }
                },
                reject,
                'Chooser',
                'getFile',
                [(typeof accept === 'string' ? accept.replace(/\s/g, '') : undefined) || '*/*']
            );
        });

        if (typeof successCallback === 'function') {
            result.then(successCallback);
        }
        if (typeof failureCallback === 'function') {
            result.catch(failureCallback);
        }

        return result;
    }
};
});