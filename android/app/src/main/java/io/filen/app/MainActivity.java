package io.filen.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.ValueCallback;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.ArrayList;

import com.getcapacitor.community.media.MediaPlugin;
import de.mindlib.sendIntent.SendIntent;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
      super.onCreate(savedInstanceState);

      registerPlugin(MediaPlugin.class);
      registerPlugin(SendIntent.class);
  }

  @Override
  protected void onNewIntent(Intent intent) {
      super.onNewIntent(intent);
      String action = intent.getAction();
      String type = intent.getType();
      if (Intent.ACTION_SEND.equals(action) && type != null) {
          bridge.getActivity().setIntent(intent);
          bridge.eval("window.dispatchEvent(new Event('sendIntentReceived'))", new ValueCallback<String>() {
              @Override
              public void onReceiveValue(String s) {
              }
          });
      }
      else if (Intent.ACTION_SEND_MULTIPLE.equals(action) && type != null) {
          bridge.getActivity().setIntent(intent);
          bridge.eval("window.dispatchEvent(new Event('sendIntentReceived'))", new ValueCallback<String>() {
              @Override
              public void onReceiveValue(String s) {
              }
          });
      }
  }
}
