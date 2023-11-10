package io.filen.app;

import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract.Document;
import android.provider.DocumentsContract.Root;
import android.provider.DocumentsContract;
import android.provider.DocumentsProvider;
import android.util.AtomicFile;
import android.util.Log;

import androidx.annotation.Nullable;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
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

    @Override
    public boolean onCreate () {
        final Context context = getContext();

        MMKVHelper.initialize(context);
        SQLiteHelper.initialize(context);

        return true;
    }

    @Override
    public Cursor queryRoots (String[] projection) throws FileNotFoundException {
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

        Log.d("FilenDocumentsProvider", "Root folder created, UUID: " + defaultDriveUUID);

        return result;
    }

    @Override
    public Cursor queryDocument (String documentId, String[] projection) throws FileNotFoundException {
        final MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());
        final String defaultDriveUUID = FilenDocumentsProviderUtils.getDefaultDriveUUID();

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn() || defaultDriveUUID.length() == 0) {
            return result;
        }

        MatrixCursor.RowBuilder row = result.newRow();

        if (documentId.equals(defaultDriveUUID)) {
            row.add(Document.COLUMN_DOCUMENT_ID, defaultDriveUUID);
            row.add(Document.COLUMN_DISPLAY_NAME, "Filen");
            row.add(Document.COLUMN_SIZE, 0);
            row.add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR);
            row.add(Document.COLUMN_LAST_MODIFIED, System.currentTimeMillis());
            row.add(Document.COLUMN_FLAGS, getDefaultRootFlags());
        } else {
            Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

            if (item == null) {
                throw new FileNotFoundException("Document " + documentId + " not found.");
            }

            row.add(Document.COLUMN_DOCUMENT_ID, item.uuid);
            row.add(Document.COLUMN_DISPLAY_NAME, item.name);

            if (item.type.equals("file")) {
                row.add(Document.COLUMN_SIZE, item.size);
                row.add(Document.COLUMN_MIME_TYPE, item.mime.length() > 0 ? item.mime : "application/octet-stream");
                row.add(Document.COLUMN_LAST_MODIFIED, item.lastModified > 0 ? item.lastModified : item.timestamp);
                row.add(Document.COLUMN_FLAGS, getDefaultFileFlags());
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
                    if (defaultDriveUUID.equals(parentDocumentId)) {
                        notifyRootsChanged();
                    } else {
                        notifyChange(parentDocumentId);
                    }
                }
            }));
        }

        return super.refresh(uri, extras, cancellationSignal);
    }

    @Override
    public Cursor queryChildDocuments (String parentDocumentId, String[] projection, String sortOrder) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "queryChildDocuments: " + parentDocumentId);

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(parentDocumentId);

        if (item == null && !FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(parentDocumentId)) {
            throw new FileNotFoundException("Document " + parentDocumentId + " not found.");
        }

        queryChildDocumentsCurrentParent = parentDocumentId;

        final MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn()) {
            return result;
        }

        result.setNotificationUri(Objects.requireNonNull(getContext()).getContentResolver(), getNotifyURI(parentDocumentId));

        if (!queryChildDocumentsLastParent.equals(parentDocumentId) && queryChildDocumentsCurrentParent.equals(parentDocumentId)) {
            queryChildDocumentsLastParent = parentDocumentId;

            executor.submit(() -> FilenDocumentsProviderUtils.updateFolderContent(parentDocumentId, err -> {
                if (err == null) {
                    if (FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(parentDocumentId)) {
                        notifyRootsChanged();
                    } else {
                        notifyChange(parentDocumentId);
                    }
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
                    row.add(Document.COLUMN_FLAGS, getDefaultFileFlags());
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
    public String createDocument (String parentDocumentId, String mimeType, String displayName) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "createDocument: " + parentDocumentId + ", mimeType: " + mimeType + ", displayName: " + displayName);

        try {
            final String uuid = UUID.randomUUID().toString();
            final Object lock = new Object();
            final AtomicBoolean created = new AtomicBoolean(false);
            final AtomicBoolean didError = new AtomicBoolean(false);

            final Thread thread = new Thread(() -> {
                try {
                    if (Document.MIME_TYPE_DIR.equalsIgnoreCase(mimeType)) {
                        FilenDocumentsProviderUtils.createFolder(parentDocumentId, uuid, displayName, err -> {
                            if (err == null) {
                                if (FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(parentDocumentId)) {
                                    notifyRootsChanged();
                                } else {
                                    notifyChange(parentDocumentId);
                                }
                            } else {
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
                            if (err == null) {
                                if (FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(parentDocumentId)) {
                                    notifyRootsChanged();
                                } else {
                                    notifyChange(parentDocumentId);
                                }
                            } else {
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
                    e.printStackTrace();

                    Log.d("FilenDocumentsProvider", "createDocument error: " + e.getMessage());
                }
            });

            thread.start();
            thread.join();

            if (!created.get() || didError.get()) {
                throw new Exception("Could not create document.");
            }

            return uuid;
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "createDocument error: " + e.getMessage());

            throw new FileNotFoundException("Could not create document.");
        }
    }

    @Override
    public String copyDocument (String sourceDocumentId, String targetParentDocumentId) throws FileNotFoundException {
        throw new FileNotFoundException("Operation not supported.");
    }

    @Override
    public void removeDocument(String documentId, String parentDocumentId) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "removeDocument: " + documentId + ", parent: " + parentDocumentId);

        deleteDocument(documentId);
    }

    @Override
    public void deleteDocument(String documentId) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "deleteDocument: " + documentId);

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            throw new FileNotFoundException("Document " + documentId + " not found.");
        }

        recursiveRevokePermission(documentId);

        executor.submit(() -> FilenDocumentsProviderUtils.trashDocument(item.uuid, err -> {
            if (err == null) {
                if (FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(item.parent)) {
                    notifyRootsChanged();
                } else {
                    notifyChange(item.parent);
                }
            }
        }));
    }

    @Override
    public Cursor querySearchDocuments (String rootId, String query, String[] projection) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "querySearchDocuments: " + rootId + ", query: " + query);

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(rootId);

        if (item == null && !FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(rootId)) {
            throw new FileNotFoundException("Document " + rootId + " not found.");
        }

        final MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn()) {
            return result;
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
                        row.add(Document.COLUMN_FLAGS, getDefaultFileFlags());
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

        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(rootId);

        if (item == null && !FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(rootId)) {
            throw new FileNotFoundException("Document " + rootId + " not found.");
        }

        final MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn()) {
            return result;
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
                    row.add(Document.COLUMN_FLAGS, getDefaultFileFlags());
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
        final Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            throw new FileNotFoundException("Document " + documentId + " not found.");
        }

        final int accessMode = ParcelFileDescriptor.parseMode(mode);
        final AtomicBoolean didDownload = new AtomicBoolean(false);

        final Thread downloadThread = new Thread(() -> {
            try {
                File downloadedFile = FilenDocumentsProviderUtils.downloadFile(Objects.requireNonNull(getContext()), item, false, item.chunks, signal);

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

            throw new FileNotFoundException("Document " + documentId + " download error.");
        }

        if (!didDownload.get()) {
            throw new FileNotFoundException("Document " + documentId + " download error.");
        }

        try {
            final Context context = Objects.requireNonNull(getContext());
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

                                    FilenDocumentsProviderUtils.uploadFile(downloadedFile, item.parent, uuid);
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

    private void notifyRootsChanged() {
        try {
            Uri rootsURI = DocumentsContract.buildRootsUri(AUTHORITY);

            Objects.requireNonNull(getContext()).getContentResolver().notifyChange(rootsURI, null);

            Log.d("FilenDocumentsProvider", "notifyRootsChanged");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void notifyChange(String documentId) {
        try {
            Objects.requireNonNull(getContext()).getContentResolver().notifyChange(getNotifyURI(documentId), null, false);

            Log.d("FilenDocumentsProvider", "notifyChange: " + documentId);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private Uri getNotifyURI(String documentId) {
        if (FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(documentId)) {
            return DocumentsContract.buildRootsUri(AUTHORITY);
        }

        return DocumentsContract.buildDocumentUri(AUTHORITY, documentId);
    }

    private Integer getDefaultFolderFlags() {
        return Document.FLAG_SUPPORTS_RENAME | Document.FLAG_SUPPORTS_DELETE | Document.FLAG_SUPPORTS_MOVE | Document.FLAG_SUPPORTS_WRITE | Document.FLAG_DIR_SUPPORTS_CREATE;
    }

    private Integer getDefaultFileFlags() {
        return Document.FLAG_SUPPORTS_RENAME | Document.FLAG_SUPPORTS_DELETE | Document.FLAG_SUPPORTS_MOVE | Document.FLAG_SUPPORTS_WRITE;
    }

    private Integer getDefaultRootFlags() {
        return Document.FLAG_SUPPORTS_WRITE | Document.FLAG_DIR_SUPPORTS_CREATE | Root.FLAG_SUPPORTS_RECENTS | Root.FLAG_SUPPORTS_SEARCH | Root.FLAG_SUPPORTS_IS_CHILD | Root.FLAG_SUPPORTS_CREATE;
    }

    private String[] getDefaultRootProjection() {
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

    private String[] getDefaultDocumentProjection() {
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

