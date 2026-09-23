package com.phanthuanxtra.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;

/** Minimal product launcher. Infrastructure credentials never belong in the APK UI. */
public final class OperatorHubActivity extends Activity {
    private static final int BLACK=Color.rgb(5,7,6), CARBON=Color.rgb(7,17,15), GOLD=Color.rgb(199,163,90),
            SOFT_GOLD=Color.rgb(232,211,154), JADE=Color.rgb(15,95,80), JADE_GLOW=Color.rgb(45,154,130),
            WHITE=Color.rgb(244,245,242), SILVER=Color.rgb(169,175,181);
    private int dp(float v){return Math.round(v*getResources().getDisplayMetrics().density);}
    private GradientDrawable bg(int fill,float radius,int stroke){GradientDrawable g=new GradientDrawable();g.setColor(fill);g.setCornerRadius(dp(radius));g.setStroke(dp(1),stroke);return g;}
    private TextView text(String s,float size,int color){TextView v=new TextView(this);v.setText(s);v.setTextSize(size);v.setTextColor(color);v.setPadding(dp(8),dp(8),dp(8),dp(8));return v;}
    private Button button(String s,View.OnClickListener l,boolean primary){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextSize(14);b.setTextColor(primary?BLACK:WHITE);b.setMinHeight(dp(56));b.setOnClickListener(l);b.setBackground(bg(primary?GOLD:CARBON,16,primary?SOFT_GOLD:JADE));return b;}
    private void gap(LinearLayout r,int h){TextView v=new TextView(this);r.addView(v,new LinearLayout.LayoutParams(1,dp(h)));}
    @Override public void onCreate(Bundle state){super.onCreate(state);build();}
    private void build(){
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(16),dp(18),dp(16),dp(16));root.setBackgroundColor(BLACK);root.setGravity(Gravity.CENTER_HORIZONTAL);
        TextView brand=text("PHAN THUẦN XTRA",24,GOLD);brand.setGravity(Gravity.CENTER);brand.setTypeface(null,android.graphics.Typeface.BOLD);root.addView(brand,new LinearLayout.LayoutParams(-1,-2));
        TextView sub=text("MOBILE OPERATOR HUB",11,JADE_GLOW);sub.setGravity(Gravity.CENTER);root.addView(sub);gap(root,22);
        LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(dp(18),dp(18),dp(18),dp(18));card.setBackground(bg(CARBON,20,JADE));
        card.addView(text("QUẢN TRỊ SHOWROOM",12,SOFT_GOLD));gap(card,8);
        card.addView(button("QUẢN LÝ APK  ›",v->startActivity(new Intent(this,MainActivity.class)),true));gap(card,10);
        card.addView(button("MỞ PHANTHUANXTRA.COM  ↗",v->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://phanthuanxtra.com/"))),false));
        card.addView(text("Đăng nhập quản trị được thực hiện bên trong APK bằng phiên Admin bảo mật. APK không lưu Cloudflare/GitHub token.",10,SILVER));
        root.addView(card,new LinearLayout.LayoutParams(-1,-2));
        setContentView(root);
    }
}