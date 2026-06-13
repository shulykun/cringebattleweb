package ai.boiskrinzhem.twa;

import android.net.Uri;
import android.os.Bundle;
import android.net.Uri;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.appcompat.app.AppCompatActivity;

public class LauncherActivity extends AppCompatActivity {

    private static final String TWA_URL = "https://xn--90aichegrffwj.xn--p1ai/voice";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CustomTabsIntent intent = new CustomTabsIntent.Builder()
                .setShowTitle(false)
                .setUrlBarHidingEnabled(true)
                .build();

        intent.intent.setPackage("com.android.chrome");
        intent.launchUrl(this, Uri.parse(TWA_URL));
        finish();
    }
}
