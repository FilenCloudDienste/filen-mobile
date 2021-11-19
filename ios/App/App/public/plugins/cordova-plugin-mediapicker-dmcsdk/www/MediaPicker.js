cordova.define("cordova-plugin-mediapicker-dmcsdk.MediaPicker", function(require, exports, module) { 
var exec = require('cordova/exec');


var MediaPicker = {
    getMedias:function(arg0, success, error) {
        exec(success, error, "MediaPicker", "getMedias", [arg0]);
    },
    photoLibrary:function(arg0, success, error) {
        exec(success, error, "MediaPicker", "photoLibrary", [arg0]);
    },
    takePhoto:function(cameraOptions,success, error) {
        cameraOptions.destinationType= Camera.DestinationType.FILE_URI; //only support FILE_URI
        navigator.camera.getPicture(function(arg0){
            MediaPicker.getFileInfo(arg0,"uri", function(media) {
                success(media);
            }, function(e) { console.log(e) }); }, function(arg1){
                error(arg1);
            }, cameraOptions);
    },
    extractThumbnail:function(arg0, success, error) {
        exec(success, error, "MediaPicker", "extractThumbnail", [arg0]);
    },
    compressEvent:function(s,i) {
        cordova.fireDocumentEvent('MediaPicker.CompressVideoEvent', {'status':s,'index':i});
    },
    icloudDownloadEvent:function(p,i) {
        cordova.fireDocumentEvent('MediaPicker.icloudDownloadEvent', {'progress':p,'index':i});
    },
    compressImage:function(arg0, success, error) {
        exec(success, error, "MediaPicker", "compressImage", [arg0]);
    },
    fileToBlob:function(arg0, success, error) {
        exec(success, error, "MediaPicker", "fileToBlob", [arg0]);
    },
    getExifForKey:function(arg0, arg1, success, error) {
        exec(success, error, "MediaPicker", "getExifForKey", [arg0,arg1]);
    },
    getFileInfo:function(path, argType, success, error) { //type:"path"  or "uri"
        exec(success, error, "MediaPicker", "getFileInfo", [path,argType]);
    }
};

module.exports = MediaPicker;
});