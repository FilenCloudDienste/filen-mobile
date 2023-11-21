package io.filen.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Point;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract.Document;
import android.provider.DocumentsContract.Root;
import android.provider.DocumentsContract;
import android.provider.DocumentsProvider;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class FilenDocumentsProvider extends DocumentsProvider {
    private final String AUTHORITY = "io.filen.app.documents";
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private String queryChildDocumentsLastParent = "";
    private String queryChildDocumentsCurrentParent = "";
    private int nextNotificationId = 0;
    private boolean didCreateNotificationManager = false;
    private NotificationManager notificationManager;

    @Override
    public boolean onCreate () {
        final Context context = getContext();

        MMKVHelper.initialize(context);
        SQLiteHelper.initialize(context);

        return true;
    }

    @Override
    public Cursor queryRoots (String[] projection) {
        final MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultRootProjection());
        final String defaultDriveUUID = FilenDocumentsProviderUtils.getDefaultDriveUUID();

        Log.d("FilenDocumentsProvider", "defaultDriveUUID: " + defaultDriveUUID);
        Log.d("FilenDocumentsProvider", "userId: " + FilenDocumentsProviderUtils.getUserId());

        if (!FilenDocumentsProviderUtils.isLoggedIn() || defaultDriveUUID.length() == 0) {
            return result;
        }

        final MatrixCursor.RowBuilder row = result.newRow();

        row.add(Root.COLUMN_ROOT_ID, defaultDriveUUID);
        row.add(Root.COLUMN_DOCUMENT_ID, defaultDriveUUID);
        row.add(Root.COLUMN_CAPACITY_BYTES, 0);
        row.add(Root.COLUMN_AVAILABLE_BYTES, 0);
        row.add(Root.COLUMN_MIME_TYPES, "*/*");
        row.add(Root.COLUMN_TITLE, "Filen");
        row.add(Root.COLUMN_ICON, R.mipmap.ic_launcher);
        row.add(Root.COLUMN_FLAGS, Root.FLAG_SUPPORTS_CREATE);

        // @TODO update root with capacity/available data

        Log.d("FilenDocumentsProvider", "Root folder created, UUID: " + defaultDriveUUID);

        final Bundle extra = new Bundle();

        extra.putBoolean(DocumentsContract.EXTRA_LOADING, true);

        result.setExtras(extra);
        result.setNotificationUri(Objects.requireNonNull(getContext()).getContentResolver(), getNotifyURI(defaultDriveUUID));

        return result;
    }

    @Override
    public Cursor queryDocument (String documentId, String[] projection) throws FileNotFoundException {
        final MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());
        final String defaultDriveUUID = FilenDocumentsProviderUtils.getDefaultDriveUUID();

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || defaultDriveUUID.length() == 0) {
            throw new FileNotFoundException("Document " + documentId + " not found.");
        }

        final MatrixCursor.RowBuilder row = result.newRow();

        if (documentId.equals(defaultDriveUUID)) {
            row.add(Document.COLUMN_DOCUMENT_ID, defaultDriveUUID);
            row.add(Document.COLUMN_DISPLAY_NAME, "Filen");
            row.add(Document.COLUMN_SIZE, 0);
            row.add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR);
            row.add(Document.COLUMN_LAST_MODIFIED, System.currentTimeMillis());
            row.add(Document.COLUMN_FLAGS, getDefaultRootFlags());
        } else {
            final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

            if (item == null) {
                throw new FileNotFoundException("Document " + documentId + " not found.");
            }

            row.add(Document.COLUMN_DOCUMENT_ID, item.uuid);
            row.add(Document.COLUMN_DISPLAY_NAME, item.name);

            if (item.type.equals("file")) {
                row.add(Document.COLUMN_SIZE, item.size);
                row.add(Document.COLUMN_MIME_TYPE, item.mime.length() > 0 ? item.mime : "application/octet-stream");
                row.add(Document.COLUMN_LAST_MODIFIED, item.lastModified > 0 ? item.lastModified : item.timestamp);
                row.add(Document.COLUMN_FLAGS, getFileFlags(item.name));
            } else {
                row.add(Document.COLUMN_SIZE, 0);
                row.add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR);
                row.add(Document.COLUMN_LAST_MODIFIED, item.timestamp);
                row.add(Document.COLUMN_FLAGS, getDefaultFolderFlags());
            }
        }

        return result;
    }

    @Override
    public boolean refresh (Uri uri, @Nullable Bundle extras, @Nullable CancellationSignal cancellationSignal) {
        if (!FilenDocumentsProviderUtils.needsBiometricAuth() && FilenDocumentsProviderUtils.isLoggedIn() && FilenDocumentsProviderUtils.getDefaultDriveUUID().length() > 0) {
            final String parentDocumentId = uri.getLastPathSegment();
            final String defaultDriveUUID = FilenDocumentsProviderUtils.getDefaultDriveUUID();
            boolean canRefresh = false;
            final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(parentDocumentId);

            if (item != null) {
                if (item.type.equals("folder")) {
                    canRefresh = true;
                }
            }

            if (defaultDriveUUID.equals(parentDocumentId)) {
                canRefresh = true;
            }

            if (canRefresh) {
                executor.submit(() -> FilenDocumentsProviderUtils.updateFolderContent(parentDocumentId, err -> {
                    if (err == null) {
                        notifyChange(parentDocumentId);
                    }
                }));
            }
        }

        return super.refresh(uri, extras, cancellationSignal);
    }

    @Override
    public Cursor queryChildDocuments (String parentDocumentId, String[] projection, String sortOrder) {
        Log.d("FilenDocumentsProvider", "queryChildDocuments: " + parentDocumentId + ", " + Arrays.toString(projection) + ", " + sortOrder);

        final MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || FilenDocumentsProviderUtils.getDefaultDriveUUID().length() == 0) {
            return FilenDocumentsProviderUtils.promptAuthenticationCursor(result);
        }

        queryChildDocumentsCurrentParent = parentDocumentId;

        if (!queryChildDocumentsLastParent.equals(parentDocumentId) && queryChildDocumentsCurrentParent.equals(parentDocumentId)) {
            queryChildDocumentsLastParent = parentDocumentId;

            executor.submit(() -> FilenDocumentsProviderUtils.updateFolderContent(parentDocumentId, err -> {
                if (err == null) {
                    notifyChange(parentDocumentId);
                }
            }));
        }

        Cursor dbCursor = null;

        try {
            dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `uuid`, `parent`, `name`, `type`, `mime`, `size`, `timestamp`, `lastModified`, `key`, `chunks`, `region`, `bucket`, `version` FROM `items` WHERE `parent` = ?", new String[]{ parentDocumentId });

            while (dbCursor.moveToNext()) {
                MatrixCursor.RowBuilder row = result.newRow();

                row.add(Document.COLUMN_DOCUMENT_ID, dbCursor.getString(0));
                row.add(Document.COLUMN_DISPLAY_NAME, dbCursor.getString(2));

                if (dbCursor.getString(3).equals("file")) {
                    row.add(Document.COLUMN_SIZE, dbCursor.getInt(5));
                    row.add(Document.COLUMN_MIME_TYPE, FilenDocumentsProviderUtils.getMimeTypeFromName(dbCursor.getString(2)));
                    row.add(Document.COLUMN_LAST_MODIFIED, dbCursor.getInt(7) > 0 ? dbCursor.getInt(7) : dbCursor.getInt(6));
                    row.add(Document.COLUMN_FLAGS, getFileFlags(dbCursor.getString(2)));
                } else {
                    row.add(Document.COLUMN_SIZE, 0);
                    row.add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR);
                    row.add(Document.COLUMN_LAST_MODIFIED, dbCursor.getInt(6));
                    row.add(Document.COLUMN_FLAGS, getDefaultFolderFlags());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (dbCursor != null) {
                dbCursor.close();
            }
        }

        final Bundle extra = new Bundle();

        extra.putBoolean(DocumentsContract.EXTRA_LOADING, true);

        result.setExtras(extra);
        result.setNotificationUri(Objects.requireNonNull(getContext()).getContentResolver(), getNotifyURI(parentDocumentId));

        new Thread(() -> {
            try {
                FilenDocumentsProviderUtils.cleanupDirectories(getContext());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();

        return result;
    }

    @Override
    public String createDocument (String parentDocumentId, String mimeType, String displayName) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "createDocument: " + parentDocumentId + ", mimeType: " + mimeType + ", displayName: " + displayName);

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || FilenDocumentsProviderUtils.getDefaultDriveUUID().length() == 0) {
            throw new FileNotFoundException("Please authenticate.");
        }

        try {
            final String uuid = UUID.randomUUID().toString();
            final Object lock = new Object();
            final AtomicBoolean created = new AtomicBoolean(false);
            final AtomicBoolean didError = new AtomicBoolean(false);

            final Thread thread = new Thread(() -> {
                try {
                    if (Document.MIME_TYPE_DIR.equalsIgnoreCase(mimeType)) {
                        FilenDocumentsProviderUtils.createFolder(parentDocumentId, uuid, displayName, err -> {
                            if (err != null) {
                                err.printStackTrace();

                                Log.d("FilenDocumentsProvider", "createDocument createFolder error: " + err.getMessage());

                                didError.set(true);
                            }

                            created.set(true);

                            synchronized (lock) {
                                lock.notifyAll();
                            }
                        });
                    } else {
                        FilenDocumentsProviderUtils.createFile(getContext(), parentDocumentId, uuid, displayName, err -> {
                            if (err != null) {
                                err.printStackTrace();

                                Log.d("FilenDocumentsProvider", "createDocument createFile error: " + err.getMessage());

                                didError.set(true);
                            }

                            created.set(true);

                            synchronized (lock) {
                                lock.notifyAll();
                            }
                        });
                    }

                    synchronized (lock) {
                        while (!created.get()) {
                            lock.wait();
                        }
                    }
                } catch (Exception e) {
                    didError.set(true);

                    e.printStackTrace();

                    Log.d("FilenDocumentsProvider", "createDocument error: " + e.getMessage());
                }
            });

            thread.start();
            thread.join();

            if (!created.get() || didError.get()) {
                throw new Exception("Could not create document.");
            }

            executor.submit(() -> FilenDocumentsProviderUtils.updateFolderContent(parentDocumentId, err -> {
                if (err == null) {
                    notifyChange(parentDocumentId);
                }
            }));

            return uuid;
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "createDocument error: " + e.getMessage());

            throw new FileNotFoundException("Could not create document.");
        }
    }

    @Override
    public void removeDocument(String documentId, String parentDocumentId) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "removeDocument: " + documentId + ", parent: " + parentDocumentId);

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || FilenDocumentsProviderUtils.getDefaultDriveUUID().length() == 0) {
            throw new FileNotFoundException("Please authenticate.");
        }

        deleteDocument(documentId);
    }

    @Override
    public void deleteDocument (String documentId) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "deleteDocument: " + documentId);

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || FilenDocumentsProviderUtils.getDefaultDriveUUID().length() == 0) {
            throw new FileNotFoundException("Please authenticate.");
        }

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            throw new FileNotFoundException("Document " + documentId + " not found.");
        }

        recursiveRevokePermission(documentId);

        final Object lock = new Object();
        final AtomicBoolean done = new AtomicBoolean(false);
        final AtomicBoolean didError = new AtomicBoolean(false);

        final Thread thread = new Thread(() -> {
            try {
                FilenDocumentsProviderUtils.trashDocument(item.uuid, err -> {
                    if (err != null) {
                        err.printStackTrace();

                        Log.d("FilenDocumentsProvider", "deleteDocument error: " + err.getMessage());

                        didError.set(true);
                    } else {
                        executor.submit(() -> FilenDocumentsProviderUtils.updateFolderContent(item.parent, e -> {
                            if (e == null) {
                                notifyChange(item.parent);
                            }
                        }));
                    }

                    done.set(true);

                    synchronized (lock) {
                        lock.notifyAll();
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

                Log.d("FilenDocumentsProvider", "deleteDocument error: " + e.getMessage());
            }
        });

        try {
            thread.start();
            thread.join();

            if (!done.get() || didError.get()) {
                throw new FileNotFoundException("Could not delete " + documentId);
            }
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "deleteDocument error: " + e.getMessage());

            throw new FileNotFoundException("Could not delete " + documentId);
        }
    }

    @Override
    public Cursor querySearchDocuments (String rootId, String query, String[] projection) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "querySearchDocuments: " + rootId + ", query: " + query);

        final MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || FilenDocumentsProviderUtils.getDefaultDriveUUID().length() == 0) {
            return FilenDocumentsProviderUtils.promptAuthenticationCursor(result);
        }

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(rootId);

        if (item == null && !FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(rootId)) {
            throw new FileNotFoundException("Document " + rootId + " not found.");
        }

        Cursor dbCursor = null;

        try {
            dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `uuid`, `parent`, `name`, `type`, `mime`, `size`, `timestamp`, `lastModified`, `key`, `chunks`, `region`, `bucket`, `version` FROM `items` WHERE `parent` = ?", new String[]{ rootId });

            while (dbCursor.moveToNext()) {
                String mimeType = FilenDocumentsProviderUtils.getMimeTypeFromName(dbCursor.getString(2));

                if (dbCursor.getString(2).toLowerCase().contains(query.toLowerCase()) || mimeType.toLowerCase().contains(query.toLowerCase())) {
                    MatrixCursor.RowBuilder row = result.newRow();

                    row.add(Document.COLUMN_DOCUMENT_ID, dbCursor.getString(0));
                    row.add(Document.COLUMN_DISPLAY_NAME, dbCursor.getString(2));

                    if (dbCursor.getString(3).equals("file")) {
                        row.add(Document.COLUMN_SIZE, dbCursor.getInt(5));
                        row.add(Document.COLUMN_MIME_TYPE, mimeType);
                        row.add(Document.COLUMN_LAST_MODIFIED, dbCursor.getInt(7) > 0 ? dbCursor.getInt(7) : dbCursor.getInt(6));
                        row.add(Document.COLUMN_FLAGS, getFileFlags(dbCursor.getString(2)));
                    } else {
                        row.add(Document.COLUMN_SIZE, 0);
                        row.add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR);
                        row.add(Document.COLUMN_LAST_MODIFIED, dbCursor.getInt(6));
                        row.add(Document.COLUMN_FLAGS, getDefaultFolderFlags());
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (dbCursor != null) {
                dbCursor.close();
            }
        }

        return result;
    }

    @Override
    public Cursor queryRecentDocuments (String rootId, String[] projection, Bundle queryArgs, CancellationSignal signal) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "queryRecentDocuments: " + rootId);

        final MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || FilenDocumentsProviderUtils.getDefaultDriveUUID().length() == 0) {
            return FilenDocumentsProviderUtils.promptAuthenticationCursor(result);
        }

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(rootId);

        if (item == null && !FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(rootId)) {
            throw new FileNotFoundException("Document " + rootId + " not found.");
        }

        Cursor dbCursor = null;

        try {
            dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `uuid`, `parent`, `name`, `type`, `mime`, `size`, `timestamp`, `lastModified`, `key`, `chunks`, `region`, `bucket`, `version` FROM `items` WHERE `parent` = ? ORDER BY `lastModified` DESC", new String[]{ rootId });

            while (dbCursor.moveToNext()) {
                MatrixCursor.RowBuilder row = result.newRow();

                row.add(Document.COLUMN_DOCUMENT_ID, dbCursor.getString(0));
                row.add(Document.COLUMN_DISPLAY_NAME, dbCursor.getString(2));

                if (dbCursor.getString(3).equals("file")) {
                    row.add(Document.COLUMN_SIZE, dbCursor.getInt(5));
                    row.add(Document.COLUMN_MIME_TYPE, FilenDocumentsProviderUtils.getMimeTypeFromName(dbCursor.getString(2)));
                    row.add(Document.COLUMN_LAST_MODIFIED, dbCursor.getInt(7) > 0 ? dbCursor.getInt(7) : dbCursor.getInt(6));
                    row.add(Document.COLUMN_FLAGS, getFileFlags(dbCursor.getString(2)));
                } else {
                    row.add(Document.COLUMN_SIZE, 0);
                    row.add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR);
                    row.add(Document.COLUMN_LAST_MODIFIED, dbCursor.getInt(6));
                    row.add(Document.COLUMN_FLAGS, getDefaultFolderFlags());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (dbCursor != null) {
                dbCursor.close();
            }
        }

        return result;
    }

    @Override
    public boolean isChildDocument (String parentDocumentId, String documentId) {
        Log.d("FilenDocumentsProvider", "isChildDocument: " + parentDocumentId + ", documentId: " + documentId);

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            return false;
        }

        final String defaultDriveUUID = FilenDocumentsProviderUtils.getDefaultDriveUUID();

        if (item.parent.equals(parentDocumentId) || defaultDriveUUID.equals(parentDocumentId)) {
            return true;
        }

        boolean found = false;
        String currentParent = item.parent;
        final int maxIterations = 100000;
        int currentIterations = 0;

        try {
            while (!found && currentIterations < maxIterations) {
                final Item parent = FilenDocumentsProviderUtils.getItemFromDocumentId(currentParent);

                if (parent == null) {
                    break;
                }

                if (parent.uuid.equals(parentDocumentId) || defaultDriveUUID.equals(parent.parent)) {
                    found = true;
                } else {
                    currentParent = parent.parent;
                    currentIterations += 1;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "isChildDocument error: " + e.getMessage());
        }

        return found;
    }

    @Override
    public String getDocumentType (String documentId) throws FileNotFoundException {
        final String defaultDriveUUID = FilenDocumentsProviderUtils.getDefaultDriveUUID();

        if (documentId.equals(defaultDriveUUID)) {
            return Document.MIME_TYPE_DIR;
        }

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            throw new FileNotFoundException("Document " + documentId + " not found.");
        }

        if (item.type.equals("folder")) {
            return Document.MIME_TYPE_DIR;
        }

        return FilenDocumentsProviderUtils.getMimeTypeFromName(item.name);
    }

    @Override
    public ParcelFileDescriptor openDocument (String documentId, String mode, @Nullable CancellationSignal signal) throws FileNotFoundException {
        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || FilenDocumentsProviderUtils.getDefaultDriveUUID().length() == 0) {
            throw new FileNotFoundException("Please authenticate.");
        }

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            throw new FileNotFoundException("Document " + documentId + " not found.");
        }

        final int accessMode = ParcelFileDescriptor.parseMode(mode);
        final AtomicBoolean didDownload = new AtomicBoolean(false);
        final Context context = Objects.requireNonNull(getContext());
        final NotificationManager notifyManager = getNotificationManager(context);
        final int downloadNotificationId = nextNotificationId++;

        final NotificationCompat.Builder downloadNotificationBuilder = new NotificationCompat.Builder(context, "transfers_channel")
                .setContentTitle("File transfer")
                .setContentText("Downloading " + item.name)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setProgress(100, 0, true);

        notifyManager.notify(downloadNotificationId, downloadNotificationBuilder.build());

        final Thread downloadThread = new Thread(() -> {
            try {
                final File downloadedFile = FilenDocumentsProviderUtils.downloadFile(context, item, false, item.chunks, signal);

                if (!downloadedFile.exists()) {
                    didDownload.set(false);

                    return;
                }

                didDownload.set(true);
            } catch (Exception e) {
                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "openDocument download error: " + e.getMessage());

                didDownload.set(false);
            }
        });

        try {
            downloadThread.start();
            downloadThread.join();
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "openDocument downloadThread error: " + e.getMessage());

            notifyManager.cancel(downloadNotificationId);

            throw new FileNotFoundException("Document " + documentId + " download error.");
        }

        if (!didDownload.get()) {
            notifyManager.cancel(downloadNotificationId);

            throw new FileNotFoundException("Document " + documentId + " download error.");
        }

        notifyManager.cancel(downloadNotificationId);

        try {
            final File downloadedFile = FilenDocumentsProviderUtils.downloadFile(context, item, true, item.chunks, signal);
            final String originalFileHash = FilenCrypto.hashFile(downloadedFile, "MD5");

            if (!downloadedFile.exists()) {
                throw new FileNotFoundException("Document " + documentId + " download error.");
            }

            if (signal != null) {
                if (signal.isCanceled()) {
                    throw new FileNotFoundException("Request cancelled.");
                }
            }

            if (accessMode != ParcelFileDescriptor.MODE_READ_ONLY) {
                final Handler handler = new Handler(context.getMainLooper());

                return ParcelFileDescriptor.open(downloadedFile, accessMode, handler, err -> {
                    if (err == null) {
                        new Thread(() -> {
                            try {
                                final String newFileHash = FilenCrypto.hashFile(downloadedFile, "MD5");

                                Log.d("FilenDocumentsProvider", "openDocument uploading changes: " + documentId + ", " + originalFileHash + ", " + newFileHash);

                                if (!newFileHash.equals(originalFileHash)) {
                                    final String uuid = UUID.randomUUID().toString();
                                    final int uploadNotificationId = nextNotificationId++;

                                    final NotificationCompat.Builder uploadNotificationBuilder = new NotificationCompat.Builder(context, "transfers_channel")
                                            .setContentTitle("File transfer")
                                            .setContentText("Uploading " + item.name)
                                            .setSmallIcon(R.mipmap.ic_launcher)
                                            .setPriority(NotificationCompat.PRIORITY_LOW)
                                            .setOngoing(true)
                                            .setOnlyAlertOnce(true)
                                            .setProgress(100, 0, true);

                                    notifyManager.notify(uploadNotificationId, uploadNotificationBuilder.build());

                                    try {
                                        FilenDocumentsProviderUtils.uploadFile(downloadedFile, item.parent, uuid);
                                    } catch (Exception e) {
                                        notificationManager.cancel(uploadNotificationId);

                                        throw e;
                                    }

                                    notificationManager.cancel(uploadNotificationId);

                                    executor.submit(() -> FilenDocumentsProviderUtils.updateFolderContent(item.parent, e -> {
                                        if (e == null) {
                                            notifyChange(item.parent);
                                        }
                                    }));
                                }
                            } catch (Exception e) {
                                e.printStackTrace();

                                Log.d("FilenDocumentsProvider", "openDocument file upload error: " + e.getMessage());
                            }
                        }).start();
                    } else {
                        err.printStackTrace();

                        Log.d("FilenDocumentsProvider", "openDocument file closed with error: " + err.getMessage());
                    }
                });
            }

            return ParcelFileDescriptor.open(downloadedFile, accessMode);
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "openDocument download error: " + e.getMessage());

            throw new FileNotFoundException("Document " + documentId + " download error.");
        }
    }

    @Override
    public AssetFileDescriptor openDocumentThumbnail (String documentId, Point sizeHint, @Nullable CancellationSignal signal) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "openDocumentThumbnail: " + documentId + ", " + sizeHint);

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || FilenDocumentsProviderUtils.getDefaultDriveUUID().length() == 0) {
            throw new FileNotFoundException("Please authenticate.");
        }

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            throw new FileNotFoundException("Document " + documentId + " not found.");
        }

        if (item.size <= 3) {
            throw new FileNotFoundException("Document " + documentId + " too small.");
        }

        FileOutputStream outputStream = null;

        try {
            final Context context = Objects.requireNonNull(getContext());
            final File thumbnailFile = new File(FilenDocumentsProviderUtils.getItemThumbnailLocalPath(context, item));

            if (thumbnailFile.exists()) {
                return new AssetFileDescriptor(ParcelFileDescriptor.open(thumbnailFile, ParcelFileDescriptor.MODE_READ_ONLY), 0, thumbnailFile.length());
            }

            final File downloadedFile = new File(FilenDocumentsProviderUtils.getItemLocalPath(context, item));

            if (!downloadedFile.exists()) {
                FilenDocumentsProviderUtils.downloadFile(context, item, false, item.chunks, signal);

                if (!downloadedFile.exists()) {
                    throw new Exception("Could not download file for thumbnail creation.");
                }

                if (downloadedFile.length() <= 3) {
                    throw new FileNotFoundException("Document " + documentId + " too small.");
                }
            }

            if (signal != null) {
                if (signal.isCanceled()) {
                    throw new Exception("Cancelled.");
                }
            }

            outputStream = new FileOutputStream(thumbnailFile);

            if (item.name.toLowerCase().endsWith(".png") || item.name.toLowerCase().endsWith(".jpg") || item.name.toLowerCase().endsWith(".jpeg") || item.name.toLowerCase().endsWith(".gif") || item.name.toLowerCase().endsWith(".webp")) {
                final BitmapFactory.Options options = new BitmapFactory.Options();

                options.inJustDecodeBounds = true;

                BitmapFactory.decodeFile(downloadedFile.getAbsolutePath(), options);

                options.inSampleSize = FilenDocumentsProviderUtils.calculateInSampleSize(options, sizeHint.x, sizeHint.y);
                options.inJustDecodeBounds = false;

                final Bitmap scaledBitmap = BitmapFactory.decodeFile(downloadedFile.getAbsolutePath(), options);

                if (scaledBitmap == null) {
                    throw new FileNotFoundException("Could not decode file into a bitmap.");
                }

                float ratio = Math.min((float) sizeHint.x / scaledBitmap.getWidth(), (float) sizeHint.y / scaledBitmap.getHeight());
                final int width = Math.round(ratio * scaledBitmap.getWidth());
                final int height = Math.round(ratio * scaledBitmap.getHeight());
                final Bitmap thumbnail = Bitmap.createScaledBitmap(scaledBitmap, width, height, false);
                scaledBitmap.recycle();

                thumbnail.compress(Bitmap.CompressFormat.JPEG, 90, outputStream);

                if (!thumbnailFile.exists()) {
                    throw new Exception("Could not write thumbnail file for thumbnail creation.");
                }

                if (signal != null) {
                    if (signal.isCanceled()) {
                        throw new Exception("Cancelled.");
                    }
                }

                return new AssetFileDescriptor(ParcelFileDescriptor.open(thumbnailFile, ParcelFileDescriptor.MODE_READ_ONLY), 0, thumbnailFile.length());
            } else {
                throw new Exception("File extension not supported.");
            }
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "openDocumentThumbnail error: " + e.getMessage());

            throw new FileNotFoundException("Could not open thumbnail for document " + documentId);
        } finally {
            if (outputStream != null) {
                try {
                    outputStream.close();
                } catch (IOException e) {
                    throw new FileNotFoundException("Could not open thumbnail for document " + documentId);
                }
            }
        }
    }

    @Override
    public String renameDocument (String documentId, String displayName) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "renameDocument: " + documentId + ", " + displayName);

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || FilenDocumentsProviderUtils.getDefaultDriveUUID().length() == 0) {
            throw new FileNotFoundException("Please authenticate.");
        }

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            throw new FileNotFoundException("Document " + documentId + " not found.");
        }

        try {
            if (item.type.equals("folder")) {
                FilenDocumentsProviderUtils.renameFolder(item.uuid, displayName);
            } else {
                FilenDocumentsProviderUtils.renameFile(item.uuid, displayName);
            }

            executor.submit(() -> FilenDocumentsProviderUtils.updateFolderContent(item.parent, err -> {
                if (err == null) {
                    notifyChange(item.parent);
                }
            }));
        } catch (Exception e) {
            e.printStackTrace();

            throw new FileNotFoundException("Could not rename document " + documentId);
        }

        return null;
    }

    @Override
    public String moveDocument (String sourceDocumentId, String sourceParentDocumentId, String targetParentDocumentId) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "moveDocument: " + sourceDocumentId + ", " + sourceParentDocumentId + ", " + targetParentDocumentId);

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || FilenDocumentsProviderUtils.getDefaultDriveUUID().length() == 0) {
            throw new FileNotFoundException("Please authenticate.");
        }

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(sourceDocumentId);

        if (item == null) {
            throw new FileNotFoundException("Document " + sourceDocumentId + " not found.");
        }

        final Item parentItem = FilenDocumentsProviderUtils.getItemFromDocumentId(targetParentDocumentId);

        if (parentItem == null) {
            throw new FileNotFoundException("Document target " + targetParentDocumentId + " not found.");
        }

        try {
            FilenDocumentsProviderUtils.moveItem(item, targetParentDocumentId);

            executor.submit(() -> FilenDocumentsProviderUtils.updateFolderContent(item.parent, err -> {
                if (err == null) {
                    notifyChange(item.parent);
                }
            }));

            executor.submit(() -> FilenDocumentsProviderUtils.updateFolderContent(targetParentDocumentId, err -> {
                if (err == null) {
                    notifyChange(targetParentDocumentId);
                }
            }));
        } catch (Exception e) {
            e.printStackTrace();

            throw new FileNotFoundException("Could not move document " + sourceDocumentId + " to " + targetParentDocumentId);
        }

        return sourceDocumentId;
    }

    private void recursiveRevokePermission (String documentId) {
        Log.d("FilenDocumentsProvider", "recursiveRevokePermission: " + documentId);

        Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            return;
        }

        if (item.type.equals("folder")) {
            Cursor dbCursor = null;

            try {
                dbCursor = SQLiteHelper.getInstance().rawQuery("SELECT `uuid` FROM `items` WHERE `parent` = ?", new String[]{ documentId });

                while (dbCursor.moveToNext()) {
                    recursiveRevokePermission(dbCursor.getString(0));
                }
            } catch (Exception e) {
                e.printStackTrace();

                Log.d("FilenDocumentsProvider", "recursiveRevokePermission error: " + e.getMessage());
            } finally {
                if (dbCursor != null) {
                    dbCursor.close();
                }
            }
        }

        revokeDocumentPermission(documentId);
    }

    private NotificationManager getNotificationManager (Context context) {
        if (!didCreateNotificationManager) {
            didCreateNotificationManager = true;

            final NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            final NotificationChannel channel = new NotificationChannel("transfers_channel", "Transfers", NotificationManager.IMPORTANCE_LOW);

            manager.createNotificationChannel(channel);

            notificationManager = manager;
        }

        return notificationManager;
    }

    private void notifyRootsChanged () {
        try {
            Uri rootsURI = DocumentsContract.buildRootsUri(AUTHORITY);

            Objects.requireNonNull(getContext()).getContentResolver().notifyChange(rootsURI, null);

            Log.d("FilenDocumentsProvider", "notifyRootsChanged");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void notifyChange (String documentId) {
        try {
            Objects.requireNonNull(getContext()).getContentResolver().notifyChange(getNotifyURI(documentId), null, false);

            Log.d("FilenDocumentsProvider", "notifyChange: " + documentId);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private Uri getNotifyURI (String documentId) {
        if (FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(documentId)) {
            return DocumentsContract.buildRootsUri(AUTHORITY);
        }

        return DocumentsContract.buildDocumentUri(AUTHORITY, documentId);
    }

    public static Integer getDefaultFolderFlags () {
        return Document.FLAG_SUPPORTS_RENAME | Document.FLAG_SUPPORTS_DELETE | Document.FLAG_SUPPORTS_MOVE | Document.FLAG_SUPPORTS_WRITE | Document.FLAG_DIR_SUPPORTS_CREATE;
    }

    public static Integer getDefaultFileFlags () {
        return Document.FLAG_SUPPORTS_RENAME | Document.FLAG_SUPPORTS_DELETE | Document.FLAG_SUPPORTS_MOVE | Document.FLAG_SUPPORTS_WRITE | Document.FLAG_SUPPORTS_REMOVE;
    }

    public static Integer getFileFlags (String name) {
        if (name.toLowerCase().endsWith(".png") || name.toLowerCase().endsWith(".jpg") || name.toLowerCase().endsWith(".jpeg") || name.toLowerCase().endsWith(".gif") || name.toLowerCase().endsWith(".webp")) {
            return getDefaultFileFlags() | Document.FLAG_SUPPORTS_THUMBNAIL;
        }

        return getDefaultFileFlags();
    }

    public static Integer getDefaultRootFlags () {
        return Document.FLAG_SUPPORTS_WRITE | Document.FLAG_DIR_SUPPORTS_CREATE | Root.FLAG_SUPPORTS_RECENTS | Root.FLAG_SUPPORTS_SEARCH | Root.FLAG_SUPPORTS_IS_CHILD | Root.FLAG_SUPPORTS_CREATE;
    }

    public static String[] getDefaultRootProjection () {
        return new String[]{
                Root.COLUMN_ROOT_ID,
                Root.COLUMN_DOCUMENT_ID,
                Root.COLUMN_CAPACITY_BYTES,
                Root.COLUMN_FLAGS,
                Root.COLUMN_MIME_TYPES,
                Root.COLUMN_AVAILABLE_BYTES,
                Root.COLUMN_TITLE,
                Root.COLUMN_ICON
        };
    }

    public static String[] getDefaultDocumentProjection () {
        return new String[]{
                Document.COLUMN_DOCUMENT_ID,
                Document.COLUMN_DISPLAY_NAME,
                Document.COLUMN_SIZE,
                Document.COLUMN_MIME_TYPE,
                Document.COLUMN_LAST_MODIFIED,
                Document.COLUMN_FLAGS
        };
    }
}

