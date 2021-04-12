import { IonicNativePlugin } from '@ionic-native/core';
/**
 * @name File Opener
 * @description
 * This plugin will open a file on your device file system with its default application.
 *
 * @usage
 * ```typescript
 * import { FileOpener } from '@ionic-native/file-opener/ngx';
 *
 * constructor(private fileOpener: FileOpener) { }
 *
 * ...
 *
 * this.fileOpener.open('path/to/file.pdf', 'application/pdf')
 *   .then(() => console.log('File is opened'))
 *   .catch(e => console.log('Error opening file', e));
 *
 * this.fileOpener.showOpenWithDialog('path/to/file.pdf', 'application/pdf')
 *   .then(() => console.log('File is opened'))
 *   .catch(e => console.log('Error opening file', e));
 *
 * ```
 */
export declare class FileOpener extends IonicNativePlugin {
    /**
     * Open an file
     * @param {string} filePath File Path
     * @param {string} fileMIMEType File MIME Type
     * @returns {Promise<any>}
     */
    open(filePath: string, fileMIMEType: string): Promise<any>;
    /**
     * Uninstalls a package
     * @param {string} packageId Package ID
     * @returns {Promise<any>}
     */
    uninstall(packageId: string): Promise<any>;
    /**
     * Check if an app is already installed
     * @param {string} packageId Package ID
     * @returns {Promise<any>}
     */
    appIsInstalled(packageId: string): Promise<any>;
    /**
     * Opens with system modal to open file with an already installed app.
     * @param {string} filePath File Path
     * @param {string} fileMIMEType File MIME Type
     * @returns {Promise<any>}
     */
    showOpenWithDialog(filePath: string, fileMIMEType: string): Promise<any>;
}
