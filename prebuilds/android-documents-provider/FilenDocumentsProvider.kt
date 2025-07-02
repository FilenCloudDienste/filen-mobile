package io.filen.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Handler
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document
import android.provider.DocumentsContract.Root
import android.provider.DocumentsContract.buildChildDocumentsUri
import android.provider.DocumentsProvider
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
import io.filen.app.R


class FilenDocumentsProvider : DocumentsProvider() {
	private var state: FilenMobileCacheState? = null
	private var rootUuid: String? = null
	private val AUTHORITY = "io.filen.app.documentsprovider"
	private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
	private var notificationManager: NotificationManager? = null
	private var notificationIdCounter = 0

	private fun initializeClient(filesPath: String): FilenMobileCacheState? {
		try {
			// redacted 
			val email = ""
			val rootUuid = ""
			val authInfo = ""
			val privateKey = ""
			val apiKey = ""
			val authVersion = 2u
			val client =
				FilenMobileCacheState.fromStrings(email, rootUuid, authInfo, privateKey, apiKey, authVersion, filesPath)
			return client
		} catch (e: Exception) {
			e.printStackTrace()
			return null
		}
	}

	override fun onCreate(): Boolean {
		this.state = initializeClient(context!!.filesDir.path)
		this.rootUuid = state?.rootUuid()
		val manager: Any? = context!!.getSystemService(Context.NOTIFICATION_SERVICE)
		manager as NotificationManager
		val channel = NotificationChannel("transfers_channel", "Transfer", NotificationManager.IMPORTANCE_LOW)
		manager?.createNotificationChannel(channel)
		notificationManager = manager
		return true
	}

	override fun queryRoots(projection: Array<out String>?): Cursor {
		val result = MatrixCursor(projection ?: getRootProjection())

		val row = result.newRow()
		var root = state!!.queryRootsInfo(rootUuid!!)
		row.add(Root.COLUMN_ROOT_ID, rootUuid!!)
		row.add(Root.COLUMN_DOCUMENT_ID, rootUuid!!)
		row.add(Root.COLUMN_CAPACITY_BYTES, if (root != null) root.maxStorage else 0)
		row.add(
			Root.COLUMN_AVAILABLE_BYTES,
			if (root != null) root.maxStorage - root.storageUsed else 0
		)
		row.add(Root.COLUMN_MIME_TYPES, "*/*")
		row.add(Root.COLUMN_TITLE, "Filen")
		// we get this dynamically because doing it at compile time wasn't working
		// ideally this should instead be R.mipmap.ic_launcher
		row.add(Root.COLUMN_ICON, context!!.resources.getIdentifier("ic_launcher", "mipmap", context!!.packageName))
		row.add(Root.COLUMN_FLAGS, Root.FLAG_SUPPORTS_CREATE)
		val now = System.currentTimeMillis()
		if ((root == null) or (now > root!!.lastUpdated + 60_000)) {
			val extras = Bundle()
			extras.putBoolean(DocumentsContract.EXTRA_LOADING, true)
			result.extras = extras
			val rootUri = DocumentsContract.buildRootsUri(AUTHORITY)
			result.setNotificationUri(context!!.contentResolver, rootUri)
			scope.launch {
				state!!.updateRootsInfo()
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
			val item = state!!.queryItem(actualId)
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
					row.add(Document.COLUMN_DOCUMENT_ID, dir.uuid)
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

	override fun queryChildDocuments(
		parentDocumentId: String?,
		projection: Array<out String>?,
		orderBy: String?,
	): Cursor {
		parentDocumentId!!
		val result = MatrixCursor(projection ?: getDocumentProjection())
		val resp = state!!.queryDirChildren(parentDocumentId, orderBy) ?: return result

		for (obj in resp.objects) {
			val row = result.newRow()
			when (obj) {
				is FfiNonRootObject.File -> {
					val file = obj.v1
					row.add(Document.COLUMN_DOCUMENT_ID, parentDocumentId + "/" + file.name)
					row.add(Document.COLUMN_DISPLAY_NAME, file.name)
					row.add(Document.COLUMN_SIZE, file.size)
					row.add(
						Document.COLUMN_MIME_TYPE, file.mime.ifEmpty { "application/octet-stream" })
					row.add(Document.COLUMN_LAST_MODIFIED, file.modified)
					row.add(Document.COLUMN_FLAGS, getFileFlags(file.name))
				}

				is FfiNonRootObject.Dir -> {
					val dir = obj.v1
					row.add(Document.COLUMN_DOCUMENT_ID, parentDocumentId + "/" + dir.name)
					row.add(Document.COLUMN_DISPLAY_NAME, dir.name)
					row.add(Document.COLUMN_SIZE, 0)
					row.add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR)
					row.add(Document.COLUMN_LAST_MODIFIED, 0)
					row.add(Document.COLUMN_FLAGS, getDefaultFolderFlags())
				}
			}
		}

		val now = System.currentTimeMillis()
		if (now > resp.parent.lastListed + 10_000) {
			val extras = Bundle()
			extras.putBoolean(DocumentsContract.EXTRA_LOADING, true)
			result.extras = extras
			val childUri = buildChildDocumentsUri(AUTHORITY, parentDocumentId)
			result.setNotificationUri(context!!.contentResolver, childUri)
			scope.launch {
				state!!.updateDirChildren(parentDocumentId)
				context!!.contentResolver.notifyChange(
					childUri,
					null,
				)
			}
		}

		return result;
	}

	override fun refresh(
		uri: Uri?, extras: Bundle?, cancellationSignal: CancellationSignal?
	): Boolean {
		Log.d("FilenDocumentsProvider", "Refresh called with uri: $uri")

		val path = getDocumentIdFromPath(uri)!!
		val item = state!!.queryItem(getDocumentIdFromPath(uri)!!)
		if (item == null) {
			Log.e("FilenDocumentsProvider", "Item not found for uri: $uri")
			return false
		}

		when (item) {
			is FfiObject.Dir -> {
				scope.launch {
					awaitAll(
						async { state!!.updateRootsInfo() },
						async { state!!.updateDirChildren( item.v1.uuid) })
				}
				return true;
			}

			is FfiObject.Root -> {
				scope.launch {
					state!!.updateRootsInfo()
				}
				return true;
			}

			is FfiObject.File -> {
				Log.w("FilenDocumentsProvider", "Tried to refresh file: $path")
				return false;
			}
		}
	}

	override fun openDocument(
		documentId: String?,
		mode: String?,
		signal: CancellationSignal?,
	): ParcelFileDescriptor {
		documentId!!
		val accessMode = ParcelFileDescriptor.parseMode(mode)

		val fd =  runBlocking {
			Log.d("FilenDocumentsProvider", "Opening document: $documentId with mode: $mode")
			try {
				signal?.throwIfCanceled()

				val builder = NotificationCompat.Builder(context!!, "transfers_channel").apply {
					setContentTitle("Filen")
					setContentText("Downloading")
					setSmallIcon(context!!.resources.getIdentifier("ic_launcher", "mipmap", context!!.packageName))
					setOngoing(true)
					setOnlyAlertOnce(true)
					setProgress(100, 0, false)
				}
				val nManager = notificationManager!!
				val id = notificationIdCounter++
				nManager.notify(id, builder.build())

				// todo, do not download if we only want to write to the file
				// or if the local file is already up to date
				val path = state!!.downloadFileIfChangedByPath( documentId, ProgressNotifier(nManager, builder, id))

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

						ParcelFileDescriptor.open(file, accessMode, handler,  { exception ->
							Log.d("FilenDocumentsProvider", "File opened with exception: $exception")
							if (exception != null) {
								Log.e(
									"FilenDocumentsProvider",
									"Error opening document $documentId: ${exception.message}"
								)
							} else {
								scope.launch {
									val uploadBuilder = NotificationCompat.Builder(context!!, "transfers_channel").apply {
										setContentTitle("Filen")
										setContentText("Downloading")
										setSmallIcon(context!!.resources.getIdentifier("ic_launcher", "mipmap", context!!.packageName))
										setOngoing(true)
										setOnlyAlertOnce(true)
										setProgress(100, 0, false)
									}
									val uploadId = notificationIdCounter++
									nManager.notify(uploadId, uploadBuilder.build())

									val updated = state!!.uploadFileIfChanged( documentId, ProgressNotifier(nManager, uploadBuilder, uploadId))
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

	override fun createDocument(
		parentDocumentId: String?, mimeType: String?, displayName: String?
	): String {
		parentDocumentId!!
		mimeType!!
		displayName!!
		return runBlocking {
			Log.d("FilenDocumentsProvider", "Creating document: $displayName with mimeType: $mimeType in parent: $parentDocumentId")
			if (mimeType.equals(Document.MIME_TYPE_DIR, true)) {
				// Create a new directory
				state!!.createDir( parentDocumentId, displayName, null).id
			} else {
				// Create a new file
				state!!.createEmptyFile( parentDocumentId, displayName, mimeType).id
			}
		}

	}

	override fun removeDocument(documentId: String?, parentDocumentId: String?) {
		this.deleteDocument(documentId)
	}

	override fun deleteDocument(documentId: String?) {
		runBlocking {
			state!!.trashItem( documentId!!)
			val parentId = getParentId(documentId)
			parentId!! // we can assume that the parent is not null because we are deleting a document
			for (descendant in state!!.getAllDescendantPaths(documentId)) {
				revokeDocumentPermission(descendant)
			}
			context!!.contentResolver.notifyChange(
				getNotifyURI(parentId),
				null,
			)
		}
	}

	override fun isChildDocument(parentDocumentId: String?, documentId: String?): Boolean {
		return documentId?.startsWith(parentDocumentId?:"") ?: false
	}

	override fun getDocumentType(documentId: String?): String {
		documentId!!
		val item = state!!.queryItem(documentId)
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
		return runBlocking { state!!.moveItem( sourceDocumentId!!,  targetParentDocumentId!!).id }
	}

	override fun renameDocument(documentId: String?, displayName: String?): String? {
		return runBlocking { state!!.renameItem( documentId!!, displayName!!)?.id }
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
	Document.FLAG_SUPPORTS_WRITE or Document.FLAG_DIR_SUPPORTS_CREATE or Root.FLAG_SUPPORTS_RECENTS or Root.FLAG_SUPPORTS_SEARCH or Root.FLAG_SUPPORTS_IS_CHILD or Root.FLAG_SUPPORTS_CREATE

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

class ProgressNotifier(private val notificationManager: NotificationManager, private var builder: NotificationCompat.Builder, private val notificationId: Int) :
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

