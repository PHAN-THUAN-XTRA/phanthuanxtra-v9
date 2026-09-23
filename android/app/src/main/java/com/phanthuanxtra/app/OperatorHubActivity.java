package com.phanthuanxtra.app;

import android.app.Activity;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;

/** XTRA premium operator cockpit. Credentials stay encrypted on-device and are never injected into WebView. */
public final class OperatorHubActivity extends Activity {
    private static final int BLACK = Color.rgb(5,7,6), CARBON = Color.rgb(7,17,15), GRAPHITE = Color.rgb(5,47,41);
    private static final int GOLD = Color.rgb(199,163,90), SOFT_GOLD = Color.rgb(232,211,154);
    private static final int JADE = Color.rgb(15,95,80), JADE_GLOW = Color.rgb(45,154,130), WHITE = Color.rgb(244,245,242), SILVER = Color.rgb(169,175,181);
    private SecureTokenStore tokenStore;
    private EditText cloudflareToken, githubToken;
    private TextView status;

    @Override public void onCreate(Bundle state) { super.onCreate(state); tokenStore = new SecureTokenStore(this); build(); }

    private GradientDrawable bg(int color, float radius, int strokeColor, int strokeWidth) {
        GradientDrawable g = new GradientDrawable(); g.setColor(color); g.setCornerRadius(radius); if (strokeWidth > 0) g.setStroke(strokeWidth, strokeColor); return g;
    }
    private TextView text(String value, float size, int color) {
        TextView v = new TextView(this); v.setText(value); v.setTextSize(size); v.setTextColor(color); v.setPadding(4, 8, 4, 8); return v;
    }
    private EditText secretField(String label) {
        EditText e = new EditText(this); e.setHint(label); e.setHintTextColor(SILVER); e.setTextColor(WHITE);
        e.setSingleLine(true); e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        e.setPadding(18, 4, 18, 4); e.setBackground(bg(GRAPHITE, 18, Color.rgb(55,58,61), 1));
        return e;
    }
    private Button button(String label, View.OnClickListener listener, boolean primary) {
        Button b = new Button(this); b.setText(label); b.setTextColor(primary ? BLACK : WHITE); b.setTextSize(13); b.setAllCaps(false);
        b.setGravity(Gravity.CENTER); b.setMinHeight(52); b.setPadding(12, 0, 12, 0); b.setOnClickListener(listener);
        b.setBackground(bg(primary ? GOLD : CARBON, 16, primary ? GOLD : Color.rgb(54,58,60), 1)); return b;
    }
    private void gap(LinearLayout root, int h) { TextView g = new TextView(this); root.addView(g, new LinearLayout.LayoutParams(1,h)); }
    private LinearLayout card() { LinearLayout c = new LinearLayout(this); c.setOrientation(LinearLayout.VERTICAL); c.setPadding(18,14,18,16); c.setBackground(bg(CARBON, 20, Color.rgb(43,46,48), 1)); return c; }

    private void build() {
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(14,16,14,8); root.setBackgroundColor(BLACK);
        LinearLayout head = new LinearLayout(this); head.setOrientation(LinearLayout.HORIZONTAL); head.setGravity(Gravity.CENTER_VERTICAL);
        TextView brand = text("PHAN THUẦN XTRA", 22, WHITE); brand.setTypeface(null, android.graphics.Typeface.BOLD); head.addView(brand, new LinearLayout.LayoutParams(0, -2, 1));
        TextView live = text("● LIVE", 12, JADE_GLOW); live.setTypeface(null, android.graphics.Typeface.BOLD); head.addView(live); root.addView(head);
        TextView rule = text("SHOWROOM COMMAND CENTER  •  PREMIUM OPERATIONS", 10, SOFT_GOLD); root.addView(rule); gap(root,10);

        LinearLayout system = card(); system.addView(text("SYSTEM CREDENTIALS", 11, SOFT_GOLD));
        boolean cfSaved = !tokenStore.getCloudflare().isEmpty();
        boolean ghSaved = !tokenStore.getGitHub().isEmpty();
        cloudflareToken = secretField(cfSaved ? "Cloudflare API token • ĐÃ LƯU • nhập mới để thay" : "Cloudflare API token");
        githubToken = secretField(ghSaved ? "GitHub token • ĐÃ LƯU • nhập mới để thay" : "GitHub token");
        system.addView(cloudflareToken); gap(system,8); system.addView(githubToken); gap(system,10);
        system.addView(button("LƯU TOKEN", v -> saveTokens(), true)); gap(system,4);
        LinearLayout clears = new LinearLayout(this); clears.setOrientation(LinearLayout.HORIZONTAL);
        Button cf = button("Xóa Cloudflare", v -> { tokenStore.clearCloudflare(); cloudflareToken.setText(""); cloudflareToken.setHint("Cloudflare API token"); setStatus("Cloudflare token đã được xóa khỏi thiết bị."); }, false);
        Button gh = button("Xóa GitHub", v -> { tokenStore.clearGitHub(); githubToken.setText(""); githubToken.setHint("GitHub token"); setStatus("GitHub token đã được xóa khỏi thiết bị."); }, false);
        clears.addView(cf,new LinearLayout.LayoutParams(0,52,1)); clears.addView(gh,new LinearLayout.LayoutParams(0,52,1)); system.addView(clears);
        system.addView(text("AES/GCM + Android Keystore  •  Token không được truyền vào Chat/WebView", 10, SILVER)); root.addView(system); gap(root,10);

        LinearLayout quick = card(); quick.addView(text("QUICK CONTROL", 11, SOFT_GOLD));
        Button manage = button("QUẢN LÝ APK  ›", v -> startActivity(new Intent(this, MainActivity.class)), true); quick.addView(manage); gap(quick,6);
        Button site = button("PHANTHUANXTRA.COM  ↗", v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://phanthuanxtra.com/"))), false); quick.addView(site);
        root.addView(quick); gap(root,10);

        status=text("Sẵn sàng. Hệ thống bảo mật hoạt động.",10,SILVER); status.setGravity(Gravity.CENTER_VERTICAL); root.addView(status);
        setContentView(root);
    }
    private void saveTokens() {
        try {
            String cf = cloudflareToken.getText().toString().trim();
            String gh = githubToken.getText().toString().trim();
            if (!cf.isEmpty()) tokenStore.saveCloudflare(cf);
            if (!gh.isEmpty()) tokenStore.saveGitHub(gh);
            cloudflareToken.setText(""); githubToken.setText("");
            cloudflareToken.setHint("Cloudflare API token • ĐÃ LƯU • nhập mới để thay");
            githubToken.setHint("GitHub token • ĐÃ LƯU • nhập mới để thay");
            setStatus("✓ Token đã được lưu an toàn; giá trị bí mật đã được ẩn.");
        } catch(Exception e) { setStatus("Lỗi lưu token: "+e.getMessage()); }
    }
    private void setStatus(String value) { if(status != null) status.setText(value); }
}
