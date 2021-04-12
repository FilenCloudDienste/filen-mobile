/*
The MIT License (MIT)

Copyright (c) 2019 fefc - fefc.dev@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const cacheDirectory = (require('./isChrome')()) ? 'filesystem:' + window.location.origin + '/temporary/' : 'file:///temporary/';
const dataDirectory = (require('./isChrome')()) ? 'filesystem:' + window.location.origin + '/persistent/' : 'file:///persistent/';

function open(successCallback, errorCallback, data) {
  var fullFilePath = data[0];
  //var contentType = data[1]; //Not needed in browser
  //var openDialog = data[2]; //Not needed in browser

  var dirPath = fullFilePath.substring(0, fullFilePath.lastIndexOf('/') + 1);
  var fileName = fullFilePath.substring(fullFilePath.lastIndexOf('/') + 1, fullFilePath.length);
  var fileSystemLocalPath = getLocalPathAndFileSystem(dirPath);

  if (!fileSystemLocalPath.error) {
    window.requestFileSystem(fileSystemLocalPath.fileSystem, 0, (fs) => {
      readFile(fs.root, fileSystemLocalPath.localPath + fileName).then((blob) => {
        FileSaver.saveAs(blob, fileName);
        successCallback();
      }).catch((error) => {
        errorCallback(error);
      });
    }, (error) => {
      errorCallback(error);
    });
  } else {
    errorCallback('INVALID_PATH');
  }
}

/**
 *
 * Gets the localPath according to the fileSystem (TEMPORARY or PERSISTENT).
 *
 * @param {String} Path to the file or directory to check
 * @returns {Object} value with informations to requestFileSystem later
 * @returns {string} value.localPath The localPath in relation with fileSystem.
 * @returns {number} value.fileSystem the fileSystem (TEMPORARY or PERSISTENT).
 * @returns {error} value.error if the path is not valid.
 * @returns {message} value.message error message.
 */
function getLocalPathAndFileSystem(pathToCheck) {
  let ret = {
    localPath: '',
    fileSystem: window.TEMPORARY
  };

  if (pathToCheck.startsWith(cacheDirectory)) {
    ret.localPath = pathToCheck.replace(cacheDirectory, '');
    ret.fileSystem = window.TEMPORARY;

  } else if (pathToCheck.startsWith(dataDirectory)) {
    ret.localPath = pathToCheck.replace(dataDirectory, '');
    ret.fileSystem = window.PERSISTENT;

  } else {
    return {error: true, message: 'INVALID_PATH'};
  }

  if (!ret.localPath.endsWith('/')) ret.localPath += '/';

  return ret;
}

/**
 *
 * Reads a file in the fileSystem as an DataURL.
 *
 * @param {String} Root is the root folder of the fileSystem.
 * @param {String} Path is the file to be red.
 * @returns {Promise} which resolves with an Object containing DataURL, rejects if something went wrong.
 */
function readFile(root, filePath) {
  return new Promise((resolve, reject) => {
    if (filePath.startsWith('/')) filePath = filePath.substring(1);

    root.getFile(filePath, {}, (fileEntry) => {
      fileEntry.file((file) => {
        let reader = new FileReader();

        reader.onload = function() {
          resolve(reader.result);
        };

        reader.onerror = function() {
          reject(reader.error);
        }

        reader.readAsDataURL(file);

      }, (error) => {
        reject(error);
      });
    }, (error) => {
      reject(error);
    });
  });
}

module.exports = {
  open: open
};

require( "cordova/exec/proxy" ).add( "FileOpener2", module.exports );
