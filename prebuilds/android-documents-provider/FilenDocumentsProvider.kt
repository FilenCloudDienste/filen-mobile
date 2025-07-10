package io.filen.app

import android.app.AuthenticationRequiredException
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.res.AssetFileDescriptor
import android.database.Cursor
import android.database.MatrixCursor
import android.graphics.Point
import android.net.Uri
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Handler
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document
import android.provider.DocumentsContract.Root
import android.provider.DocumentsProvider
import android.security.keystore.UserNotAuthenticatedException
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import uniffi.filen_mobile_native_cache.FfiNonRootObject
import uniffi.filen_mobile_native_cache.FfiObject
import uniffi.filen_mobile_native_cache.FilenMobileCacheState
import uniffi.filen_mobile_native_cache.ProgressCallback
import java.io.File
import java.io.FileNotFoundException
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import uniffi.filen_mobile_native_cache.CacheException
import uniffi.filen_mobile_native_cache.ThumbnailResult

const val DIR_UPDATE_INTERVAL = 15_000L // 15 seconds
const val ROOT_UPDATE_INTERVAL = 60_000L // 1 minute

class FilenDocumentsProvider : DocumentsProvider() {
    // very frustrating that this is nullable,
    // but we cannot initialize it in the constructor because the context is not available yet
    // thanks android!
    private var state: FilenMobileCacheState? = null
    private var rootUuid: String? = null
        get() {
            if (field != null) return field
            field = try {
                state?.rootUuid()
            } catch (e: CacheException) {
                throw convertCacheException(e)
            }
            return field
        }
    private val AUTHORITY = "io.filen.app.documentsprovider"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var notificationManager: NotificationManager? = null
    private var notificationIdCounter = 0

    private fun initializeClient(filesPath: String): FilenMobileCacheState {
        return FilenMobileCacheState(
            filesPath,
            "$filesPath/auth.json"
        )
    }

    override fun onCreate(): Boolean {
        this.state = initializeClient(context!!.filesDir.path)
        val manager: Any? = context!!.getSystemService(Context.NOTIFICATION_SERVICE)
        manager as NotificationManager
        val channel =
            NotificationChannel("transfers_channel", "Transfer", NotificationManager.IMPORTANCE_LOW)
        manager.createNotificationChannel(channel)
        notificationManager = manager
        return true

    }

    override fun queryRoots(projection: Array<out String>?): Cursor {
        Log.d(
            "FilenDocumentsProvider",
            "Querying roots with projection: ${projection?.joinToString() ?: "null"}"
        )
        val result = MatrixCursor(projection ?: getRootProjection())

        val root = try {
            state!!.queryRootsInfo(rootUuid!!)!!
        } catch (e: CacheException) {
            when (e) {
                is CacheException.Unauthenticated -> return result
                is CacheException.Disabled -> return result
                else -> throw convertCacheException(e)
            }
        } catch (e: AuthenticationRequiredException) {
            return result
        }
        val row = result.newRow()
        row.add(Root.COLUMN_ROOT_ID, rootUuid!!)
        row.add(Root.COLUMN_DOCUMENT_ID, rootUuid!!)
        row.add(Root.COLUMN_CAPACITY_BYTES, root.maxStorage ?: 0)
        row.add(
            Root.COLUMN_AVAILABLE_BYTES,
            root.maxStorage - root.storageUsed
        )
        row.add(Root.COLUMN_MIME_TYPES, "*/*")
        row.add(Root.COLUMN_TITLE, "Filen")
        // we get this dynamically because doing it at compile time wasn't working
        // ideally this should instead be R.mipmap.ic_launcher
        row.add(
            Root.COLUMN_ICON,
            context!!.resources.getIdentifier("ic_launcher", "mipmap", context!!.packageName)
        )
        row.add(Root.COLUMN_FLAGS, Root.FLAG_SUPPORTS_CREATE)

        val rootUri = getNotifyURI(root.uuid)
        result.setNotificationUri(context!!.contentResolver, rootUri)

        val now = System.currentTimeMillis()
        if (now > root.lastUpdated + ROOT_UPDATE_INTERVAL) {
            val extras = Bundle()
            extras.putBoolean(DocumentsContract.EXTRA_LOADING, true)
            result.extras = extras
            scope.launch {
                try {
                    state!!.updateRootsInfo()
                } catch (e: CacheException) {
                    throw convertCacheException(e)
                }
                context!!.contentResolver.notifyChange(
                    rootUri,
                    null,
                )
            }
        }


        return result
    }

    private fun getNotifyURI(documentId: String): Uri {
        if (rootUuid!! == documentId) {
            return DocumentsContract.buildRootsUri(AUTHORITY)
        }
        return DocumentsContract.buildDocumentUri(AUTHORITY, documentId)
    }

    override fun queryDocument(
        documentId: String?,
        projection: Array<out String>?,
    ): Cursor {
        documentId!!
        val result = MatrixCursor(projection ?: getDocumentProjection())
        val row = result.newRow()
        var actualId = documentId
        if (actualId == "null") {
            actualId = rootUuid
        }
        actualId!!
        if (actualId == rootUuid) {
            addRootRow(row, actualId)
        } else {
            val item = try {
                state!!.queryItem(actualId)
            } catch (e: CacheException) {
                throw convertCacheException(e)
            }
                ?: throw IllegalArgumentException("Document with ID $documentId not found")
            when (item) {
                is FfiObject.File -> {
                    val file = item.v1
                    row.add(Document.COLUMN_DOCUMENT_ID, actualId)
                    row.add(Document.COLUMN_DISPLAY_NAME, file.name)
                    row.add(Document.COLUMN_SIZE, file.size)
                    row.add(
                        Document.COLUMN_MIME_TYPE, file.mime.ifEmpty { "application/octet-stream" })
                    row.add(Document.COLUMN_LAST_MODIFIED, file.modified)
                    row.add(Document.COLUMN_FLAGS, getFileFlags(file.name))
                }

                is FfiObject.Dir -> {
                    val dir = item.v1
                    row.add(Document.COLUMN_DOCUMENT_ID, actualId)
                    row.add(Document.COLUMN_DISPLAY_NAME, dir.name)
                    row.add(Document.COLUMN_SIZE, 0)
                    row.add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR)
                    row.add(Document.COLUMN_LAST_MODIFIED, dir.created)
                    row.add(Document.COLUMN_FLAGS, getDefaultFolderFlags())
                }

                is FfiObject.Root -> {
                    addRootRow(row, actualId)
                }
            }
        }
        return result;
    }

    private fun addObjectsToCursor(
        result: MatrixCursor,
        objects: List<FfiNonRootObject>,
        idMaker: (FfiNonRootObject) -> String
    ) {
        for (obj in objects) {
            val row = result.newRow()
            when (obj) {
                is FfiNonRootObject.File -> {
                    val file = obj.v1
                    row.add(Document.COLUMN_DOCUMENT_ID, idMaker(obj))
                    row.add(Document.COLUMN_DISPLAY_NAME, file.name)
                    row.add(Document.COLUMN_SIZE, file.size)
                    row.add(
                        Document.COLUMN_MIME_TYPE, file.mime.ifEmpty { "application/octet-stream" })
                    row.add(Document.COLUMN_LAST_MODIFIED, file.modified)
                    row.add(Document.COLUMN_FLAGS, getFileFlags(file.name))
                }

                is FfiNonRootObject.Dir -> {
                    val dir = obj.v1
                    row.add(Document.COLUMN_DOCUMENT_ID, idMaker(obj))
                    row.add(Document.COLUMN_DISPLAY_NAME, dir.name)
                    row.add(Document.COLUMN_SIZE, 0)
                    row.add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR)
                    row.add(Document.COLUMN_LAST_MODIFIED, 0)
                    row.add(Document.COLUMN_FLAGS, getDefaultFolderFlags())
                }
            }
        }
    }

    override fun queryChildDocuments(
        parentDocumentId: String?,
        projection: Array<out String>?,
        orderBy: String?,
    ): Cursor {
        parentDocumentId!!
        val result = MatrixCursor(projection ?: getDocumentProjection())
        val resp = try {
            state!!.queryDirChildren(parentDocumentId, orderBy) ?: return result
        } catch (e: CacheException) {
            throw convertCacheException(e)
        }

        this.addObjectsToCursor(result, resp.objects, { obj: FfiNonRootObject ->
            "$parentDocumentId/" + when (obj) {
                is FfiNonRootObject.File -> {
                    obj.v1.name
                }

                is FfiNonRootObject.Dir -> {
                    obj.v1.name
                }
            }
        })

        val now = System.currentTimeMillis()
        val notifyUri = getNotifyURI(parentDocumentId)
        result.setNotificationUri(context!!.contentResolver, notifyUri)

        Log.d(
            "FilenDocumentsProvider",
            "Querying child documents for: $parentDocumentId, lastListed: ${resp.parent.lastListed}, now: $now"
        )
        if (now > resp.parent.lastListed + DIR_UPDATE_INTERVAL) {
            val extras = Bundle()
            extras.putBoolean(DocumentsContract.EXTRA_LOADING, true)
            result.extras = extras
            scope.launch {
                try {
                    state!!.updateDirChildren(parentDocumentId)

                } catch (e: CacheException) {
                    throw convertCacheException(e)
                }
                context!!.contentResolver.notifyChange(
                    notifyUri,
                    null,
                )
            }
        }

        return result;
    }

    override fun queryRecentDocuments(
        rootId: String,
        projection: Array<out String>?,
        queryArgs: Bundle?,
        signal: CancellationSignal?
    ): Cursor {
        Log.d("FilenDocumentsProvider", "query recents")
        val result = MatrixCursor(projection ?: getDocumentProjection())

        val resp = runBlocking {
            val job = async {
                try {
                    state!!.updateAndQueryRecents(null)
                } catch (e: CacheException) {
                    throw convertCacheException(e)
                }
            }

            signal?.setOnCancelListener {   
                job.cancel()
            }

            job.await()
        }

        this.addObjectsToCursor(result, resp.objects, { obj: FfiNonRootObject ->
            "recents/" + when (obj) {
                is FfiNonRootObject.File -> {
                    obj.v1.uuid
                }

                is FfiNonRootObject.Dir -> {
                    obj.v1.uuid
                }
            }
        })

        return result
    }

    override fun refresh(
        uri: Uri?, extras: Bundle?, cancellationSignal: CancellationSignal?
    ): Boolean {
        Log.d("FilenDocumentsProvider", "Refresh called with uri: $uri")

        val path = getDocumentIdFromPath(uri)!!
        val item = try {
            state!!.queryItem(getDocumentIdFromPath(uri)!!)
        } catch (e: CacheException) {
            throw convertCacheException(e)
        }
        if (item == null) {
            Log.e("FilenDocumentsProvider", "Item not found for uri: $uri")
            return false
        }

        val job: Job

        when (item) {
            is FfiObject.Dir -> {
                job = scope.launch {
                    if (item.v1.lastListed + DIR_UPDATE_INTERVAL < System.currentTimeMillis()) {
                        try {
                            state!!.updateDirChildren(item.v1.uuid)
                        } catch (e: CacheException) {
                            throw convertCacheException(e)
                        }
                        context!!.contentResolver.notifyChange(
                            getNotifyURI(item.v1.uuid),
                            null,
                        )
                    }
                }
            }

            is FfiObject.Root -> {
                job = scope.launch {
                    awaitAll(
                        async {
                            if (item.v1.lastListed + DIR_UPDATE_INTERVAL < System.currentTimeMillis()) {
                                try {
                                    state!!.updateDirChildren(item.v1.uuid)
                                } catch (e: CacheException) {
                                    throw convertCacheException(e)
                                }
                            }
                        },
                        async {
                            if (item.v1.lastUpdated + ROOT_UPDATE_INTERVAL < System.currentTimeMillis()) {
                                try {
                                    state!!.updateRootsInfo()
                                } catch (e: CacheException) {
                                    throw convertCacheException(e)
                                }
                            }
                        }
                    )
                    context!!.contentResolver.notifyChange(
                        getNotifyURI(item.v1.uuid),
                        null,
                    )
                }
            }

            is FfiObject.File -> {
                Log.w("FilenDocumentsProvider", "Tried to refresh file: $path")
                return false;
            }
        }

        cancellationSignal?.setOnCancelListener {
            job.cancel("Refresh cancelled by caller")
        }
        return true;
    }

    override fun openDocument(
        documentId: String?,
        mode: String?,
        signal: CancellationSignal?,
    ): ParcelFileDescriptor {
        documentId!!
        val accessMode = ParcelFileDescriptor.parseMode(mode)

        val fd = runBlocking {
            Log.d("FilenDocumentsProvider", "Opening document: $documentId with mode: $mode")
            try {
                signal?.throwIfCanceled()

                val builder = NotificationCompat.Builder(context!!, "transfers_channel").apply {
                    setContentTitle("Filen")
                    setContentText("Downloading")
                    setSmallIcon(
                        context!!.resources.getIdentifier(
                            "ic_launcher",
                            "mipmap",
                            context!!.packageName
                        )
                    )
                    setOngoing(true)
                    setOnlyAlertOnce(true)
                    setProgress(100, 0, false)
                }
                val nManager = notificationManager!!
                val id = notificationIdCounter++
                nManager.notify(id, builder.build())

                // todo, do not download if we only want to write to the file
                val pathJob = async {
                    try {
                        state!!.downloadFileIfChangedByPath(
                            documentId,
                            ProgressNotifier(nManager, builder, id)
                        )
                    } catch (e: CacheException) {
                        throw convertCacheException(e)
                    }

                }
                signal?.setOnCancelListener {
                    pathJob.cancel("Download cancelled by caller")
                }
                val path = pathJob.await()

                val file = File(path)

                if (!file.exists()) {
                    throw FileNotFoundException("File not found: $path")
                }

                signal?.throwIfCanceled()

                when {
                    accessMode == ParcelFileDescriptor.MODE_READ_ONLY -> {
                        ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
                    }

                    else -> {
                        Log.d("FilenDocumentsProvider", "Opening file for writing: $documentId")
                        // this can be improved because we do not need to download the file if we only want to write to it
                        val handler = Handler(context!!.mainLooper)

                        ParcelFileDescriptor.open(file, accessMode, handler, { exception ->
                            Log.d(
                                "FilenDocumentsProvider",
                                "File opened with exception: $exception"
                            )
                            if (exception != null) {
                                Log.e(
                                    "FilenDocumentsProvider",
                                    "Error opening document $documentId: ${exception.message}"
                                )
                            } else {
                                scope.launch {
                                    val uploadBuilder =
                                        NotificationCompat.Builder(context!!, "transfers_channel")
                                            .apply {
                                                setContentTitle("Filen")
                                                setContentText("Downloading")
                                                setSmallIcon(
                                                    context!!.resources.getIdentifier(
                                                        "ic_launcher",
                                                        "mipmap",
                                                        context!!.packageName
                                                    )
                                                )
                                                setOngoing(true)
                                                setOnlyAlertOnce(true)
                                                setProgress(100, 0, false)
                                            }
                                    val uploadId = notificationIdCounter++
                                    nManager.notify(uploadId, uploadBuilder.build())

                                    val updated = try {
                                        state!!.uploadFileIfChanged(
                                            documentId,
                                            ProgressNotifier(nManager, uploadBuilder, uploadId)
                                        )
                                    } catch (e: CacheException) {
                                        throw convertCacheException(e)
                                    }
                                    if (updated) {
                                        context!!.contentResolver.notifyChange(
                                            getNotifyURI(documentId),
                                            null,
                                        )
                                    } else {
                                        // if the file was not updated, we still want to notify the user that the upload is complete
                                        // rust currently doesn't handle this
                                        uploadBuilder.setProgress(0, 0, false)
                                        nManager.notify(uploadId, uploadBuilder.build())
                                    }
                                }
                            }
                        })
                    }
                }
            } catch (e: Exception) {
                Log.e("FilenDocumentsProvider", "Error opening document $documentId: ${e.message}")
                throw FileNotFoundException("Document not found: $documentId: ${e.message}")
            }
        }
        Log.d("FilenDocumentsProvider", "Opened document: $documentId with fd: $fd")
        return fd
    }

    override fun openDocumentThumbnail(
        documentId: String?,
        sizeHint: Point?,
        signal: CancellationSignal?
    ): AssetFileDescriptor {
        val state = this.state

        val job = scope.async {

            val result =
                state!!.getThumbnail(documentId!!, sizeHint!!.x.toUInt(), sizeHint.y.toUInt())

            when (result) {
                is ThumbnailResult.Err -> throw convertCacheException(result.v1)
                ThumbnailResult.NoThumbnail -> throw FileNotFoundException("No thumbnail available for document: $documentId")
                ThumbnailResult.NotFound -> throw FileNotFoundException("$documentId not found")
                is ThumbnailResult.Ok -> {
                    val path = result.v1
                    val file = File(path)
                    AssetFileDescriptor(
                        ParcelFileDescriptor.open(
                            file,
                            ParcelFileDescriptor.MODE_READ_ONLY
                        ), 0, file.length()
                    )
                }
            }
        }

        signal?.setOnCancelListener {
            job.cancel("Thumbnail generation cancelled by caller")
        }

        return runBlocking {
            job.await()
        }
    }

    override fun createDocument(
        parentDocumentId: String?, mimeType: String?, displayName: String?
    ): String {
        parentDocumentId!!
        mimeType!!
        displayName!!
        return runBlocking {
            Log.d(
                "FilenDocumentsProvider",
                "Creating document: $displayName with mimeType: $mimeType in parent: $parentDocumentId"
            )
            val documentId: String
            if (mimeType.equals(Document.MIME_TYPE_DIR, true)) {
                // Create a new directory
                documentId = try {
                    state!!.createDir(parentDocumentId, displayName, null).id
                } catch (e: CacheException) {
                    throw convertCacheException(e)
                }
            } else {
                // Create a new file
                documentId = try {
                    state!!.createEmptyFile(parentDocumentId, displayName, mimeType).id
                } catch (e: CacheException) {
                    throw convertCacheException(e)
                }
            }
            val parentId =
                getParentId(documentId)!! // we can assume that the parent is not null because we successfully trashed the item

            context!!.contentResolver.notifyChange(
                getNotifyURI(parentId),
                null,
            )
            documentId
        }

    }

    override fun removeDocument(documentId: String?, parentDocumentId: String?) {
        this.deleteDocument(documentId)
    }

    override fun deleteDocument(documentId: String?) {
        runBlocking {
            try {
                state!!.trashItem(documentId!!)
            } catch (e: CacheException) {
                throw convertCacheException(e)
            }

            val parentId =
                getParentId(documentId)!! // we can assume that the parent is not null because we successfully trashed the item
            val descendants = try {
                state!!.getAllDescendantPaths(documentId)
            } catch (e: CacheException) {
                throw convertCacheException(e)
            }

            for (descendant in descendants) {
                revokeDocumentPermission(descendant)
            }

            context!!.contentResolver.notifyChange(
                getNotifyURI(parentId),
                null,
            )
        }
    }

    override fun isChildDocument(parentDocumentId: String?, documentId: String?): Boolean {
        return documentId?.startsWith(parentDocumentId ?: "") ?: false
    }

    override fun getDocumentType(documentId: String?): String {
        documentId!!
        val item = try {
            state!!.queryItem(documentId)
        } catch (e: CacheException) {
            throw convertCacheException(e)
        }
            ?: throw FileNotFoundException("Document with ID $documentId not found")
        return when (item) {
            is FfiObject.File -> item.v1.mime.ifEmpty { "application/octet-stream" }
            is FfiObject.Dir -> Document.MIME_TYPE_DIR
            is FfiObject.Root -> Document.MIME_TYPE_DIR
        }
    }

    override fun moveDocument(
        sourceDocumentId: String?,
        sourceParentDocumentId: String?,
        targetParentDocumentId: String?
    ): String {
        return runBlocking {
            val newId = try {
                state!!.moveItem(sourceDocumentId!!, targetParentDocumentId!!).id
            } catch (e: CacheException) {
                throw convertCacheException(e)
            }
            context!!.contentResolver.notifyChange(
                getNotifyURI(sourceParentDocumentId!!),
                null,
            )
            context!!.contentResolver.notifyChange(
                getNotifyURI(targetParentDocumentId),
                null,
            )
            newId
        }
    }

    override fun renameDocument(documentId: String?, displayName: String?): String? {
        return runBlocking {
            val newId = try {
                state!!.renameItem(documentId!!, displayName!!)?.id
            } catch (e: CacheException) {
                throw convertCacheException(e)
            }
            context!!.contentResolver.notifyChange(
                getNotifyURI(getParentId(documentId)!!),
                null,
            )
            newId
        }
    }

    private fun makeAuthException(core: Throwable): AuthenticationRequiredException {
        val intent = Intent().apply {
            setClassName(AUTHORITY, "io.filen.app.MainActivity")
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )


        return AuthenticationRequiredException(
            core,
            pendingIntent
        )
    }

    private fun convertCacheException(error: CacheException): Exception {
        return when (error) {
            is CacheException.Unauthenticated -> {
                makeAuthException(error)
            }

            is CacheException.Disabled -> {
                makeAuthException(error)
            }

            is CacheException.DoesNotExist -> {
                FileNotFoundException(error.v1.toString())
            }

            else -> error
        }
    }

    override fun shutdown() {
        // uniffi doesn't do this automatically for kotlin
        state?.close()
    }
}

private fun getDefaultFolderFlags(): Int =
    Document.FLAG_SUPPORTS_RENAME or Document.FLAG_SUPPORTS_DELETE or Document.FLAG_SUPPORTS_MOVE or Document.FLAG_SUPPORTS_WRITE or Document.FLAG_DIR_SUPPORTS_CREATE

private fun getDefaultFileFlags(): Int =
    Document.FLAG_SUPPORTS_RENAME or Document.FLAG_SUPPORTS_DELETE or Document.FLAG_SUPPORTS_MOVE or Document.FLAG_SUPPORTS_WRITE or Document.FLAG_SUPPORTS_REMOVE

private fun getDefaultRootFlags(): Int =
    Document.FLAG_SUPPORTS_WRITE or Document.FLAG_DIR_SUPPORTS_CREATE or Root.FLAG_SUPPORTS_IS_CHILD or Root.FLAG_SUPPORTS_CREATE or Root.FLAG_SUPPORTS_RECENTS // or Root.FLAG_SUPPORTS_SEARCH

private fun addRootRow(
    row: MatrixCursor.RowBuilder, rootUuid: String
) {
    row.add(Document.COLUMN_DOCUMENT_ID, rootUuid)
    row.add(Document.COLUMN_DISPLAY_NAME, "Filen")
    row.add(Document.COLUMN_SIZE, 0)
    row.add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR)
    row.add(Document.COLUMN_LAST_MODIFIED, System.currentTimeMillis())
    row.add(Document.COLUMN_FLAGS, getDefaultRootFlags())
}

private fun getRootProjection(): Array<String> = arrayOf(
    Root.COLUMN_ROOT_ID,
    Root.COLUMN_SUMMARY,
    Root.COLUMN_CAPACITY_BYTES,
    Root.COLUMN_FLAGS,
    Root.COLUMN_MIME_TYPES,
    Root.COLUMN_AVAILABLE_BYTES,
    Root.COLUMN_TITLE,
    Root.COLUMN_ICON,
)

private fun getDocumentProjection(): Array<String> = arrayOf(
    Document.COLUMN_DOCUMENT_ID,
    Document.COLUMN_DISPLAY_NAME,
    Document.COLUMN_SIZE,
    Document.COLUMN_MIME_TYPE,
    Document.COLUMN_LAST_MODIFIED,
    Document.COLUMN_FLAGS
)

val IMAGE_EXTENSIONS = arrayOf("png", "jpg", "jpeg", "gif", "webp")

private fun getFileFlags(name: String): Int {
    var flags = getDefaultFileFlags()
    val extension = name.lowercase().substringAfterLast(".")
    if (IMAGE_EXTENSIONS.contains(extension)) {
        flags = flags or Document.FLAG_SUPPORTS_THUMBNAIL
    }
    return flags
}

private fun getDocumentIdFromPath(path: Uri?): String? {
    val fullPath = path?.path;
    val documentId = fullPath?.removePrefix("/document")
    if (fullPath == documentId) {
        val rootId = fullPath?.removePrefix("/root")
        if (rootId == fullPath) {
            Log.e("FilenDocumentsProvider", "Invalid document ID: $fullPath")
            return null
        }
        return rootId
    }
    return documentId
}

private fun getParentId(documentId: String): String? {
    val trimmed = documentId.trimEnd('/')
    val lastSlashIndex = trimmed.lastIndexOf('/')
    return if (lastSlashIndex == -1) {
        null
    } else {
        trimmed.substring(0, lastSlashIndex)
    }
}

class ProgressNotifier(
    private val notificationManager: NotificationManager,
    private var builder: NotificationCompat.Builder,
    private val notificationId: Int
) :
    ProgressCallback {
    private var maxBytes = 0UL
    private var readBytes = 0UL

    override fun onProgress(bytesProcessed: ULong) {
        readBytes += bytesProcessed
        Log.d("Notifier", "Notifier $notificationId: $bytesProcessed bytes processed")
        if (readBytes >= maxBytes) {
            Log.d("Notifier", "Notifier $notificationId: completed")
            builder.setProgress(0, 0, false)
        } else {
            // we use 100 and divide because otherwise uploading a file > 2GB
            // will cause the progress to overflow since the progress bar uses an Int
            Log.d("Notifier", "Notifier $notificationId: $readBytes/$maxBytes bytes processed")
            builder.setProgress(100, (readBytes * 100UL / maxBytes).toInt(), false)
        }
        notificationManager.notify(notificationId, builder.build())
    }

    override fun setTotal(size: ULong) {
        maxBytes = size
    }
}

