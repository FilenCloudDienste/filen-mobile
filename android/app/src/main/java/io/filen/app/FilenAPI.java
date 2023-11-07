package io.filen.app;

import android.util.Log;

import java.io.IOException;
import okhttp3.*;
import org.json.*;

class APIRequest {
    public interface APICallback {
        void onSuccess(JSONObject result);
        void onError(Throwable throwable);
    }

    private static OkHttpClient client;

    public APIRequest() {
        client = new OkHttpClient();
    }

    public void request(Request request, final APICallback callback) {
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    String responseData = response.body().string();

                    try {
                        JSONObject jsonObject = new JSONObject(responseData);

                        callback.onSuccess(jsonObject);
                    } catch (JSONException e) {
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

    private static Request buildPostRequest(String apiKey, String endpoint, String json) {
        RequestBody body = RequestBody.create(json, MediaType.parse("application/json"));

        return new Request.Builder()
                .url(API_URL + endpoint)
                .post(body)
                .addHeader("Authorization", "Bearer " + apiKey)
                .addHeader("Accept", "application/json")
                .addHeader("Content-Type", "application/json")
                .build();
    }

    public static void fetchFolderContent (String apiKey, String uuid, APIRequest.APICallback callback) {
        try {
            JSONObject json = new JSONObject();

            json.put("uuid", uuid);

            Request request = buildPostRequest(apiKey, "/v3/dir/content", json.toString());

            Log.d("FilenDocumentsProvider", "fetchFolderContent: " + request.toString());

            apiRequest.request(request, callback);
        } catch (Exception e) {
            Log.d("FilenDocumentsProvider", "fetchFolderContent error: " + e.getMessage());

            e.printStackTrace();
        }
    }

    public static void trashItem (String apiKey, String uuid, String type, APIRequest.APICallback callback) {
        try {
            JSONObject json = new JSONObject();

            json.put("uuid", uuid);

            Request request = buildPostRequest(apiKey, type.equals("folder") ? "/v3/dir/trash" : "/v3/file/trash", json.toString());

            Log.d("FilenDocumentsProvider", "trashItem: " + request.toString());

            apiRequest.request(request, callback);
        } catch (Exception e) {
            Log.d("FilenDocumentsProvider", "trashItem error: " + e.getMessage());

            e.printStackTrace();
        }
    }
}
