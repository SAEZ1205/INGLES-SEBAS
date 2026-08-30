package com.saez1205.inglessebas;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_EXPORT = 5011;
    private static final int REQUEST_IMPORT = 5012;
    private TextToSpeech tts;
    private String pendingExport;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) tts.setLanguage(Locale.US);
        });

        WebView webView = bridge.getWebView();
        webView.addJavascriptInterface(new AndroidNativeBridge(), "AndroidNative");
        webView.postDelayed(() -> injectAndroidRuntime(webView), 700);
        webView.postDelayed(() -> injectAndroidRuntime(webView), 1800);
    }

    private void injectAndroidRuntime(WebView webView) {
        String shim = "(function(){if(!window.__androidTtsShim){window.__androidTtsShim=true;window.SpeechSynthesisUtterance=function(t){this.text=t;this.lang='en-US';this.rate=1;this.pitch=1;};window.speechSynthesis={cancel:function(){AndroidNative.stop();},getVoices:function(){return[];},speak:function(u){AndroidNative.speak(String((u&&u.text)||''),Number((u&&u.rate)||0.82),Number((u&&u.pitch)||1));}};}})();";
        webView.evaluateJavascript(shim, null);
        try {
            InputStream in = getAssets().open("public/android-addon.js");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int n;
            while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
            in.close();
            webView.evaluateJavascript(out.toString("UTF-8"), null);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private class AndroidNativeBridge {
        @JavascriptInterface
        public void speak(String text, double rate, double pitch) {
            runOnUiThread(() -> {
                if (tts == null || text == null || text.trim().isEmpty()) return;
                tts.setLanguage(Locale.US);
                tts.setSpeechRate((float)Math.max(0.5, Math.min(1.5, rate)));
                tts.setPitch((float)Math.max(0.5, Math.min(1.5, pitch)));
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "ingles-sebas");
            });
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(() -> { if (tts != null) tts.stop(); });
        }

        @JavascriptInterface
        public void exportBackup(String contents, String filename) {
            pendingExport = contents;
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, filename == null ? "ingles-sebas-backup.json" : filename);
                startActivityForResult(intent, REQUEST_EXPORT);
            });
        }

        @JavascriptInterface
        public void importBackup() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                startActivityForResult(intent, REQUEST_IMPORT);
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        try {
            if (requestCode == REQUEST_EXPORT && pendingExport != null) {
                OutputStream out = getContentResolver().openOutputStream(uri);
                if (out != null) {
                    out.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                    out.close();
                    Toast.makeText(this, "Backup guardado", Toast.LENGTH_SHORT).show();
                }
                pendingExport = null;
            } else if (requestCode == REQUEST_IMPORT) {
                InputStream in = getContentResolver().openInputStream(uri);
                if (in == null) return;
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[4096];
                int n;
                while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
                in.close();
                String content = out.toString("UTF-8");
                bridge.getWebView().evaluateJavascript("window.__receiveAndroidBackup(" + JSONObject.quote(content) + ")", null);
            }
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "No se pudo procesar el backup", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }
}
