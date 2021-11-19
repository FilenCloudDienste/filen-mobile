cordova.define("cordova-plugin-fingerprint-aio.Fingerprint", function(require, exports, module) { 
/*global cordova */

var Fingerprint = function() {
};

// Plugin Errors
Fingerprint.prototype.BIOMETRIC_UNKNOWN_ERROR = -100;
Fingerprint.prototype.BIOMETRIC_UNAVAILABLE = -101;
Fingerprint.prototype.BIOMETRIC_AUTHENTICATION_FAILED = -102;
Fingerprint.prototype.BIOMETRIC_SDK_NOT_SUPPORTED = -103;
Fingerprint.prototype.BIOMETRIC_HARDWARE_NOT_SUPPORTED = -104;
Fingerprint.prototype.BIOMETRIC_PERMISSION_NOT_GRANTED = -105;
Fingerprint.prototype.BIOMETRIC_NOT_ENROLLED = -106;
Fingerprint.prototype.BIOMETRIC_INTERNAL_PLUGIN_ERROR = -107;
Fingerprint.prototype.BIOMETRIC_DISMISSED = -108;
Fingerprint.prototype.BIOMETRIC_PIN_OR_PATTERN_DISMISSED = -109;
Fingerprint.prototype.BIOMETRIC_SCREEN_GUARD_UNSECURED = -110;
Fingerprint.prototype.BIOMETRIC_LOCKED_OUT = -111;
Fingerprint.prototype.BIOMETRIC_LOCKED_OUT_PERMANENT = -112;
Fingerprint.prototype.BIOMETRIC_NO_SECRET_FOUND = -113;

// Biometric types
Fingerprint.prototype.BIOMETRIC_TYPE_FINGERPRINT = "finger";
Fingerprint.prototype.BIOMETRIC_TYPE_FACE = "face";
Fingerprint.prototype.BIOMETRIC_TYPE_COMMON = "biometric";

Fingerprint.prototype.show = function (params, successCallback, errorCallback) {
  cordova.exec(
    successCallback,
    errorCallback,
    "Fingerprint",
    "authenticate",
    [params]
  );
};

Fingerprint.prototype.isAvailable = function (successCallback, errorCallback, optionalParams) {
  cordova.exec(
    successCallback,
    errorCallback,
    "Fingerprint",
    "isAvailable",
    [optionalParams]
  );
};

Fingerprint.prototype.registerBiometricSecret = function (params, successCallback, errorCallback) {
  cordova.exec(
      successCallback,
      errorCallback,
      "Fingerprint",
      "registerBiometricSecret",
      [params]
  );
};

Fingerprint.prototype.loadBiometricSecret = function (params, successCallback, errorCallback) {
  cordova.exec(
      successCallback,
      errorCallback,
      "Fingerprint",
      "loadBiometricSecret",
      [params]
  );
};

module.exports = new Fingerprint();
});