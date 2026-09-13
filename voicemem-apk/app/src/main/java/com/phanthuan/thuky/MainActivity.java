package com.phanthuan.thuky;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final int MIC_REQUEST = 1001;
    private static final String PREFS = "thuky_phanthuan";
    private static final String URL_KEY = "voicemem_url";
    private static final String DEFAULT_URL = "http://127.0.0.1:8787";

    private WebView webView;
    private EditText urlInput;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        requestMicPermissionIfNeeded();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.BLACK);

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setPadding(12, 10, 12, 10);
        bar.setBackgroundColor(Color.rgb(20, 20, 20));

        urlInput = new EditText(this);
        urlInput.setSingleLine(true);
        urlInput.setText(getPreferences(Context.MODE_PRIVATE).getString(URL_KEY, DEFAULT_URL));
        urlInput.setTextColor(Color.WHITE);
        urlInput.setHintTextColor(Color.GRAY);
        urlInput.setHint("VoiceMem server URL");
        urlInput.setTextSize(14);
        LinearLayout.LayoutParams inputLp = new LinearLayout.LayoutParams(0, 52, 1f);
        inputLp.rightMargin = 8;
        bar.addView(urlInput, inputLp);

        Button open = new Button(this);
        open.setText("MỞ");
        open.setTextColor(Color.WHITE);
        open.setBackgroundColor(Color.rgb(122, 31, 43));
        bar.addView(open, new LinearLayout.LayoutParams(100, 52));

        root.addView(bar);

        TextView hint = new TextView(this);
        hint.setText("Thư ký Phan Thuần  •  VoiceMem độc lập\nNhập địa chỉ máy chủ VoiceMem đang chạy rồi bấm MỞ.");
        hint.setTextColor(Color.LTGRAY);
        hint.setTextSize(12);
        hint.setPadding(14, 8, 14, 8);
        root.addView(hint);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setDatabaseEnabled(true);
        webView.setBackgroundColor(Color.BLACK);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        request.deny();
                    }
                });
            }
        });
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1f));

        open.setOnClickListener(v -> loadVoiceMem());
        setContentView(root);
        loadVoiceMem();
    }

    private void loadVoiceMem() {
        String url = urlInput.getText().toString().trim();
        if (url.isEmpty()) url = DEFAULT_URL;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "http://" + url;
            urlInput.setText(url);
        }
        getPreferences(Context.MODE_PRIVATE).edit().putString(URL_KEY, url).apply();
        webView.loadUrl(url);
    }

    private void requestMicPermissionIfNeeded() {
        if (android.os.Build.VERSION.SDK_INT >= 23 &&
                checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
