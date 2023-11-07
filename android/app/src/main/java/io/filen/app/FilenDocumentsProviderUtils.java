package io.filen.app;

import android.database.Cursor;
import android.util.Log;
import android.webkit.MimeTypeMap;

import org.json.*;

import java.io.File;
import java.io.FileNotFoundException;
import java.net.URLConnection;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.concurrent.ExecutorService;

import javax.annotation.Nullable;

public class FilenDocumentsProviderUtils {
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
            public void onSuccess(JSONObject result) {
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

    public static void updateFolderContent(String parentUUID, ErrorCallback callback) {
        Log.d("FilenDocumentsProvider", "updateFolderContent: " + parentUUID);

        FilenAPI.fetchFolderContent(FilenDocumentsProviderUtils.getAPIKey(), parentUUID, new APIRequest.APICallback() {
            @Override
            public void onSuccess(JSONObject result) {
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
            public void onError(Throwable throwable) {
                callback.onResult(throwable);
            }
        });
    }

    @Nullable
    public static Item getItemFromDocumentId (String documentId) {
        Cursor dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `uuid`, `parent`, `name`, `type`, `mime`, `size`, `timestamp`, `lastModified`, `key`, `chunks`, `region`, `bucket`, `version` FROM `items` WHERE `uuid` = ?", new String[]{ documentId });

        if (!dbCursor.moveToNext()) {
            dbCursor.close();

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
