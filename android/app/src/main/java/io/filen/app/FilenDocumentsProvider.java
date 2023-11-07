package io.filen.app;

import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract.Document;
import android.provider.DocumentsContract.Root;
import android.provider.DocumentsContract;
import android.provider.DocumentsProvider;
import android.util.Log;

import androidx.annotation.Nullable;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class FilenDocumentsProvider extends DocumentsProvider {
    private final String AUTHORITY = "io.filen.app.documents";
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private String queryChildDocumentsLastParent = "";
    private String queryChildDocumentsCurrentParent = "";

    @Override
    public boolean onCreate() {
        Context context = getContext();

        MMKVHelper.initialize(context);
        SQLiteHelper.initialize(context);

        return true;
    }

    @Override
    public Cursor queryRoots(String[] projection) throws FileNotFoundException {
        final MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultRootProjection());
        String defaultDriveUUID = FilenDocumentsProviderUtils.getDefaultDriveUUID();

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
    public Cursor queryDocument(String documentId, String[] projection) throws FileNotFoundException {
        MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());
        String defaultDriveUUID = FilenDocumentsProviderUtils.getDefaultDriveUUID();

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
    public boolean refresh(Uri uri, @Nullable Bundle extras, @Nullable CancellationSignal cancellationSignal) {
        String parentDocumentId = uri.getLastPathSegment();
        String defaultDriveUUID = FilenDocumentsProviderUtils.getDefaultDriveUUID();
        boolean canRefresh = false;
        Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(parentDocumentId);

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
    public Cursor queryChildDocuments(String parentDocumentId, String[] projection, String sortOrder) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "queryChildDocuments: " + parentDocumentId);

        Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(parentDocumentId);

        if (item == null && !FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(parentDocumentId)) {
            throw new FileNotFoundException("Document " + parentDocumentId + " not found.");
        }

        queryChildDocumentsCurrentParent = parentDocumentId;

        MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());

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
    public ParcelFileDescriptor openDocument(String documentId, String mode, @Nullable CancellationSignal signal) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "openDocument: " + documentId + ", mode: " + mode);

        if (FilenDocumentsProviderUtils.needsBiometricAuth() || !FilenDocumentsProviderUtils.isLoggedIn()) {
            throw new FileNotFoundException("Not authenticated.");
        }

        Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            throw new FileNotFoundException("Document " + documentId + " not found.");
        }

        throw new FileNotFoundException("Document " + documentId + " not found.");
    }

    @Override
    public String createDocument (String parentDocumentId, String mimeType, String displayName) throws FileNotFoundException {
        Log.d("FilenDocumentsProvider", "createDocument: " + parentDocumentId + ", mimeType: " + mimeType + ", displayName: " + displayName);

        throw new FileNotFoundException("Document " + parentDocumentId + " not found.");
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

        Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

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

        Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(rootId);

        if (item == null && !FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(rootId)) {
            throw new FileNotFoundException("Document " + rootId + " not found.");
        }

        MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());

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

        Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(rootId);

        if (item == null && !FilenDocumentsProviderUtils.getDefaultDriveUUID().equals(rootId)) {
            throw new FileNotFoundException("Document " + rootId + " not found.");
        }

        MatrixCursor result = new MatrixCursor(projection != null ? projection : getDefaultDocumentProjection());

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

        Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            return false;
        }

        String defaultDriveUUID = FilenDocumentsProviderUtils.getDefaultDriveUUID();

        if (item.parent.equals(parentDocumentId) || defaultDriveUUID.equals(parentDocumentId)) {
            return true;
        }

        boolean found = false;
        String currentParent = item.parent;
        int maxIterations = 100000;
        int currentIterations = 0;

        try {
            while (!found && currentIterations < maxIterations) {
                Item parent = FilenDocumentsProviderUtils.getItemFromDocumentId(currentParent);

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
        Item item = FilenDocumentsProviderUtils.getItemFromDocumentId(documentId);

        if (item == null) {
            throw new FileNotFoundException("Document " + documentId + " not found.");
        }

        return FilenDocumentsProviderUtils.getMimeTypeFromName(item.name);
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

