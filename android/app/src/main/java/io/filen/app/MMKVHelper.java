package io.filen.app;

import com.tencent.mmkv.MMKV;
import android.content.Context;
import android.util.Log;

public class MMKVHelper {
    private static MMKV mmkvInstance;

    public static void initialize(Context context) {
        String mmkvDir = MMKV.initialize(context);

        mmkvInstance = MMKV.mmkvWithID("filen_shared", MMKV.MULTI_PROCESS_MODE);

        Log.d("FilenDocumentsProvider", "MMKV initialized, dir: " + mmkvDir);
    }

    public static MMKV getInstance() {
        if (mmkvInstance == null) {
            throw new IllegalStateException("MMKVHelper is not initialized. Call initialize() method first.");
        }

        return mmkvInstance;
    }
}
