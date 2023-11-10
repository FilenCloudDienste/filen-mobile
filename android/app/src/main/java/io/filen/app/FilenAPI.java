package io.filen.app;

import android.util.Log;

import androidx.annotation.NonNull;

import java.io.File;
import java.io.IOException;
import okhttp3.*;
import org.json.*;

class APIRequest {
    public interface APICallback {
        void onSuccess(JSONObject result);
        void onError(Throwable throwable);
    }

    public interface UploadCallback {
        void onSuccess(JSONObject result);
        void onError(Throwable throwable);
    }

    public interface DownloadCallback {
        void onSuccess(File result);
        void onError(Throwable throwable);
    }

    private static OkHttpClient client;

    public APIRequest () {
        client = new OkHttpClient();
    }

    public void request (Request request, final APICallback callback) {
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure (@NonNull Call call, @NonNull IOException e) {
                callback.onError(e);
            }

            @Override
            public void onResponse (@NonNull Call call, @NonNull Response response) {
                if (response.isSuccessful()) {
                    try {
                        assert response.body() != null;

                        final String responseData = response.body().string();

                        final JSONObject jsonObject = new JSONObject(responseData);

                        callback.onSuccess(jsonObject);
                    } catch (JSONException | IOException e) {
                        callback.onError(e);
                    }
                } else {
                    callback.onError(new IOException("Unexpected code " + response));
                }
            }
        });
    }

    public void upload (Request request, final UploadCallback callback) {
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure (@NonNull Call call, @NonNull IOException e) {
                callback.onError(e);
            }

            @Override
            public void onResponse (@NonNull Call call, @NonNull Response response) {
                if (response.isSuccessful()) {
                    try {
                        assert response.body() != null;

                        final String responseData = response.body().string();

                        final JSONObject jsonObject = new JSONObject(responseData);

                        callback.onSuccess(jsonObject);
                    } catch (JSONException | IOException e) {
                        callback.onError(e);
                    }
                } else {
                    callback.onError(new IOException("Unexpected code " + response));
                }
            }
        });
    }
}

public class FilenAPI {
    private static final APIRequest apiRequest = new APIRequest();
    private static final String API_URL = "https://gateway.filen.io";
    private static final String INGEST_URL = "https://ingest.filen.io";

    private static Request buildPostRequest (String apiKey, String endpoint, String json) throws Exception {
        final RequestBody body = RequestBody.create(json, MediaType.parse("application/json"));

        return new Request.Builder()
                .url(API_URL + endpoint)
                .post(body)
                .addHeader("Authorization", "Bearer " + apiKey)
                .addHeader("Accept", "application/json")
                .addHeader("Content-Type", "application/json")
                // @TODO Add POST body checksum (ordered)
                .build();
    }

    public static void fetchFolderContent (String apiKey, String uuid, APIRequest.APICallback callback) {
        try {
            final JSONObject json = new JSONObject();

            json.put("uuid", uuid);

            final Request request = buildPostRequest(apiKey, "/v3/dir/content", json.toString());

            Log.d("FilenDocumentsProvider", "fetchFolderContent: " + request.toString());

            apiRequest.request(request, callback);
        } catch (Exception e) {
            callback.onError(e);

            Log.d("FilenDocumentsProvider", "fetchFolderContent error: " + e.getMessage());

            e.printStackTrace();
        }
    }

    public static void trashItem (String apiKey, String uuid, String type, APIRequest.APICallback callback) {
        try {
            final JSONObject json = new JSONObject();

            json.put("uuid", uuid);

            final Request request = buildPostRequest(apiKey, type.equals("folder") ? "/v3/dir/trash" : "/v3/file/trash", json.toString());

            Log.d("FilenDocumentsProvider", "trashItem: " + request);

            apiRequest.request(request, callback);
        } catch (Exception e) {
            callback.onError(e);

            Log.d("FilenDocumentsProvider", "trashItem error: " + e.getMessage());

            e.printStackTrace();
        }
    }

    public static void markUploadAsDone (String apiKey, String uuid, String nameEncrypted, String nameHashed, String sizeEncrypted, long chunks, String mimeEncrypted, String rm, String metadata, int version, String uploadKey, APIRequest.APICallback callback) {
        try {
            final JSONObject json = new JSONObject();

            json.put("uuid", uuid);
            json.put("name", nameEncrypted);
            json.put("nameHashed", nameHashed);
            json.put("size", sizeEncrypted);
            json.put("chunks", chunks);
            json.put("mime", mimeEncrypted);
            json.put("rm", rm);
            json.put("metadata", metadata);
            json.put("version", version);
            json.put("uploadKey", uploadKey);

            final Request request = buildPostRequest(apiKey, "/v3/upload/done", json.toString());

            Log.d("FilenDocumentsProvider", "markUploadAsDone: " + request);

            apiRequest.request(request, callback);
        } catch (Exception e) {
            callback.onError(e);

            Log.d("FilenDocumentsProvider", "markUploadAsDone error: " + e.getMessage());

            e.printStackTrace();
        }
    }

    public static void createFolder (String apiKey, String uuid, String nameEncrypted, String nameHashed, String parent, APIRequest.APICallback callback) {
        try {
            final JSONObject json = new JSONObject();

            json.put("uuid", uuid);
            json.put("name", nameEncrypted);
            json.put("nameHashed", nameHashed);
            json.put("parent", parent);

            final Request request = buildPostRequest(apiKey, "/v3/dir/create", json.toString());

            Log.d("FilenDocumentsProvider", "createFolder: " + request);

            apiRequest.request(request, callback);
        } catch (Exception e) {
            callback.onError(e);

            Log.d("FilenDocumentsProvider", "createFolder error: " + e.getMessage());

            e.printStackTrace();
        }
    }

    public static void uploadFileChunk (String apiKey, File inputFile, String uuid, int index, String uploadKey, String parent, String inputFileChecksum, APIRequest.UploadCallback callback) {
        try {
            final String url = INGEST_URL + "/v3/upload?uuid=" + uuid + "&index=" + index + "&uploadKey=" + uploadKey + "&parent=" + parent + "&hash=" + inputFileChecksum;
            final RequestBody requestBody = RequestBody.create(inputFile, MediaType.parse("application/octet-stream"));

            final String queryItemsJSON = "{\"uuid\":\"" + uuid + "\",\"index\":\"" + index + "\",\"uploadKey\":\"" + uploadKey + "\",\"parent\":\"" + parent + "\",\"hash\":\"" + inputFileChecksum + "\"}";
            final String queryItemsJSONChecksum = FilenCrypto.hash(queryItemsJSON, "SHA-512");

            final Request request = new Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Accept", "application/json")
                    .addHeader("Checksum", queryItemsJSONChecksum)
                    .post(requestBody)
                    .build();

            apiRequest.upload(request, callback);
        }  catch (Exception e) {
            callback.onError(e);

            Log.d("FilenDocumentsProvider", "uploadFileChunk error: " + e.getMessage());

            e.printStackTrace();
        }
    }
}
