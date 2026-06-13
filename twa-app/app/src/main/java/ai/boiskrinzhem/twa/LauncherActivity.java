package ai.boiskrinzhem.twa;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.FrameLayout;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.appcompat.app.AppCompatActivity;

import java.util.ArrayList;
import java.util.List;

public class LauncherActivity extends AppCompatActivity {

    private static final String TWA_URL = "https://xn--90aichegrffwj.xn--p1ai/voice";
    private static final String[] CUSTOM_TABS_BROWSERS = {
        "com.android.chrome",
        "com.chrome.beta",
        "com.chrome.dev",
        "org.chromium.chrome",
        "com.mi.globalbrowser",
        "com.sec.android.app.sbrowser",
        "com.microsoft.emmx",
        "com.brave.browser",
        "org.mozilla.fenix",
        "org.mozilla.firefox",
        "com.yandex.browser"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String browser = findCustomTabsBrowser();
        if (browser != null) {
            launchWithCustomTabs(browser);
        } else {
            launchWithWebView();
        }
    }

    private String findCustomTabsBrowser() {
        PackageManager pm = getPackageManager();

        // Check which browsers support Custom Tabs service
        Intent serviceIntent = new Intent("android.support.customtabs.action.CustomTabsService");
        List<ResolveInfo> services = pm.queryIntentServices(serviceIntent, 0);

        List<String> supportedPackages = new ArrayList<>();
        for (ResolveInfo info : services) {
            supportedPackages.add(info.serviceInfo.packageName);
        }

        // Try preferred browsers first
        for (String pkg : CUSTOM_TABS_BROWSERS) {
            if (supportedPackages.contains(pkg)) {
                try {
                    if (pm.getApplicationInfo(pkg, 0).enabled) {
                        return pkg;
                    }
                } catch (PackageManager.NameNotFoundException e) {
                    // not installed, skip
                }
            }
        }

        // Fallback: any browser that supports Custom Tabs
        if (!supportedPackages.isEmpty()) {
            return supportedPackages.get(0);
        }

        return null;
    }

    private void launchWithCustomTabs(String browserPackage) {
        CustomTabsIntent intent = new CustomTabsIntent.Builder()
                .setShowTitle(false)
                .setUrlBarHidingEnabled(true)
                .setNavigationBarColor(0xFF0F0C29)
                .setToolbarColor(0xFF0F0C29)
                .build();

        intent.intent.setPackage(browserPackage);
        intent.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.launchUrl(this, Uri.parse(TWA_URL));
        finish();
    }

    private void launchWithWebView() {
        // No Custom Tabs browser found — use WebView fallback
        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(0xFF0F0C29);

        ProgressBar progressBar = new ProgressBar(this);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
        );
        progressParams.gravity = android.view.Gravity.CENTER;
        progressBar.setLayoutParams(progressParams);
        layout.addView(progressBar);

        WebView webView = new WebView(this);
        webView.setVisibility(View.GONE);
        layout.addView(webView);

        setContentView(layout);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setAllowFileAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " CringeTWA/1.0");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Keep navigation inside WebView for our domain
                if (url != null && url.contains("xn--90aichegrffwj.xn--p1ai")) {
                    return false;
                }
                // External links open in browser
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                return true;
            }
        });

        webView.loadUrl(TWA_URL);
    }

    @Override
    public void onBackPressed() {
        // Let WebView handle back navigation
        // (Custom Tabs path already finished the activity)
        super.onBackPressed();
    }
}
