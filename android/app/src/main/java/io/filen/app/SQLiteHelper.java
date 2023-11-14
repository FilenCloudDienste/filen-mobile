package io.filen.app;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;
import java.io.File;
import java.util.Objects;

public class SQLiteHelper {
    private static SQLiteDatabase database;

    public static void initialize(Context context) {
        File filesDir = context.getFilesDir();
        File dbPath = new File(filesDir, "sqlite/filenDocumentsProvider_v2.db");

        Objects.requireNonNull(dbPath.getParentFile()).mkdirs();

        Log.d("FilenDocumentsProvider", "DB dir: " + dbPath);

        database = SQLiteDatabase.openOrCreateDatabase(dbPath, null);

        database.rawQuery("PRAGMA journal_mode = wal", null).close();
        database.rawQuery("PRAGMA synchronous = normal", null).close();
        database.rawQuery("PRAGMA foreign_keys = off", null).close();

        database.execSQL("CREATE TABLE IF NOT EXISTS `items` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `uuid` TEXT NOT NULL DEFAULT '', `parent` TEXT NOT NULL DEFAULT '', `name` TEXT NOT NULL DEFAULT '', `type` TEXT NOT NULL DEFAULT '', `mime` TEXT NOT NULL DEFAULT '', `size` INTEGER NOT NULL DEFAULT 0, `timestamp` INTEGER NOT NULL DEFAULT 0, `lastModified` INTEGER NOT NULL DEFAULT 0, `key` TEXT NOT NULL DEFAULT '', `chunks` INTEGER NOT NULL DEFAULT 0, `region` TEXT NOT NULL DEFAULT '', `bucket` TEXT NOT NULL DEFAULT '', `version` INTEGER NOT NULL DEFAULT '', `toBeCreated` INTEGER NOT NULL DEFAULT 0)");
        database.execSQL("CREATE INDEX IF NOT EXISTS `uuid_index` ON `items` (`uuid`)");
        database.execSQL("CREATE INDEX IF NOT EXISTS `parent_index` ON `items` (`parent`)");
        database.execSQL("CREATE INDEX IF NOT EXISTS `lastModified_index` ON `items` (`lastModified`)");
        database.execSQL("CREATE INDEX IF NOT EXISTS `parent_lastModified_index` ON `items` (`parent`, `lastModified`)");
        database.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `uuid_unique` ON `items` (`uuid`)");

        database.execSQL("CREATE TABLE IF NOT EXISTS `decrypted_file_metadata` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `uuid` TEXT NOT NULL DEFAULT '', `name` TEXT NOT NULL DEFAULT '', `size` INTEGER NOT NULL DEFAULT 0, `mime` TEXT NOT NULL DEFAULT '', `key` TEXT NOT NULL DEFAULT '', `lastModified` INTEGER NOT NULL DEFAULT 0, `hash` TEXT NOT NULL DEFAULT '', `used_metadata` TEXT NOT NULL DEFAULT '')");
        database.execSQL("CREATE INDEX IF NOT EXISTS `uuid_index` ON `decrypted_file_metadata` (`uuid`)");
        database.execSQL("CREATE INDEX IF NOT EXISTS `used_metadata_index` ON `decrypted_file_metadata` (`used_metadata`)");
        database.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `uuid_unique` ON `decrypted_file_metadata` (`uuid`)");

        database.execSQL("CREATE TABLE IF NOT EXISTS `decrypted_folder_metadata` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `uuid` TEXT NOT NULL DEFAULT '', `name` TEXT NOT NULL DEFAULT '', `used_metadata` TEXT NOT NULL DEFAULT '')");
        database.execSQL("CREATE INDEX IF NOT EXISTS `uuid_index` ON `decrypted_folder_metadata` (`uuid`)");
        database.execSQL("CREATE INDEX IF NOT EXISTS `used_metadata_index` ON `decrypted_folder_metadata` (`used_metadata`)");
        database.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `uuid_unique` ON `decrypted_folder_metadata` (`uuid`)");

        database.execSQL("CREATE TABLE IF NOT EXISTS `metadata` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `key` TEXT NOT NULL DEFAULT '', `data` TEXT NOT NULL DEFAULT '')");
        database.execSQL("CREATE INDEX IF NOT EXISTS `key_index` ON `metadata` (`key`)");
        database.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `key_unique` ON `metadata` (`key`)");

        Log.d("FilenDocumentsProvider", "DB initialized");
    }

    public static SQLiteDatabase getInstance() {
        if (database == null) {
            throw new IllegalStateException("SQLite is not yet initialized.");
        }

        return database;
    }
}
