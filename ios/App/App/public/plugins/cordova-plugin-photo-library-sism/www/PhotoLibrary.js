cordova.define("cordova-plugin-photo-library-sism.PhotoLibrary", function(require, exports, module) { 
var exec = require('cordova/exec');

var async = cordova.require('cordova-plugin-photo-library-sism.async');

var defaultThumbnailWidth = 512; // optimal for android
var defaultThumbnailHeight = 384; // optimal for android

var defaultQuality = 0.5;

var isBrowser = cordova.platformId == 'browser';

var photoLibrary = {};

// Will start caching for specified size
photoLibrary.getLibrary = function (success, error, options) {

  if (!options) {
    options = {};
  }

  options = {
    thumbnailWidth: options.thumbnailWidth || defaultThumbnailWidth,
    thumbnailHeight: options.thumbnailHeight || defaultThumbnailHeight,
    quality: options.quality || defaultQuality,
    itemsInChunk: options.itemsInChunk || 0,
    chunkTimeSec: options.chunkTimeSec || 0,
    useOriginalFileNames: options.useOriginalFileNames || false,
    includeImages: options.includeImages !== undefined ? options.includeImages : true,
    includeAlbumData: options.includeAlbumData || false,
    includeCloudData: options.includeCloudData !== undefined ? options.includeCloudData : true,
    includeVideos: options.includeVideos || false,
    maxItems: options.maxItems || 0
  };

  // queue that keeps order of async processing
  var q = async.queue(function(chunk, done) {

    var library = chunk.library;
    var isLastChunk = chunk.isLastChunk;

    processLibrary(library, function(library) {
      var result = { library: library, isLastChunk: isLastChunk };
      success(result);
      done();
    }, options);

  });

  var chunksToProcess = []; // chunks are stored in its index
  var currentChunkNum = 0;

  cordova.exec(
    function (chunk) {
      // callbacks arrive from cordova.exec not in order, restoring the order here
      if (chunk.chunkNum === currentChunkNum) {
        // the chunk arrived in order
        q.push(chunk);
        currentChunkNum += 1;
        while (chunksToProcess[currentChunkNum]) {
          q.push(chunksToProcess[currentChunkNum]);
          delete chunksToProcess[currentChunkNum];
          currentChunkNum += 1;
        }
      } else {
        // the chunk arrived not in order
        chunksToProcess[chunk.chunkNum] = chunk;
      }
    },
    error,
    'PhotoLibrary',
    'getLibrary', [options]
  );

};

photoLibrary.getAlbums = function (success, error) {

  cordova.exec(
    function (result) {
      success(result);
    },
    error,
    'PhotoLibrary',
    'getAlbums', []
  );

};

photoLibrary.getPhotosFromAlbum = function (albumTitle, success, error) {

  cordova.exec(
    function (result) {
      success(result);
    },
    error,
    'PhotoLibrary',
    'getPhotosFromAlbum', [albumTitle]
  );

};

photoLibrary.isAuthorized = function (success, error) {

  cordova.exec(
    function (result) {
      success(result);
    },
    error,
    'PhotoLibrary',
    'isAuthorized', []
  );

};

// Generates url that can be accessed directly, so it will work more efficiently than getThumbnail, which does base64 encode/decode.
// If success callback not provided, will return value immediately, but use overload with success as it browser-friendly
photoLibrary.getThumbnailURL = function (photoIdOrLibraryItem, success, error, options) {

  var photoId = typeof photoIdOrLibraryItem.id !== 'undefined' ? photoIdOrLibraryItem.id : photoIdOrLibraryItem;

  if (typeof success !== 'function' && typeof options === 'undefined') {
    options = success;
    success = undefined;
  }

  options = getThumbnailOptionsWithDefaults(options);

  var urlParams = 'photoId=' + fixedEncodeURIComponent(photoId) +
    '&width=' + fixedEncodeURIComponent(options.thumbnailWidth) +
    '&height=' + fixedEncodeURIComponent(options.thumbnailHeight) +
    '&quality=' + fixedEncodeURIComponent(options.quality);
  var thumbnailURL = 'cdvphotolibrary://thumbnail?' + urlParams;

  if (success) {
    if (isBrowser) {
      cordova.exec(function(thumbnailURL) { success(thumbnailURL + '#' + urlParams); }, error, 'PhotoLibrary', '_getThumbnailURLBrowser', [photoId, options]);
    } else {
      success(thumbnailURL);
    }
  } else {
    return thumbnailURL;
  }

};

// Generates url that can be accessed directly, so it will work more efficiently than getPhoto, which does base64 encode/decode.
// If success callback not provided, will return value immediately, but use overload with success as it browser-friendly
photoLibrary.getPhotoURL = function (photoIdOrLibraryItem, success, error, options) {

  var photoId = typeof photoIdOrLibraryItem.id !== 'undefined' ? photoIdOrLibraryItem.id : photoIdOrLibraryItem;

  if (typeof success !== 'function' && typeof options === 'undefined') {
    options = success;
    success = undefined;
  }

  if (!options) {
    options = {};
  }

  var urlParams = 'photoId=' + fixedEncodeURIComponent(photoId);
  var photoURL = 'cdvphotolibrary://photo?' + urlParams;

  if (success) {
    if (isBrowser) {
      cordova.exec(function(photoURL) { success(photoURL + '#' + urlParams); }, error, 'PhotoLibrary', '_getPhotoURLBrowser', [photoId, options]);
    } else {
      success(photoURL);
    }
  } else {
    return photoURL;
  }

};

// Provide same size as when calling getLibrary for better performance
photoLibrary.getThumbnail = function (photoIdOrLibraryItem, success, error, options) {

  var photoId = typeof photoIdOrLibraryItem.id !== 'undefined' ? photoIdOrLibraryItem.id : photoIdOrLibraryItem;

  options = getThumbnailOptionsWithDefaults(options);

  cordova.exec(
    function (data, mimeType) {
      var blob = dataAndMimeTypeToBlob(data, mimeType);
      success(blob);
    },
    error,
    'PhotoLibrary',
    'getThumbnail', [photoId, options]
  );

};

photoLibrary.getPhoto = function (photoIdOrLibraryItem, success, error, options) {

  var photoId = typeof photoIdOrLibraryItem.id !== 'undefined' ? photoIdOrLibraryItem.id : photoIdOrLibraryItem;

  if (!options) {
    options = {};
  }

  cordova.exec(
    function (data, mimeType) {
      var blob = dataAndMimeTypeToBlob(data, mimeType);
      success(blob);
    },
    error,
    'PhotoLibrary',
    'getPhoto', [photoId, options]
  );

};

photoLibrary.getLibraryItem = function (libraryItem, success, error, options) {

  if (!options) {
    options = {};
  }

  cordova.exec(
    function (data, mimeType) {
      var blob = dataAndMimeTypeToBlob(data, mimeType);
      success(blob);
    },
    error,
    'PhotoLibrary',
    'getLibraryItem', [libraryItem, options]
  );

};

// Call when thumbnails are not longer needed for better performance
photoLibrary.stopCaching = function (success, error) {

  cordova.exec(
    success,
    error,
    'PhotoLibrary',
    'stopCaching', []
  );

};

// Call when getting errors that begin with 'Permission Denial'
photoLibrary.requestAuthorization = function (success, error, options) {

  options = getRequestAuthenticationOptionsWithDefaults(options);

  cordova.exec(
    success,
    error,
    'PhotoLibrary',
    'requestAuthorization', [options]
  );

};

// url is file url or dataURL
photoLibrary.saveImage = function (url, album, success, error, options) {

  options = getThumbnailOptionsWithDefaults(options);

  if (album.title) {
    album = album.title;
  }

  cordova.exec(
    function (libraryItem) {
      var library = libraryItem ? [libraryItem] : [];

      processLibrary(library, function(library) {
        success(library[0] || null);
      }, options);

    },
    error,
    'PhotoLibrary',
    'saveImage', [url, album]
  );

};

// url is file url or dataURL
photoLibrary.saveVideo = function (url, album, success, error) {

  if (album.title) {
    album = album.title;
  }

  cordova.exec(
    success,
    error,
    'PhotoLibrary',
    'saveVideo', [url, album]
  );

};

module.exports = photoLibrary;

var getThumbnailOptionsWithDefaults = function (options) {

  if (!options) {
    options = {};
  }

  options = {
    thumbnailWidth: options.thumbnailWidth || defaultThumbnailWidth,
    thumbnailHeight: options.thumbnailHeight || defaultThumbnailHeight,
    quality: options.quality || defaultQuality,
  };

  return options;

};

var getRequestAuthenticationOptionsWithDefaults = function (options) {

  if (!options) {
    options = {};
  }

  options = {
    read: options.read || true,
    write: options.write || false,
  };

  return options;

};

var processLibrary = function (library, success, options) {

  parseDates(library);

  addUrlsToLibrary(library, success, options);

};

var parseDates = function (library) {
  var i;
  for (i = 0; i < library.length; i++) {
    var libraryItem = library[i];
    if (libraryItem.creationDate) {
      libraryItem.creationDate = new Date(libraryItem.creationDate);
    }
  }
};

var addUrlsToLibrary = function (library, callback, options) {

  var urlsLeft = library.length;

  var handlePhotoURL = function (libraryItem, photoURL) {
    libraryItem.photoURL = photoURL;
    urlsLeft -= 1;
    if (urlsLeft === 0) {
      callback(library);
    }
  };

  var handleThumbnailURL = function (libraryItem, thumbnailURL) {
    libraryItem.thumbnailURL = thumbnailURL;
    photoLibrary.getPhotoURL(libraryItem, handlePhotoURL.bind(null, libraryItem), handleUrlError);
  };

  var handleUrlError = function () {}; // Should never happen

  var i;
  for (i = 0; i < library.length; i++) {
    var libraryItem = library[i];
    photoLibrary.getThumbnailURL(libraryItem, handleThumbnailURL.bind(null, libraryItem), handleUrlError, options);
  }

};

var dataAndMimeTypeToBlob = function (data, mimeType) {
  if (!mimeType && data.data && data.mimeType) {
    // workaround for browser platform cannot return multipart result
    mimeType = data.mimeType;
    data = data.data;
  }
  if (typeof data === 'string') {
    // workaround for data arrives as base64 instead of arrayBuffer, with cordova-android 6.x
    data = cordova.require('cordova/base64').toArrayBuffer(data);
  }
  var blob = new Blob([data], {
    type: mimeType
  });

  return blob;
};

// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}
});