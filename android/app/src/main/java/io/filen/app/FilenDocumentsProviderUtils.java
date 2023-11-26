package io.filen.app;

import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.graphics.BitmapFactory;
import android.os.CancellationSignal;
import android.provider.DocumentsContract;
import android.util.Log;
import org.json.*;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.net.URLConnection;
import java.nio.file.Files;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import javax.annotation.Nullable;

public class FilenDocumentsProviderUtils {
    private static final ExecutorService downloadThreadPool = Executors.newFixedThreadPool(10);
    private static final ExecutorService uploadThreadPool = Executors.newFixedThreadPool(10);
    private static final Map<String, Semaphore> downloadFileSemaphore = new HashMap<>();
    private static final Map<String, Semaphore> uploadFileSemaphore = new HashMap<>();
    private static long nextDirectoryCleanup = 0;

    public static boolean isLoggedIn() {
        return MMKVHelper.getInstance().decodeBool("isLoggedIn", false);
    }

    public static String getAPIKey() {
        return MMKVHelper.getInstance().decodeString("apiKey", "");
    }

    public static int getUserId() {
        return (int) MMKVHelper.getInstance().decodeDouble("userId", 0.0);
    }

    public static String getDefaultDriveUUID() {
        return MMKVHelper.getInstance().decodeString("defaultDriveUUID:" + getUserId(), "");
    }

    public static String[] getMasterKeys() {
        final String masterKeys = MMKVHelper.getInstance().decodeString("masterKeys", "[]");

        try {
            final JSONArray jsonArray = new JSONArray(masterKeys);
            final String[] stringArray = new String[jsonArray.length()];

            for (int i = 0; i < jsonArray.length(); i++) {
                stringArray[i] = jsonArray.getString(i);
            }

            return stringArray;
        } catch (JSONException e) {
            e.printStackTrace();

            return new String[0];
        }
    }

    public static boolean needsBiometricAuth() {
        return false; // @TODO
    }

    public static Object[] getRootsInfo () {
        Cursor dbCursor = null;
        long storageUsed = 0;
        long maxStorage = 0;

        try {
            dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `data` FROM `metadata` WHERE `key` = ?", new String[] { "storageUsed" });

            if (dbCursor.moveToNext()) {
                storageUsed = Long.parseLong(dbCursor.getString(0));
            }

            dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `data` FROM `metadata` WHERE `key` = ?", new String[] { "maxStorage" });

            if (dbCursor.moveToNext()) {
                maxStorage = Long.parseLong(dbCursor.getString(0));
            }

            dbCursor.close();

            return new Object[] {
                    storageUsed,
                    maxStorage
            };
        } catch (Exception e) {
            Log.d("FilenDocumentsProvider", "getItemFromDocumentId error: " + e.getMessage());

            return new Object[] {
                    storageUsed,
                    maxStorage
            };
        } finally {
            if (dbCursor != null) {
                dbCursor.close();
            }
        }
    }

    public static void updateRootsInfo (ErrorCallback callback) {
        Log.d("FilenDocumentsProvider", "updateRootsInfo");

        new Thread(() -> {
            FilenAPI.userInfo(getAPIKey(), new APIRequest.APICallback() {
                @Override
                public void onSuccess(JSONObject result) {
                    try {
                        if (!result.getBoolean("status")) {
                            throw new Exception("updateRootsInfo invalid status code: " + result.getString("code"));
                        }

                        final JSONObject data = result.getJSONObject("data");

                        SQLiteHelper.getInstance().execSQL(
                                "INSERT OR REPLACE INTO `metadata` (`key`, `data`) VALUES (?, ?)",
                                new Object[] {
                                        "storageUsed",
                                        data.getLong("storageUsed")
                                }
                        );

                        SQLiteHelper.getInstance().execSQL(
                                "INSERT OR REPLACE INTO `metadata` (`key`, `data`) VALUES (?, ?)",
                                new Object[] {
                                        "maxStorage",
                                        data.getLong("maxStorage")
                                }
                        );

                        callback.onResult(null);
                    } catch (Exception e) {
                        e.printStackTrace();

                        Log.d("FilenDocumentsProvider", "updateRootsInfo error: " + e.getMessage());

                        callback.onResult(e);
                    }
                }

                @Override
                public void onError(Throwable throwable) {
                    throwable.printStackTrace();

                    Log.d("FilenDocumentsProvider", "updateRootsInfo error: " + throwable.getMessage());

                    callback.onResult(throwable);
                }
            });
        }).start();
    }

    public static void deleteItemFromSQLiteRecursive (String uuid) {
        final Item item = getItemFromDocumentId(uuid);

        if (item == null) {
            return;
        }

        if (item.type.equals("file")) {
            SQLiteHelper.getInstance().execSQL("DELETE FROM `items` WHERE `uuid` = ?", new Object[]{ uuid });

            return;
        }

        Cursor dbCursor = null;

        try {
            SQLiteHelper.getInstance().execSQL("DELETE FROM `items` WHERE `uuid` = ?", new Object[]{ uuid });

            dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `uuid` FROM `items` WHERE `parent` = ?", new String[]{ uuid });

            while (dbCursor.moveToNext()) {
                deleteItemFromSQLiteRecursive(dbCursor.getString(0));
            }
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "deleteItemFromSQLiteRecursive error: " + e.getMessage());
        } finally {
            if (dbCursor != null) {
                dbCursor.close();
            }
        }
    }

    public static void trashDocument (String documentId, ErrorCallback callback) {
        Log.d("FilenDocumentsProvider", "trashDocument: " + documentId);

        final Item item = getItemFromDocumentId(documentId);

        if (item == null) {
            callback.onResult(new FileNotFoundException("Document " + documentId + " not found."));

            return;
        }

        FilenAPI.trashItem(FilenDocumentsProviderUtils.getAPIKey(), documentId, item.type, new APIRequest.APICallback() {
            @Override
            public void onSuccess (JSONObject result) {
                try {
                    if (!result.getBoolean("status")) {
                        callback.onResult(new Exception(result.getString("code")));

                        return;
                    }

                    deleteItemFromSQLiteRecursive(documentId);

                    callback.onResult(null);
                } catch (Exception e) {
                    callback.onResult(e);
                }
            }

            @Override
            public void onError(Throwable throwable) {
                callback.onResult(throwable);
            }
        });
    }

    public static void createFile (Context context, String parentUUID, String uuid, String name, ErrorCallback callback) {
        RandomAccessFile tempFileHandle = null;
        RandomAccessFile downloadFileHandle = null;
        File tempFile = null;

        try {
            final File tempFileDir = new File(context.getFilesDir(), "documentsProvider/temp/" + UUID.randomUUID().toString());

            if (!tempFileDir.exists()) {
                tempFileDir.mkdirs();
            }

            tempFile = new File(tempFileDir, name);

            if (!tempFile.createNewFile()) {
                throw new Exception("Could not create temporary file.");
            }

            tempFileHandle = new RandomAccessFile(tempFile, "rw");

            final byte[] tempBytes = FilenCrypto.generateSecureRandomString(1).getBytes();

            tempFileHandle.write(tempBytes);

            final Object[] uploadResult = uploadFile(tempFile, parentUUID, uuid);
            final String region = (String) uploadResult[0];
            final String bucket = (String) uploadResult[1];
            final String key = (String) uploadResult[2];
            final long size = (long) uploadResult[3];
            final long chunks = (long) uploadResult[4];
            final int version = (int) uploadResult[5];

            SQLiteHelper.getInstance().execSQL(
                    "INSERT OR REPLACE INTO `items` (`uuid`, `parent`, `name`, `type`, `mime`, `size`, `timestamp`, `lastModified`, `key`, `chunks`, `region`, `bucket`, `version`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    new Object[] {
                            uuid,
                            parentUUID,
                            name,
                            "file",
                            getMimeTypeFromName(name),
                            size,
                            System.currentTimeMillis(),
                            System.currentTimeMillis(),
                            key,
                            chunks,
                            region,
                            bucket,
                            version
                    }
            );

            final Item item = getItemFromDocumentId(uuid);

            if (item != null) {
                final File downloadFile = new File(getItemLocalPath(context, item));

                downloadFileHandle = new RandomAccessFile(downloadFile, "rw");

                downloadFileHandle.write(tempBytes);
            }

            callback.onResult(null);
        } catch (Exception e) {
            callback.onResult(e);
        } finally {
            if (tempFileHandle != null) {
                try {
                    tempFileHandle.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            if (downloadFileHandle != null) {
                try {
                    downloadFileHandle.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            if (tempFile != null) {
                try {
                    tempFile.delete();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    public static void createFolder (String parentUUID, String uuid, String name, ErrorCallback callback) {
        Log.d("FilenDocumentsProvider", "createFolder: " + parentUUID + ", name: " + name);

        try {
            final JSONObject nameJSONObject = new JSONObject();

            nameJSONObject.put("name", name);

            final String nameJSON = nameJSONObject.toString();
            final String[] masterKeys = getMasterKeys();
            final String lastMasterKey = masterKeys[masterKeys.length - 1];
            final String nameEncrypted = FilenCrypto.encryptMetadata(nameJSON, lastMasterKey);
            final String nameHashed = FilenCrypto.hashFn(name);

            FilenAPI.createFolder(getAPIKey(), uuid, nameEncrypted, nameHashed, parentUUID, new APIRequest.APICallback() {
                @Override
                public void onSuccess (JSONObject result) {
                    try {
                        if (!result.getBoolean("status")) {
                            callback.onResult(new Exception(result.getString("code")));

                            return;
                        }

                        SQLiteHelper.getInstance().execSQL(
                                "INSERT OR REPLACE INTO `items` (`uuid`, `parent`, `name`, `type`, `mime`, `size`, `timestamp`, `lastModified`, `key`, `chunks`, `region`, `bucket`, `version`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                new Object[]{
                                        uuid,
                                        parentUUID,
                                        name,
                                        "folder",
                                        "",
                                        0,
                                        System.currentTimeMillis(),
                                        System.currentTimeMillis(),
                                        "",
                                        0,
                                        "",
                                        "",
                                        0
                                }
                        );

                        checkIfItemParentIsShared("folder", parentUUID, new CheckIfItemParentIsSharedMetadata(uuid, name, 0, "", 0, ""));

                        callback.onResult(null);
                    } catch (Exception e) {
                        callback.onResult(e);
                    }
                }

                @Override
                public void onError (Throwable throwable) {
                    callback.onResult(throwable);
                }
            });
        } catch (Exception e) {
            callback.onResult(e);
        }
    }

    public static void updateFolderContent (String parentUUID, ErrorCallback callback) {
        Log.d("FilenDocumentsProvider", "updateFolderContent: " + parentUUID);

        final String defaultDriveUUID = getDefaultDriveUUID();

        if (defaultDriveUUID != null && defaultDriveUUID.length() > 0) {
            SQLiteHelper.getInstance().execSQL(
                    "INSERT OR IGNORE INTO `items` (`uuid`, `parent`, `name`, `type`, `mime`, `size`, `timestamp`, `lastModified`, `key`, `chunks`, `region`, `bucket`, `version`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    new Object[]{
                            defaultDriveUUID,
                            "root",
                            "Cloud Drive",
                            "folder",
                            "",
                            0,
                            System.currentTimeMillis(),
                            System.currentTimeMillis(),
                            "",
                            0,
                            "",
                            "",
                            0
                    }
            );
        }

        FilenAPI.fetchFolderContent(getAPIKey(), parentUUID, new APIRequest.APICallback() {
            @Override
            public void onSuccess (JSONObject result) {
                Cursor dbCursor = null;

                try {
                    if (!result.getBoolean("status")) {
                        callback.onResult(new Exception(result.getString("code")));

                        return;
                    }

                    final JSONObject data = result.getJSONObject("data");
                    final JSONArray files = data.getJSONArray("uploads");
                    final JSONArray folders = data.getJSONArray("folders");
                    final String[] masterKeys = getMasterKeys();

                    SQLiteHelper.getInstance().execSQL("DELETE FROM `items` WHERE `parent` = ?", new Object[]{ parentUUID });

                    for (int i = 0; i < files.length(); i++) {
                        final JSONObject file = files.getJSONObject(i);
                        FileMetadata decryptedFileMetadata = new FileMetadata("", 0, "", "", 0, "");

                        dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `name`, `size`, `mime`, `key`, `lastModified` FROM `decrypted_file_metadata` WHERE `used_metadata` = ?", new String[]{ file.getString("metadata") });

                        if (dbCursor.moveToFirst()) {
                            decryptedFileMetadata.name = dbCursor.getString(0);
                            decryptedFileMetadata.size = dbCursor.getLong(1);
                            decryptedFileMetadata.mime = dbCursor.getString(2);
                            decryptedFileMetadata.key = dbCursor.getString(3);
                            decryptedFileMetadata.lastModified = convertTimestampToMs(dbCursor.getLong(4));
                            decryptedFileMetadata.hash = "";
                        } else {
                            decryptedFileMetadata = FilenCrypto.decryptFileMetadata(file.getString("metadata"), masterKeys);

                            if (decryptedFileMetadata == null) {
                                continue;
                            }

                            SQLiteHelper.getInstance().execSQL(
                                    "INSERT OR IGNORE INTO `decrypted_file_metadata` (`uuid`, `name`, `size`, `mime`, `key`, `lastModified`, `used_metadata`) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                    new Object[]{
                                            file.getString("uuid"),
                                            decryptedFileMetadata.name,
                                            decryptedFileMetadata.size,
                                            decryptedFileMetadata.mime,
                                            decryptedFileMetadata.key,
                                            convertTimestampToMs(decryptedFileMetadata.lastModified),
                                            file.getString("metadata")
                                    }
                            );
                        }

                        if (decryptedFileMetadata.name.length() == 0 || decryptedFileMetadata.key.length() == 0) {
                            continue;
                        }

                        SQLiteHelper.getInstance().execSQL(
                                "INSERT OR IGNORE INTO `items` (`uuid`, `parent`, `name`, `type`, `mime`, `size`, `timestamp`, `lastModified`, `key`, `chunks`, `region`, `bucket`, `version`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                new Object[]{
                                        file.getString("uuid"),
                                        file.getString("parent"),
                                        decryptedFileMetadata.name,
                                        "file",
                                        decryptedFileMetadata.mime,
                                        decryptedFileMetadata.size,
                                        convertTimestampToMs(file.getLong("timestamp")),
                                        convertTimestampToMs(decryptedFileMetadata.lastModified),
                                        decryptedFileMetadata.key,
                                        file.getLong("chunks"),
                                        file.getString("region"),
                                        file.getString("bucket"),
                                        file.getInt("version")
                                }
                        );
                    }

                    for (int i = 0; i < folders.length(); i++) {
                        final JSONObject folder = folders.getJSONObject(i);
                        String decryptedFolderName = "";

                        dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `name` FROM `decrypted_folder_metadata` WHERE `used_metadata` = ?", new String[]{ folder.getString("name") });

                        if (dbCursor.moveToFirst()) {
                            decryptedFolderName = dbCursor.getString(0);
                        } else {
                            decryptedFolderName = FilenCrypto.decryptFolderName(folder.getString("name"), masterKeys);

                            if (decryptedFolderName == null) {
                                continue;
                            }

                            SQLiteHelper.getInstance().execSQL(
                                    "INSERT OR IGNORE INTO `decrypted_folder_metadata` (`uuid`, `name`, `used_metadata`) VALUES (?, ?, ?)",
                                    new Object[]{
                                            folder.getString("uuid"),
                                            decryptedFolderName,
                                            folder.getString("name")
                                    }
                            );
                        }

                        if (decryptedFolderName.length() == 0) {
                            continue;
                        }

                        SQLiteHelper.getInstance().execSQL(
                                "INSERT OR IGNORE INTO `items` (`uuid`, `parent`, `name`, `type`, `mime`, `size`, `timestamp`, `lastModified`, `key`, `chunks`, `region`, `bucket`, `version`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                new Object[]{
                                        folder.getString("uuid"),
                                        folder.getString("parent"),
                                        decryptedFolderName,
                                        "folder",
                                        "",
                                        0,
                                        convertTimestampToMs(folder.getLong("timestamp")),
                                        convertTimestampToMs(folder.getLong("timestamp")),
                                        "",
                                        0,
                                        "",
                                        "",
                                        0
                                }
                        );
                    }

                    callback.onResult(null);
                } catch (JSONException e) {
                    callback.onResult(e);
                } finally {
                    if (dbCursor != null) {
                        dbCursor.close();
                    }
                }
            }

            @Override
            public void onError (Throwable throwable) {
                callback.onResult(throwable);
            }
        });
    }

    @Nullable
    public static Item getItemFromDocumentId (String documentId) {
        try (Cursor dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `uuid`, `parent`, `name`, `type`, `mime`, `size`, `timestamp`, `lastModified`, `key`, `chunks`, `region`, `bucket`, `version` FROM `items` WHERE `uuid` = ?", new String[] { documentId })) {
            if (!dbCursor.moveToNext()) {
                return null;
            }

            final Item item = new Item(
                    dbCursor.getString(0),
                    dbCursor.getString(1),
                    dbCursor.getString(2),
                    dbCursor.getString(3),
                    dbCursor.getString(4),
                    dbCursor.getLong(5),
                    dbCursor.getLong(6),
                    dbCursor.getLong(7),
                    dbCursor.getString(8),
                    dbCursor.getLong(9),
                    dbCursor.getString(10),
                    dbCursor.getString(11),
                    dbCursor.getInt(12)
            );

            dbCursor.close();

            return item;
        } catch (Exception e) {
            Log.d("FilenDocumentsProvider", "getItemFromDocumentId error: " + e.getMessage());

            return null;
        }
    }

    public static String getItemThumbnailLocalPath (Context context, Item item) {
        final File outputFileDir = new File(context.getFilesDir(), "documentsProvider/thumbnailImages/" + item.uuid);

        if (!outputFileDir.exists()) {
            outputFileDir.mkdirs();
        }

        final File outputFile = new File(outputFileDir, item.name);

        return outputFile.getAbsolutePath();
    }

    public static String getItemDownloadLocalPath (Context context, Item item) {
        final File outputFileDir = new File(context.getFilesDir(), "documentsProvider/temp/" + item.uuid);

        if (!outputFileDir.exists()) {
            outputFileDir.mkdirs();
        }

        final File outputFile = new File(outputFileDir, item.name);

        return outputFile.getAbsolutePath();
    }

    public static String getItemLocalPath (Context context, Item item) {
        final File outputFileDir = new File(context.getFilesDir(), "documentsProvider/downloadedFiles/" + item.uuid);

        if (!outputFileDir.exists()) {
            outputFileDir.mkdirs();
        }

        final File outputFile = new File(outputFileDir, item.name);

        return outputFile.getAbsolutePath();
    }

    public static void appendFileToFile (File source, File destination) throws IOException {
        Log.d("FilenDocumentsProvider", "appendFileToFile: " + source + ", " + destination);

        try (final FileOutputStream out = new FileOutputStream(destination, true); final FileInputStream in = new FileInputStream(source)) {
            byte[] buffer = new byte[1024];
            int bytesRead;

            while ((bytesRead = in.read(buffer)) != -1) {
                if (bytesRead > 0) {
                    out.write(buffer);
                }
            }
        }
    }

    public static File downloadFile (Context context, Item item, boolean returnEarly, long maxChunks, @Nullable CancellationSignal signal) throws Exception {
        Log.d("FilenDocumentsProvider", "downloadFile: " + item + ", " + returnEarly + ", " + maxChunks);

        final File outputFile = new File(getItemLocalPath(context, item));
        final File downloadFile = new File(getItemDownloadLocalPath(context, item));

        if (outputFile.exists() || returnEarly) {
            return outputFile;
        }

        if (downloadFileSemaphore.get(item.uuid) == null) {
            downloadFileSemaphore.put(item.uuid, new Semaphore(1));
        }

        Objects.requireNonNull(downloadFileSemaphore.get(item.uuid)).acquire();

        try {
            final long chunksToDownload = Math.min(maxChunks, item.chunks);
            final AtomicInteger currentWriteIndex = new AtomicInteger(0);
            final Object writeLock = new Object();
            final Object lock = new Object();
            final AtomicInteger chunksDownloaded = new AtomicInteger(0);
            final AtomicBoolean didError = new AtomicBoolean(false);

            final Thread thread = new Thread(() -> {
                try {
                    for (int i = 0; i < chunksToDownload; i++) {
                        int index = i;

                        downloadThreadPool.submit(() -> {
                            if (signal != null) {
                                if (signal.isCanceled()) {
                                    Thread.currentThread().interrupt();

                                    didError.set(true);

                                    return;
                                }
                            }

                            try {
                                final File downloadedChunkFile = FilenAPI.downloadFileChunk(context, item, index);
                                final File decryptedChunkFile = FilenCrypto.streamDecryptData(downloadedChunkFile, item.key, item.version);

                                synchronized (writeLock) {
                                    while (currentWriteIndex.get() != index) {
                                        writeLock.wait();
                                    }
                                }

                                if (index == 0) {
                                    if (downloadFile.exists()) {
                                        if (!downloadFile.delete()) {
                                            throw new Exception("Could not delete file.");
                                        }
                                    }

                                    if (!decryptedChunkFile.renameTo(downloadFile)) {
                                        throw new Exception("Could not move decrypted chunk file to downloadFile file.");
                                    }
                                } else {
                                    if (!downloadFile.exists()) {
                                        throw new Exception("downloadFile file does not exist.");
                                    }

                                    appendFileToFile(decryptedChunkFile, downloadFile);
                                }

                                currentWriteIndex.set(index + 1);

                                synchronized (writeLock) {
                                    writeLock.notifyAll();
                                }
                            } catch (Exception e) {
                                e.printStackTrace();

                                didError.set(true);

                                Log.d("FilenDocumentsProvider", "downloadFile error: " + e.getMessage());
                            } finally {
                                chunksDownloaded.set(chunksDownloaded.get() + 1);

                                synchronized (lock) {
                                    if (chunksDownloaded.get() >= chunksToDownload) {
                                        lock.notifyAll();
                                    }
                                }
                            }
                        });
                    }

                    synchronized (lock) {
                        while (chunksDownloaded.get() < chunksToDownload) {
                            lock.wait();
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();

                    didError.set(true);

                    Log.d("FilenDocumentsProvider", "downloadFile error: " + e.getMessage());
                }
            });

            thread.start();
            thread.join();

            Objects.requireNonNull(downloadFileSemaphore.get(item.uuid)).release();

            if (didError.get()) {
                throw new Exception("Error while downloading file");
            }

            if (!downloadFile.renameTo(outputFile)) {
                throw new Exception("Could not rename downloadFile to outputFile");
            }

            return outputFile;
        } catch (Exception e) {
            Objects.requireNonNull(downloadFileSemaphore.get(item.uuid)).release();

            throw e;
        }
    }

    public static void encryptAndUploadChunk (File inputFile, long chunkSize, String uuid, int index, String uploadKey, String parent, String key, APIRequest.UploadCallback callback) throws Exception {
        final Object[] encryptedDataResult = FilenCrypto.streamEncryptData(inputFile, chunkSize, key, index);
        final File outputFile = (File) encryptedDataResult[0];
        final String outputFileChecksum = (String) encryptedDataResult[1];

        Log.d("FilenDocumentsProvider", "encryptAndUploadChunk: " + inputFile.getAbsolutePath() + ", " + chunkSize + ", " + uuid + ", " + index + ", " + uploadKey + ", " + parent + ", " + outputFileChecksum + ", " + inputFile.length() + ", " + outputFile.length());

        FilenAPI.uploadFileChunk(getAPIKey(), outputFile, uuid, index, uploadKey, parent, outputFileChecksum, new APIRequest.UploadCallback() {
            @Override
            public void onSuccess(JSONObject result) {
                callback.onSuccess(result);
            }

            @Override
            public void onError(Throwable throwable) {
                callback.onError(throwable);
            }
        });
    }

    public static void markUploadAsDone (String uuid, String nameEncrypted, String nameHashed, String sizeEncrypted, long chunks, String mimeEncrypted, String rm, String encryptedMetadata, int version, String uploadKey) throws Exception {
        final AtomicBoolean done = new AtomicBoolean(false);
        final AtomicBoolean didError = new AtomicBoolean(false);
        final Object lock = new Object();

        final Thread thread = new Thread(() -> {
            try {
                FilenAPI.markUploadAsDone(getAPIKey(), uuid, nameEncrypted, nameHashed, sizeEncrypted, chunks, mimeEncrypted, rm, encryptedMetadata, version, uploadKey, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid markUploadAsDone status code: " + result.getString("code"));
                            }
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "markUploadAsDone error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                if (done.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        done.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "markUploadAsDone error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (done.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "markUploadAsDone error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could not mark upload as done " + uuid);
        }
    }

    public static Object[] uploadFile (File inputFile, String parent, String uuid) throws Exception {
        Log.d("FilenDocumentsProvider", "uploadFile: " + inputFile.getAbsolutePath() + ", " + parent + ", " + uuid);

        if (!inputFile.exists()) {
            throw new Exception("Input file does not exist.");
        }

        final String semaphoreKey = inputFile.getAbsolutePath() + ":" + parent;

        if (uploadFileSemaphore.get(semaphoreKey) == null) {
            uploadFileSemaphore.put(semaphoreKey, new Semaphore(1));
        }

        final String inputFileName = inputFile.getName();

        Objects.requireNonNull(uploadFileSemaphore.get(semaphoreKey)).acquire();

        try {
            final String[] masterKeys = getMasterKeys();
            final String lastMasterKey = masterKeys[masterKeys.length - 1];
            final long inputFileSize = inputFile.length();
            final long inputFileLastModified = inputFile.lastModified();
            final String key = FilenCrypto.generateSecureRandomString(32);
            final int encryptionVersion = 2;

            if (inputFileSize <= 0) {
                throw new Exception("0 byte files not supported yet.");
            }

            long dummyOffset = 0;
            long fileChunks = 0;
            final long chunkSize = 1024 * 1024;
            final String mimeType = getMimeTypeFromName(inputFileName);

            while (dummyOffset < inputFileSize) {
                fileChunks += 1;
                dummyOffset += chunkSize;
            }

            final JSONObject metadataJSONObject = new JSONObject();

            metadataJSONObject.put("name", inputFileName);
            metadataJSONObject.put("size", inputFileSize);
            metadataJSONObject.put("mime", mimeType);
            metadataJSONObject.put("key", key);
            metadataJSONObject.put("lastModified", inputFileLastModified);

            final String metadataJSON = metadataJSONObject.toString();

            final String rm = FilenCrypto.generateSecureRandomString(32);
            final String uploadKey = FilenCrypto.generateSecureRandomString(32);
            final String nameEncrypted = FilenCrypto.encryptMetadata(inputFileName, key);
            final String mimeEncrypted = FilenCrypto.encryptMetadata(mimeType, key);
            final String nameHashed = FilenCrypto.hashFn(inputFileName);
            final String sizeEncrypted = FilenCrypto.encryptMetadata(String.valueOf(inputFileSize), key);
            final String metadata = FilenCrypto.encryptMetadata(metadataJSON, lastMasterKey);

            final AtomicReference<String> region = new AtomicReference<>("");
            final AtomicReference<String> bucket = new AtomicReference<>("");
            final Object lock = new Object();
            final AtomicInteger uploadedChunks = new AtomicInteger(0);
            long finalFileChunks = fileChunks;
            final AtomicBoolean didError = new AtomicBoolean(false);

            Log.d("FilenDocumentsProvider", "uploadFile: " + inputFile.getAbsolutePath() + ", " + parent + ", " + uuid + ", " + finalFileChunks + ", " + inputFileName + ", " + inputFileSize);

            final Thread uploadThread = new Thread(() -> {
                try {
                    for (int i = 0; i < finalFileChunks; i++) {
                        final int index = i;

                        uploadThreadPool.submit(() -> {
                            try {
                                encryptAndUploadChunk(inputFile, chunkSize, uuid, index, uploadKey, parent, key, new APIRequest.UploadCallback() {
                                    @Override
                                    public void onSuccess (JSONObject result) {
                                        try {
                                            if (!result.getBoolean("status")) {
                                                throw new Exception("Invalid upload status code: " + result.getString("code"));
                                            }

                                            final JSONObject data = result.getJSONObject("data");

                                            region.set(data.getString("region"));
                                            bucket.set(data.getString("bucket"));

                                            Log.d("FilenDocumentsProvider", "encryptAndUploadChunk result: " + uuid + ", " + index + ", " + data.getString("region") + ", " + data.getString("bucket"));
                                        } catch (Exception e) {
                                            didError.set(true);

                                            e.printStackTrace();

                                            Log.d("FilenDocumentsProvider", "uploadFile error: " + e.getMessage());
                                        } finally {
                                            uploadedChunks.set(uploadedChunks.get() + 1);

                                            synchronized (lock) {
                                                if (uploadedChunks.get() >= finalFileChunks) {
                                                    lock.notifyAll();
                                                }
                                            }
                                        }
                                    }

                                    @Override
                                    public void onError (Throwable throwable) {
                                        didError.set(true);

                                        throwable.printStackTrace();

                                        Log.d("FilenDocumentsProvider", "uploadFile error: " + throwable.getMessage());

                                        uploadedChunks.set(uploadedChunks.get() + 1);

                                        synchronized (lock) {
                                            if (uploadedChunks.get() >= finalFileChunks) {
                                                lock.notifyAll();
                                            }
                                        }
                                    }
                                });
                            } catch (Exception e) {
                                didError.set(true);

                                e.printStackTrace();

                                Log.d("FilenDocumentsProvider", "uploadFile error: " + e.getMessage());

                                uploadedChunks.set(uploadedChunks.get() + 1);

                                synchronized (lock) {
                                    if (uploadedChunks.get() >= finalFileChunks) {
                                        lock.notifyAll();
                                    }
                                }
                            }
                        });
                    }

                    synchronized (lock) {
                        while (uploadedChunks.get() < finalFileChunks) {
                            lock.wait();
                        }
                    }
                } catch (Exception e) {
                    didError.set(true);

                    e.printStackTrace();

                    Log.d("FilenDocumentsProvider", "uploadFile error: " + e.getMessage());
                }
            });

            uploadThread.start();
            uploadThread.join();

            if (didError.get() || region.get().length() == 0 || bucket.get().length() == 0) {
                throw new Exception("Could not upload chunk.");
            }

            markUploadAsDone(uuid, nameEncrypted, nameHashed, sizeEncrypted, finalFileChunks, mimeEncrypted, rm, metadata, encryptionVersion, uploadKey);

            checkIfItemParentIsShared("file", parent, new CheckIfItemParentIsSharedMetadata(uuid, inputFileName, inputFileSize, mimeType, inputFileLastModified, ""));

            Objects.requireNonNull(uploadFileSemaphore.get(semaphoreKey)).release();

            return new Object[] {
                    region.get(),
                    bucket.get(),
                    key,
                    inputFileSize,
                    finalFileChunks,
                    encryptionVersion
            };
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "uploadFile error: " + e.getMessage());

            Objects.requireNonNull(uploadFileSemaphore.get(semaphoreKey)).release();

            throw e;
        }
    }

    public static void renameFolder (String uuid, String newName) throws Exception {
        final AtomicBoolean done = new AtomicBoolean(false);
        final Object lock = new Object();
        final AtomicBoolean didError = new AtomicBoolean(false);

        final JSONObject folderNameJSONObject = new JSONObject();

        folderNameJSONObject.put("name", newName);

        final String folderNameJSON = folderNameJSONObject.toString();

        final String[] masterKeys = getMasterKeys();
        final String lastMasterKey = masterKeys[masterKeys.length - 1];
        final String nameEncrypted = FilenCrypto.encryptMetadata(folderNameJSON, lastMasterKey);
        final String nameHashed = FilenCrypto.hashFn(newName);

        final Thread thread = new Thread(() -> {
            try {
                FilenAPI.renameFolder(getAPIKey(), uuid, nameEncrypted, nameHashed, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid renameFolder status code: " + result.getString("code"));
                            }

                            checkIfItemIsSharedForRename(uuid, "folder", new CheckIfItemParentIsSharedMetadata(uuid, newName, 0, "", 0, ""));
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "renameFolder error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                if (done.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        done.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "renameFolder error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (done.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "renameFolder error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could not rename folder.");
        }
    }

    public static void renameFile (String uuid, String newName) throws Exception {
        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(uuid);

        if (item == null) {
            throw new Exception("Document " + uuid + " not found.");
        }

        final AtomicBoolean done = new AtomicBoolean(false);
        final Object lock = new Object();
        final AtomicBoolean didError = new AtomicBoolean(false);

        final JSONObject metadataJSONObject = new JSONObject();

        metadataJSONObject.put("name", newName);
        metadataJSONObject.put("size", item.size);
        metadataJSONObject.put("mime", item.mime);
        metadataJSONObject.put("key", item.key);
        metadataJSONObject.put("lastModified", item.lastModified);

        final String metadataJSON = metadataJSONObject.toString();

        final String[] masterKeys = getMasterKeys();
        final String lastMasterKey = masterKeys[masterKeys.length - 1];
        final String encryptMetadata = FilenCrypto.encryptMetadata(metadataJSON, lastMasterKey);
        final String nameEncrypted = FilenCrypto.encryptMetadata(newName, item.key);
        final String nameHashed = FilenCrypto.hashFn(newName);

        final Thread thread = new Thread(() -> {
            try {
                FilenAPI.renameFile(getAPIKey(), uuid, nameEncrypted, nameHashed, encryptMetadata, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid renameFile status code: " + result.getString("code"));
                            }

                            checkIfItemIsSharedForRename(uuid, "file", new CheckIfItemParentIsSharedMetadata(uuid, newName, item.size, item.mime, item.lastModified, ""));
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "renameFile error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                if (done.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        done.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "renameFile error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (done.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "renameFile error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could not rename file.");
        }
    }

    public static void moveItem (Item item, String parent) throws Exception {
        final AtomicBoolean done = new AtomicBoolean(false);
        final Object lock = new Object();
        final AtomicBoolean didError = new AtomicBoolean(false);

        final Thread thread = new Thread(() -> {
            try {
                FilenAPI.moveItem(getAPIKey(), item.type, item.uuid, parent, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid moveItem status code: " + result.getString("code"));
                            }

                            if (item.type.equals("file")) {
                                checkIfItemParentIsShared(item.type, parent, new CheckIfItemParentIsSharedMetadata(item.uuid, item.name, item.size, item.mime, item.lastModified, ""));
                            } else {
                                checkIfItemParentIsShared(item.type, parent, new CheckIfItemParentIsSharedMetadata(item.uuid, item.name, 0, "", 0, ""));
                            }
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "moveItem error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                if (done.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        done.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "moveItem error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (done.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "moveItem error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could not move document.");
        }
    }

    public static JSONObject getFolderContents (String uuid, String type, String linkUUID, boolean linkHasPassword, String linkPassword, String linkSalt) throws Exception {
        final AtomicBoolean done = new AtomicBoolean(false);
        final AtomicBoolean didError = new AtomicBoolean(false);
        final AtomicReference<JSONObject> data = new AtomicReference<>(null);
        final Object lock = new Object();

        final Thread thread = new Thread(() -> {
            try {
                FilenAPI.getFolderContents(getAPIKey(), uuid, type, linkUUID, linkHasPassword, linkPassword, linkSalt, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid getFolderContents status code: " + result.getString("code"));
                            }

                            final JSONObject resultData = result.getJSONObject("data");

                            data.set(resultData);
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "getFolderContents error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                if (done.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        done.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "getFolderContents error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (done.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "getFolderContents error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get() || data.get() == null) {
            throw new Exception("Could not get folder contents for folder " + uuid);
        }

        return data.get();
    }

    public static void shareItem (String uuid, String parent, String email, String type, String metadata) throws Exception {
        final AtomicBoolean done = new AtomicBoolean(false);
        final AtomicBoolean didError = new AtomicBoolean(false);
        final Object lock = new Object();

        final Thread thread = new Thread(() -> {
            try {
                FilenAPI.shareItem(getAPIKey(), uuid, parent, email, type, metadata, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid shareItem status code: " + result.getString("code"));
                            }
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "shareItem error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                if (done.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        done.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "shareItem error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (done.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "shareItem error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could not share item " + uuid);
        }
    }

    public static void addItemToPublicLink (String uuid, String parent, String linkUUID, String type, String metadata, String key, String expiration) throws Exception {
        final AtomicBoolean done = new AtomicBoolean(false);
        final AtomicBoolean didError = new AtomicBoolean(false);
        final Object lock = new Object();

        final Thread thread = new Thread(() -> {
            try {
                FilenAPI.addItemToPublicLink(getAPIKey(), uuid, parent, linkUUID, type, metadata, key, expiration, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid addItemToPublicLink status code: " + result.getString("code"));
                            }
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "addItemToPublicLink error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                if (done.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        done.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "addItemToPublicLink error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (done.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "addItemToPublicLink error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could add item to public link " + uuid);
        }
    }

    public static Object[] isSharingOrLinkingFolder (String uuid) throws Exception {
        final String apiKey = getAPIKey();
        final Object lock = new Object();
        final AtomicReference<JSONObject> isSharingFolder = new AtomicReference<>(null);
        final AtomicReference<JSONObject> isLinkingFolder = new AtomicReference<>(null);
        final AtomicBoolean isLinkingFolderCheckDone = new AtomicBoolean(false);
        final AtomicBoolean isSharingFolderCheckDone = new AtomicBoolean(false);
        final AtomicBoolean didError = new AtomicBoolean(false);

        final Thread isSharingItemCheckThread = new Thread(() -> {
            try {
                FilenAPI.isSharingFolder(apiKey, uuid, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid isSharingFolder status code: " + result.getString("code"));
                            }

                            final JSONObject data = result.getJSONObject("data");

                            isSharingFolder.set(data);
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "isSharingFolder error: " + e.getMessage());
                        } finally {
                            isSharingFolderCheckDone.set(true);

                            synchronized (lock) {
                                if (isLinkingFolderCheckDone.get() && isSharingFolderCheckDone.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        isSharingFolderCheckDone.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "isSharingFolder error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (isLinkingFolderCheckDone.get() && isSharingFolderCheckDone.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                FilenAPI.isLinkingFolder(apiKey, uuid, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid isLinkingFolder status code: " + result.getString("code"));
                            }

                            final JSONObject data = result.getJSONObject("data");

                            isLinkingFolder.set(data);
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "isLinkingFolder error: " + e.getMessage());
                        } finally {
                            isLinkingFolderCheckDone.set(true);

                            synchronized (lock) {
                                if (isLinkingFolderCheckDone.get() && isSharingFolderCheckDone.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        isLinkingFolderCheckDone.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "isLinkingFolder error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (isLinkingFolderCheckDone.get() && isSharingFolderCheckDone.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!isLinkingFolderCheckDone.get() && !isSharingFolderCheckDone.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "isSharingOrLinkingFolder error: " + e.getMessage());
            }
        });

        isSharingItemCheckThread.start();
        isSharingItemCheckThread.join();

        if (!isSharingFolderCheckDone.get() || didError.get() || !isLinkingFolderCheckDone.get() || isSharingFolder.get() == null || isLinkingFolder.get() == null) {
            throw new Exception("Could not check if folder is shared or linked.");
        }

        return new Object[] {
                isSharingFolder.get(),
                isLinkingFolder.get()
        };
    }

    public static Object[] isSharingOrLinkingItem (String uuid) throws Exception {
        final String apiKey = getAPIKey();
        final Object lock = new Object();
        final AtomicReference<JSONObject> isSharingItem = new AtomicReference<>(null);
        final AtomicReference<JSONObject> isLinkingItem = new AtomicReference<>(null);
        final AtomicBoolean isLinkingItemCheckDone = new AtomicBoolean(false);
        final AtomicBoolean isSharingItemCheckDone = new AtomicBoolean(false);
        final AtomicBoolean didError = new AtomicBoolean(false);

        final Thread isSharingItemCheckThread = new Thread(() -> {
            try {
                FilenAPI.isSharingItem(apiKey, uuid, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid isSharingItem status code: " + result.getString("code"));
                            }

                            final JSONObject data = result.getJSONObject("data");

                            isSharingItem.set(data);
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "isSharingItem error: " + e.getMessage());
                        } finally {
                            isSharingItemCheckDone.set(true);

                            synchronized (lock) {
                                if (isSharingItemCheckDone.get() && isLinkingItemCheckDone.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        isSharingItemCheckDone.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "isSharingItem error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (isSharingItemCheckDone.get() && isLinkingItemCheckDone.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                FilenAPI.isLinkingItem(apiKey, uuid, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid isLinkingItem status code: " + result.getString("code"));
                            }

                            final JSONObject data = result.getJSONObject("data");

                            isLinkingItem.set(data);
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "isLinkingItem error: " + e.getMessage());
                        } finally {
                            isLinkingItemCheckDone.set(true);

                            synchronized (lock) {
                                if (isSharingItemCheckDone.get() && isLinkingItemCheckDone.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        isLinkingItemCheckDone.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "isLinkingItem error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (isSharingItemCheckDone.get() && isLinkingItemCheckDone.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!isLinkingItemCheckDone.get() && !isSharingItemCheckDone.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "isSharingOrLinkingItem error: " + e.getMessage());
            }
        });

        isSharingItemCheckThread.start();
        isSharingItemCheckThread.join();

        if (!isSharingItemCheckDone.get() || didError.get() || !isLinkingItemCheckDone.get() || isSharingItem.get() == null || isLinkingItem.get() == null) {
            throw new Exception("Could not check if item is shared or linked.");
        }

        return new Object[] {
                isSharingItem.get(),
                isLinkingItem.get()
        };
    }

    public static void renameSharedItem (String uuid, long receiverId, String metadata) throws Exception {
        final AtomicBoolean done = new AtomicBoolean(false);
        final AtomicBoolean didError = new AtomicBoolean(false);
        final Object lock = new Object();

        final Thread thread = new Thread(() -> {
            try {
                FilenAPI.renameSharedItem(getAPIKey(), uuid, receiverId, metadata, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid renameSharedItem status code: " + result.getString("code"));
                            }
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "renameSharedItem error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                if (done.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        done.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "renameSharedItem error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (done.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "renameSharedItem error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could not rename shared item " + uuid);
        }
    }

    public static void renameItemInPublicLink (String uuid, String linkUUID, String metadata) throws Exception {
        final AtomicBoolean done = new AtomicBoolean(false);
        final AtomicBoolean didError = new AtomicBoolean(false);
        final Object lock = new Object();

        final Thread thread = new Thread(() -> {
            try {
                FilenAPI.renameItemInPublicLink(getAPIKey(), uuid, linkUUID, metadata, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid renameItemInPublicLink status code: " + result.getString("code"));
                            }
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "renameItemInPublicLink error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                if (done.get()) {
                                    lock.notifyAll();
                                }
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didError.set(true);
                        done.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "renameItemInPublicLink error: " + throwable.getMessage());

                        synchronized (lock) {
                            if (done.get()) {
                                lock.notifyAll();
                            }
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                didError.set(true);

                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "renameItemInPublicLink error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could not rename linked item " + uuid);
        }
    }

    public static void checkIfItemIsSharedForRename (String uuid, String type, CheckIfItemParentIsSharedMetadata itemMetadata) throws Exception {
        final String[] masterKeys = getMasterKeys();
        final Object[] isSharingOrLinkingItemResult = isSharingOrLinkingItem(uuid);
        final JSONObject isSharingItem = (JSONObject) isSharingOrLinkingItemResult[0];
        final JSONObject isLinkingItem = (JSONObject) isSharingOrLinkingItemResult[1];

        if (!isSharingItem.getBoolean("sharing") && !isLinkingItem.getBoolean("link")) {
            return;
        }

        final JSONObject metadataJSONObject = new JSONObject();

        if (type.equals("file")) {
            metadataJSONObject.put("name", itemMetadata.name);
            metadataJSONObject.put("size", itemMetadata.size);
            metadataJSONObject.put("mime", itemMetadata.mime);
            metadataJSONObject.put("key", itemMetadata.key);
            metadataJSONObject.put("lastModified", itemMetadata.lastModified);
            metadataJSONObject.put("hash", itemMetadata.hash);
        } else {
            metadataJSONObject.put("name", itemMetadata.name);
        }

        final String metadata = metadataJSONObject.toString();

        if (isSharingItem.getBoolean("sharing")) {
            final JSONObject isSharingItemData = isSharingItem.getJSONObject("data");
            final JSONArray isSharingItemUsers = isSharingItemData.getJSONArray("users");

            for (int i = 0; i < isSharingItemUsers.length(); i++) {
                final JSONObject user = isSharingItemUsers.getJSONObject(i);
                final String encryptedMetadata = FilenCrypto.encryptMetadataPublicKey(metadata, user.getString("publicKey"));

                renameSharedItem(uuid, user.getLong("id"), encryptedMetadata);
            }
        }

        if (isLinkingItem.getBoolean("link")) {
            final JSONObject isLinkingItemData = isLinkingItem.getJSONObject("data");
            final JSONArray isLinkingItemLinks = isLinkingItemData.getJSONArray("links");

            for (int i = 0; i < isLinkingItemLinks.length(); i++) {
                final JSONObject link = isLinkingItemLinks.getJSONObject(i);
                final String linkKey = FilenCrypto.decryptFolderLinkKey(link.getString("linkKey"), masterKeys);

                if (linkKey.length() > 16) {
                    final String encryptedMetadata = FilenCrypto.encryptMetadata(metadata, linkKey);

                    renameItemInPublicLink(uuid, link.getString("linkKey"), encryptedMetadata);
                }
            }
        }
    }

    public static void checkIfItemParentIsShared (String type, String parent, CheckIfItemParentIsSharedMetadata itemMetadata) throws Exception {
        final String[] masterKeys = getMasterKeys();
        final Object[] isSharingOrLinkingFolderResult = isSharingOrLinkingFolder(parent);
        final JSONObject isSharingItem = (JSONObject) isSharingOrLinkingFolderResult[0];
        final JSONObject isLinkingItem = (JSONObject) isSharingOrLinkingFolderResult[1];

        if (!isSharingItem.getBoolean("sharing") && !isLinkingItem.getBoolean("link")) {
            return;
        }

        final List<ItemToShareFile> filesToShare = new ArrayList<>();
        final List<ItemToShareFolder> foldersToShare = new ArrayList<>();

        if (isSharingItem.getBoolean("sharing")) {
            if (type.equals("file")) {
                filesToShare.add(new ItemToShareFile(
                        itemMetadata.uuid,
                        parent,
                        new FileMetadata(
                                itemMetadata.name,
                                itemMetadata.size,
                                itemMetadata.mime,
                                itemMetadata.key,
                                itemMetadata.lastModified,
                                itemMetadata.hash
                        )
                ));
            } else {
                foldersToShare.add(new ItemToShareFolder(
                        itemMetadata.uuid,
                        parent,
                        new FolderMetadata(
                                itemMetadata.name
                        )
                ));

                final JSONObject folderContentData = getFolderContents(itemMetadata.uuid, "normal", "", false, "", "");
                final JSONArray folderFiles = folderContentData.getJSONArray("files");
                final JSONArray folderFolders = folderContentData.getJSONArray("folders");

                for (int i = 0; i < folderFiles.length(); i++) {
                    final JSONObject file = folderFiles.getJSONObject(i);
                    final FileMetadata decryptedMetadata = FilenCrypto.decryptFileMetadata(file.getString("metadata"), masterKeys);

                    if (decryptedMetadata != null && decryptedMetadata.name.length() > 0 && decryptedMetadata.key.length() > 0) {
                        filesToShare.add(new ItemToShareFile(
                                file.getString("uuid"),
                                file.getString("parent"),
                                decryptedMetadata
                        ));
                    }
                }

                for (int i = 0; i < folderFolders.length(); i++) {
                    final JSONObject folder = folderFolders.getJSONObject(i);

                    if (!folder.getString("uuid").equals(itemMetadata.uuid) && !folder.getString("parent").equals("base")) {
                        final FolderMetadata decryptedFolderMetadata = new FolderMetadata(FilenCrypto.decryptFolderName(folder.getString("name"), masterKeys));

                        if (decryptedFolderMetadata.name.length() > 0) {
                            foldersToShare.add(new ItemToShareFolder(
                                    folder.getString("uuid"),
                                    i == 0 ? "none" : folder.getString("parent"),
                                    decryptedFolderMetadata
                            ));
                        }
                    }
                }
            }

            final JSONObject isSharingItemData = isSharingItem.getJSONObject("data");
            final JSONArray isSharingItemUsers = isSharingItemData.getJSONArray("users");

            for (final ItemToShareFile file: filesToShare) {
                final JSONObject metadataJSONObject = new JSONObject();

                metadataJSONObject.put("name", file.metadata.name);
                metadataJSONObject.put("size", file.metadata.size);
                metadataJSONObject.put("mime", file.metadata.mime);
                metadataJSONObject.put("key", file.metadata.key);
                metadataJSONObject.put("lastModified", file.metadata.lastModified);
                metadataJSONObject.put("hash", file.metadata.hash);

                final String metadata = metadataJSONObject.toString();

                for (int i = 0; i < isSharingItemUsers.length(); i++) {
                    final JSONObject user = isSharingItemUsers.getJSONObject(i);
                    final String encryptedMetadata = FilenCrypto.encryptMetadataPublicKey(metadata, user.getString("publicKey"));

                    shareItem(file.uuid, file.parent, user.getString("email"), "file", encryptedMetadata);
                }
            }

            for (final ItemToShareFolder folder: foldersToShare) {
                final JSONObject metadataJSONObject = new JSONObject();

                metadataJSONObject.put("name", folder.metadata.name);

                final String metadata = metadataJSONObject.toString();

                for (int i = 0; i < isSharingItemUsers.length(); i++) {
                    final JSONObject user = isSharingItemUsers.getJSONObject(i);
                    final String encryptedMetadata = FilenCrypto.encryptMetadataPublicKey(metadata, user.getString("publicKey"));

                    shareItem(folder.uuid, folder.parent, user.getString("email"), "file", encryptedMetadata);
                }
            }
        }

        if (isLinkingItem.getBoolean("link")) {
            if (type.equals("file")) {
                filesToShare.add(new ItemToShareFile(
                        itemMetadata.uuid,
                        parent,
                        new FileMetadata(
                                itemMetadata.name,
                                itemMetadata.size,
                                itemMetadata.mime,
                                itemMetadata.key,
                                itemMetadata.lastModified,
                                itemMetadata.hash
                        )
                ));
            } else {
                foldersToShare.add(new ItemToShareFolder(
                        itemMetadata.uuid,
                        parent,
                        new FolderMetadata(
                                itemMetadata.name
                        )
                ));

                final JSONObject folderContentData = getFolderContents(itemMetadata.uuid, "normal", "", false, "", "");
                final JSONArray folderFiles = folderContentData.getJSONArray("files");
                final JSONArray folderFolders = folderContentData.getJSONArray("folders");

                for (int i = 0; i < folderFiles.length(); i++) {
                    final JSONObject file = folderFiles.getJSONObject(i);
                    final FileMetadata decryptedMetadata = FilenCrypto.decryptFileMetadata(file.getString("metadata"), masterKeys);

                    if (decryptedMetadata != null && decryptedMetadata.name.length() > 0 && decryptedMetadata.key.length() > 0) {
                        filesToShare.add(new ItemToShareFile(
                                file.getString("uuid"),
                                file.getString("parent"),
                                decryptedMetadata
                        ));
                    }
                }

                for (int i = 0; i < folderFolders.length(); i++) {
                    final JSONObject folder = folderFolders.getJSONObject(i);

                    if (!folder.getString("uuid").equals(itemMetadata.uuid) && !folder.getString("parent").equals("base")) {
                        final FolderMetadata decryptedFolderMetadata = new FolderMetadata(FilenCrypto.decryptFolderName(folder.getString("name"), masterKeys));

                        if (decryptedFolderMetadata.name.length() > 0) {
                            foldersToShare.add(new ItemToShareFolder(
                                    folder.getString("uuid"),
                                    i == 0 ? "none" : folder.getString("parent"),
                                    decryptedFolderMetadata
                            ));
                        }
                    }
                }
            }

            final JSONObject isLinkingItemData = isLinkingItem.getJSONObject("data");
            final JSONArray isLinkingItemLinks = isLinkingItemData.getJSONArray("links");

            for (final ItemToShareFile file: filesToShare) {
                final JSONObject metadataJSONObject = new JSONObject();

                metadataJSONObject.put("name", file.metadata.name);
                metadataJSONObject.put("size", file.metadata.size);
                metadataJSONObject.put("mime", file.metadata.mime);
                metadataJSONObject.put("key", file.metadata.key);
                metadataJSONObject.put("lastModified", file.metadata.lastModified);
                metadataJSONObject.put("hash", file.metadata.hash);

                final String metadata = metadataJSONObject.toString();

                for (int i = 0; i < isLinkingItemLinks.length(); i++) {
                    final JSONObject link = isLinkingItemLinks.getJSONObject(i);
                    final String linkKey = FilenCrypto.decryptFolderLinkKey(link.getString("linkKey"), masterKeys);

                    if (linkKey.length() > 16) {
                        final String encryptedMetadata = FilenCrypto.encryptMetadata(metadata, linkKey);

                        addItemToPublicLink(
                                file.uuid,
                                file.parent,
                                link.getString("linkUUID"),
                                "file",
                                encryptedMetadata,
                                link.getString("linkKey"),
                                "never"
                        );
                    }
                }
            }

            for (final ItemToShareFolder folder: foldersToShare) {
                final JSONObject metadataJSONObject = new JSONObject();

                metadataJSONObject.put("name", folder.metadata.name);

                final String metadata = metadataJSONObject.toString();

                for (int i = 0; i < isLinkingItemLinks.length(); i++) {
                    final JSONObject link = isLinkingItemLinks.getJSONObject(i);
                    final String linkKey = FilenCrypto.decryptFolderLinkKey(link.getString("linkKey"), masterKeys);

                    if (linkKey.length() > 16) {
                        final String encryptedMetadata = FilenCrypto.encryptMetadata(metadata, linkKey);

                        addItemToPublicLink(
                                folder.uuid,
                                folder.parent,
                                link.getString("linkUUID"),
                                "folder",
                                encryptedMetadata,
                                link.getString("linkKey"),
                                "never"
                        );
                    }
                }
            }
        }
    }

    public static MatrixCursor promptAuthenticationCursor (MatrixCursor result) {
        final MatrixCursor.RowBuilder row = result.newRow();

        row.add(DocumentsContract.Document.COLUMN_DOCUMENT_ID, "promptAuthenticationCursor");
        row.add(DocumentsContract.Document.COLUMN_DISPLAY_NAME, "Please authenticate");
        row.add(DocumentsContract.Document.COLUMN_SIZE, 0);
        row.add(DocumentsContract.Document.COLUMN_MIME_TYPE, "application/octet-stream");
        row.add(DocumentsContract.Document.COLUMN_LAST_MODIFIED, System.currentTimeMillis());
        row.add(DocumentsContract.Document.COLUMN_FLAGS, FilenDocumentsProvider.getDefaultFileFlags());

        return result;
    }

    public static void cleanupDirectory (File directory, boolean deleteIfEmpty) throws Exception {
        if (!directory.exists() || !directory.isDirectory()) {
            return;
        }

        final String[] files = directory.list();

        if (files == null || files.length == 0) {
            if (deleteIfEmpty) {
                directory.delete();
            }

            return;
        }

        final long oneHourAgo = System.currentTimeMillis() - TimeUnit.HOURS.toMillis(1) * 6;

        for (final String fileName: files) {
            final File file = new File(directory, fileName);

            if (file.exists()) {
                if (file.isDirectory()) {
                    cleanupDirectory(file, true);
                } else {
                    final BasicFileAttributes attrs = Files.readAttributes(file.toPath(), BasicFileAttributes.class);
                    final long creationTime = attrs.creationTime().toMillis();

                    if (creationTime < oneHourAgo) {
                        file.delete();
                    }
                }
            }
        }
    }

    public static void cleanupDirectories (Context context) {
        if (System.currentTimeMillis() < nextDirectoryCleanup) {
            return;
        }

        nextDirectoryCleanup = System.currentTimeMillis() + 3600000 * 72;

        try {
            final File filesDir = context.getFilesDir();
            final File base = new File(filesDir, "documentsProvider");

            if (!base.exists() || !base.isDirectory()) {
                return;
            }

            final String[] baseDirs = base.list();

            if (baseDirs == null) {
                return;
            }

            final List<String> dirsToSkip = Arrays.asList("thumbnailImages", "downloadedFiles");

            for (final String baseDir: baseDirs) {
                if (!dirsToSkip.contains(baseDir)) {
                    final File dir = new File(filesDir, "documentsProvider/" + baseDir);

                    if (dir.exists() && dir.isDirectory()) {
                        cleanupDirectory(dir, false);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static int calculateInSampleSize (BitmapFactory.Options options, int reqWidth, int reqHeight) {
        final int height = options.outHeight;
        final int width = options.outWidth;
        int inSampleSize = 1;

        if (height > reqHeight || width > reqWidth) {
            final int halfHeight = height / 2;
            final int halfWidth = width / 2;

            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2;
            }
        }

        return inSampleSize;
    }

    public static long convertTimestampToMs (long timestamp) {
        final long now = System.currentTimeMillis();

        if (Math.abs(now - timestamp) < Math.abs(now - timestamp * 1000)) {
            return timestamp;
        }

        return Math.round(timestamp * 1000);
    }

    public static String getMimeTypeFromName (String name) {
        final String mimeType = URLConnection.guessContentTypeFromName(name);

        if (mimeType == null) {
            return "application/octet-stream";
        }

        return mimeType;
    }
}
