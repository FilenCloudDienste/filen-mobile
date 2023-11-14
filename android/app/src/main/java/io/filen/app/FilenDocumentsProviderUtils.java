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
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import javax.annotation.Nullable;

public class FilenDocumentsProviderUtils {
    private static final ExecutorService downloadThreadPool = Executors.newFixedThreadPool(20);
    private static final ExecutorService uploadThreadPool = Executors.newFixedThreadPool(10);
    private static final Map<String, Semaphore> downloadFileSemaphore = new HashMap<>();
    private static final Map<String, Semaphore> uploadFileSemaphore = new HashMap<>();

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
        String masterKeys = MMKVHelper.getInstance().decodeString("masterKeys", "[]");

        try {
            JSONArray jsonArray = new JSONArray(masterKeys);
            String[] stringArray = new String[jsonArray.length()];

            for (int i = 0; i < jsonArray.length(); i++) {
                stringArray[i] = jsonArray.getString(i);
            }

            return stringArray;
        } catch (JSONException e) {
            e.printStackTrace();

            return new String[] {};
        }
    }

    public static boolean needsBiometricAuth() {
        return false; // @TODO
    }

    public static void deleteItemFromSQLiteRecursive (String uuid) {
        Item item = getItemFromDocumentId(uuid);

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

        Item item = getItemFromDocumentId(documentId);

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

        try {
            final File tempFileDir = new File(context.getFilesDir(), "documentsProvider/temp/" + UUID.randomUUID().toString());

            if (!tempFileDir.exists()) {
                if (!tempFileDir.mkdirs()) {
                    throw new Exception("Could not create parent dirs.");
                }
            }

            final File tempFile = new File(tempFileDir, name);

            if (!tempFile.createNewFile()) {
                throw new Exception("Could not create temporary file.");
            }

            tempFileHandle = new RandomAccessFile(tempFile, "rw");

            tempFileHandle.write(FilenCrypto.generateSecureRandomString(1).getBytes());

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

            Log.d("FilenDocumentsProvider", "Added file to SQLite: " + name);

            callback.onResult(null);
        } catch (Exception e) {
            callback.onResult(e);
        } finally {
            if (tempFileHandle != null) {
                try {
                    tempFileHandle.close();
                } catch (Exception e) {
                    callback.onResult(e);
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

                        Log.d("FilenDocumentsProvider", "Added folder to SQLite: " + name);

                        // @TODO checkIfItemParentIsShared

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

        FilenAPI.fetchFolderContent(getAPIKey(), parentUUID, new APIRequest.APICallback() {
            @Override
            public void onSuccess (JSONObject result) {
                Cursor dbCursor = null;

                try {
                    if (!result.getBoolean("status")) {
                        callback.onResult(new Exception(result.getString("code")));

                        return;
                    }

                    JSONObject data = result.getJSONObject("data");
                    JSONArray files = data.getJSONArray("uploads");
                    JSONArray folders = data.getJSONArray("folders");
                    String[] masterKeys = getMasterKeys();

                    SQLiteHelper.getInstance().execSQL("DELETE FROM `items` WHERE `parent` = ?", new Object[]{ parentUUID });

                    for (int i = 0; i < files.length(); i++) {
                        JSONObject file = files.getJSONObject(i);
                        FileMetadata decryptedFileMetadata = new FileMetadata();

                        dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `name`, `size`, `mime`, `key`, `lastModified` FROM `decrypted_file_metadata` WHERE `used_metadata` = ?", new String[]{ file.getString("metadata") });

                        if (dbCursor.moveToFirst()) {
                            decryptedFileMetadata.name = dbCursor.getString(0);
                            decryptedFileMetadata.size = dbCursor.getInt(1);
                            decryptedFileMetadata.mime = dbCursor.getString(2);
                            decryptedFileMetadata.key = dbCursor.getString(3);
                            decryptedFileMetadata.lastModified = Math.toIntExact(convertTimestampToMs(dbCursor.getInt(4)));
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
                                        convertTimestampToMs(file.getInt("timestamp")),
                                        convertTimestampToMs(decryptedFileMetadata.lastModified),
                                        decryptedFileMetadata.key,
                                        file.getInt("chunks"),
                                        file.getString("region"),
                                        file.getString("bucket"),
                                        file.getInt("version")
                                }
                        );

                        Log.d("FilenDocumentsProvider", "Added file to SQLite: " + decryptedFileMetadata.name);
                    }

                    for (int i = 0; i < folders.length(); i++) {
                        JSONObject folder = folders.getJSONObject(i);
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
                                        convertTimestampToMs(folder.getInt("timestamp")),
                                        convertTimestampToMs(folder.getInt("timestamp")),
                                        "",
                                        0,
                                        "",
                                        "",
                                        0
                                }
                        );

                        Log.d("FilenDocumentsProvider", "Added folder to SQLite: " + decryptedFolderName);
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

            Item item = new Item();

            item.uuid = dbCursor.getString(0);
            item.parent = dbCursor.getString(1);
            item.name = dbCursor.getString(2);
            item.type = dbCursor.getString(3);
            item.mime = dbCursor.getString(4);
            item.size = dbCursor.getInt(5);
            item.timestamp = dbCursor.getInt(6);
            item.lastModified = dbCursor.getInt(7);
            item.key = dbCursor.getString(8);
            item.chunks = dbCursor.getInt(9);
            item.region = dbCursor.getString(10);
            item.bucket = dbCursor.getString(11);
            item.version = dbCursor.getInt(12);

            dbCursor.close();

            return item;
        } catch (Exception e) {
            Log.d("FilenDocumentsProvider", "getItemFromDocumentId error: " + e.getMessage());

            throw e;
        }
    }

    public static String getItemThumbnailLocalPath (Context context, Item item) throws Exception {
        final File outputFileDir = new File(context.getFilesDir(), "documentsProvider/thumbnails/v1/" + item.uuid);

        if (!outputFileDir.exists()) {
            if (!outputFileDir.mkdirs()) {
                throw new Exception("Could not create parent dirs.");
            }
        }

        final File outputFile = new File(outputFileDir, item.name);

        return outputFile.getAbsolutePath();
    }

    public static String getItemLocalPath (Context context, Item item) throws Exception {
        final File outputFileDir = new File(context.getFilesDir(), "documentsProvider/files/" + item.uuid);

        if (!outputFileDir.exists()) {
            if (!outputFileDir.mkdirs()) {
                throw new Exception("Could not create parent dirs.");
            }
        }

        final File outputFile = new File(outputFileDir, item.name);

        return outputFile.getAbsolutePath();
    }

    public static void appendFileToFile (File source, File destination) throws IOException {
        Log.d("FilenDocumentsProvider", "appendFileToFile: " + source + ", " + destination);

        try (FileOutputStream out = new FileOutputStream(destination, true); FileInputStream in = new FileInputStream(source)) {
            byte[] buffer = new byte[1024];
            int bytesRead;

            while ((bytesRead = in.read(buffer)) != -1) {
                if (bytesRead > 0) {
                    out.write(buffer);
                }
            }
        }
    }

    public static File downloadFile (Context context, Item item, boolean returnEarly, int maxChunks, @Nullable CancellationSignal signal) throws Exception {
        Log.d("FilenDocumentsProvider", "downloadFile: " + item + ", " + returnEarly + ", " + maxChunks);

        if (downloadFileSemaphore.get(item.uuid) == null) {
            downloadFileSemaphore.put(item.uuid, new Semaphore(1));
        }

        Objects.requireNonNull(downloadFileSemaphore.get(item.uuid)).acquire();

        try {
            final File outputFile = new File(getItemLocalPath(context, item));

            if (outputFile.exists() || returnEarly) {
                Objects.requireNonNull(downloadFileSemaphore.get(item.uuid)).release();

                return outputFile;
            }

            if (!outputFile.createNewFile()) {
                throw new Exception("Could not create file for documentId " + item.uuid);
            }

            final int chunksToDownload = maxChunks >= item.chunks ? item.chunks : maxChunks;
            final AtomicInteger currentWriteIndex = new AtomicInteger(0);
            final Object writeLock = new Object();
            final Object lock = new Object();
            final AtomicInteger chunksDownloaded = new AtomicInteger(0);

            final Thread thread = new Thread(() -> {
                try {
                    for (int i = 0; i < chunksToDownload; i++) {
                        int index = i;

                        downloadThreadPool.submit(() -> {
                            if (signal != null) {
                                if (signal.isCanceled()) {
                                    Thread.currentThread().interrupt();

                                    return;
                                }
                            }

                            try {
                                File downloadedChunkFile = FilenAPI.downloadFileChunk(context, item, index);
                                File decryptedChunkFile = FilenCrypto.streamDecryptData(downloadedChunkFile, item.key, item.version);

                                synchronized (writeLock) {
                                    while (currentWriteIndex.get() != index) {
                                        writeLock.wait();
                                    }
                                }

                                if (index == 0) {
                                    if (outputFile.exists()) {
                                        if (!outputFile.delete()) {
                                            throw new Exception("Could not delete file.");
                                        }
                                    }

                                    if (!decryptedChunkFile.renameTo(outputFile)) {
                                        throw new Exception("Could not move decrypted chunk file to output file.");
                                    }
                                } else {
                                    if (!outputFile.exists()) {
                                        throw new Exception("Output file does not exist.");
                                    }

                                    appendFileToFile(decryptedChunkFile, outputFile);
                                }

                                currentWriteIndex.set(index + 1);

                                synchronized (writeLock) {
                                    writeLock.notifyAll();
                                }
                            } catch (Exception e) {
                                e.printStackTrace();

                                Log.d("FilenDocumentsProvider", "downloadFile error: " + e.getMessage());
                            } finally {
                                chunksDownloaded.set(chunksDownloaded.get() + 1);

                                synchronized (lock) {
                                    lock.notifyAll();
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

                    Log.d("FilenDocumentsProvider", "downloadFile error: " + e.getMessage());
                }
            });

            thread.start();
            thread.join();

            Objects.requireNonNull(downloadFileSemaphore.get(item.uuid)).release();

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

    public static Object[] uploadFile (File inputFile, String parent, String uuid) throws Exception {
        Log.d("FilenDocumentsProvider", "uploadFile: " + inputFile.getAbsolutePath() + ", " + parent + ", " + uuid);

        if (!inputFile.exists()) {
            throw new Exception("Input file does not exist.");
        }

        final String[] masterKeys = getMasterKeys();
        final String lastMasterKey = masterKeys[masterKeys.length - 1];
        final long inputFileSize = inputFile.length();
        final long inputFileLastModified = inputFile.lastModified();
        final String key = FilenCrypto.generateSecureRandomString(32);
        final int encryptionVersion = 2;

        if (inputFileSize <= 0) {
            throw new Exception("0 byte files not supported yet.");
        }

        final String inputFileName = inputFile.getName();
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
                                            lock.notifyAll();
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
                                        lock.notifyAll();
                                    }
                                }
                            });
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "uploadFile error: " + e.getMessage());

                            uploadedChunks.set(uploadedChunks.get() + 1);

                            synchronized (lock) {
                                lock.notifyAll();
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

        final AtomicBoolean didMarkAsDone = new AtomicBoolean(false);
        final Object didMarkAsDoneLock = new Object();
        final AtomicBoolean didMarkAsDoneError = new AtomicBoolean(false);

        final Thread markAsDoneThread = new Thread(() -> {
            try {
                FilenAPI.markUploadAsDone(getAPIKey(), uuid, nameEncrypted, nameHashed, sizeEncrypted, finalFileChunks, mimeEncrypted, rm, metadata, encryptionVersion, uploadKey, new APIRequest.APICallback() {
                    @Override
                    public void onSuccess(JSONObject result) {
                        try {
                            if (!result.getBoolean("status")) {
                                throw new Exception("Invalid markUploadAsDone status code: " + result.getString("code"));
                            }
                        } catch (Exception e) {
                            didMarkAsDoneError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "uploadFile markUploadAsDone error: " + e.getMessage());
                        } finally {
                            didMarkAsDone.set(true);

                            synchronized (didMarkAsDoneLock) {
                                didMarkAsDoneLock.notifyAll();
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        didMarkAsDoneError.set(true);
                        didMarkAsDone.set(true);

                        throwable.printStackTrace();

                        Log.d("FilenDocumentsProvider", "uploadFile markUploadAsDone error: " + throwable.getMessage());

                        synchronized (didMarkAsDoneLock) {
                            didMarkAsDoneLock.notifyAll();
                        }
                    }
                });

                synchronized (didMarkAsDoneLock) {
                    while (!didMarkAsDone.get()) {
                        didMarkAsDoneLock.wait();
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "uploadFile markUploadAsDone error: " + e.getMessage());
            }
        });

        markAsDoneThread.start();
        markAsDoneThread.join();

        if (!didMarkAsDone.get() || didMarkAsDoneError.get()) {
            throw new Exception("Could not upload file.");
        }

        // @TODO checkIfItemParentIsShared

        return new Object[] {
                region.get(),
                bucket.get(),
                key,
                inputFileSize,
                finalFileChunks,
                encryptionVersion
        };
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
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "renameFolder error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                lock.notifyAll();
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
                            lock.notifyAll();
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "renameFolder error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could not rename folder.");
        }

        // @TODO checkIfItemIsSharedForRename
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
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "renameFile error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                lock.notifyAll();
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
                            lock.notifyAll();
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "renameFile error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could not rename file.");
        }

        // @TODO checkIfItemIsSharedForRename
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
                        } catch (Exception e) {
                            didError.set(true);

                            e.printStackTrace();

                            Log.d("FilenDocumentsProvider", "moveItem error: " + e.getMessage());
                        } finally {
                            done.set(true);

                            synchronized (lock) {
                                lock.notifyAll();
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
                            lock.notifyAll();
                        }
                    }
                });

                synchronized (lock) {
                    while (!done.get()) {
                        lock.wait();
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "moveItem error: " + e.getMessage());
            }
        });

        thread.start();
        thread.join();

        if (!done.get() || didError.get()) {
            throw new Exception("Could not move document.");
        }

        // @TODO checkIfItemParentIsShared
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

    public static void cleanupDirectories () {
        new Thread(() -> {
            try {
                // @TODO
            } catch (Exception e) {

            }
        }).start();
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
        long now = System.currentTimeMillis();

        if (Math.abs(now - timestamp) < Math.abs(now - timestamp * 1000L)) {
            return timestamp;
        }

        return timestamp * 1000L;
    }

    public static long convertTimestampToSeconds (long timestamp) {
        long now = System.currentTimeMillis() / 1000L;

        if (Math.abs(now - timestamp) < Math.abs(now - (timestamp / 1000L))) {
            return timestamp;
        }

        return timestamp / 1000L;
    }

    public static String getMimeTypeFromName (String name) {
        String mimeType = URLConnection.guessContentTypeFromName(name);

        if (mimeType == null) {
            return "application/octet-stream";
        }

        return mimeType;
    }
}
