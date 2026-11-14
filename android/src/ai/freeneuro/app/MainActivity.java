package ai.freeneuro.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.URLUtil;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
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

    private static final String PREFS = "freeneuro_prefs";
    private static final String KEY_URL = "server_url";
    private static final String KEY_KEEP = "keep_alive";

    private WebView web;
    private SharedPreferences prefs;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILECHOOSER_RESULT = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        if (Build.VERSION.SDK_INT >= 21) {
            Window w = getWindow();
            w.setStatusBarColor(Color.parseColor("#0B0B16"));
            w.setNavigationBarColor(Color.parseColor("#0B0B16"));
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#0A0A14"));

        // верхняя панель
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setBackgroundColor(Color.parseColor("#0B0B16"));
        bar.setPadding(dp(16), dp(6), dp(8), dp(4));

        TextView title = new TextView(this);
        title.setText("FreeNeuro");
        title.setTextColor(Color.parseColor("#22D3EE"));
        title.setTextSize(17);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(0, dp(44), 1f);
        tp.gravity = Gravity.CENTER_VERTICAL;
        bar.addView(title, tp);

        Button menuBtn = new Button(this);
        menuBtn.setText("\u2630");
        menuBtn.setTextSize(20);
        menuBtn.setBackgroundColor(Color.TRANSPARENT);
        menuBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showMenu();
            }
        });
        bar.addView(menuBtn, new LinearLayout.LayoutParams(dp(48), dp(46)));

        root.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54)));

        // webview
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " FreeNeuroApp/1.3");
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        web.setBackgroundColor(Color.parseColor("#0A0A14"));
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try {
                    startActivityForResult(Intent.createChooser(intent, "Выбери файл"), FILECHOOSER_RESULT);
                } catch (Exception e) {
                    filePathCallback = null;
                    toast("Не удалось открыть выбор файлов");
                    return false;
                }
                return true;
            }
        });
        // скачивание файлов из песочницы
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimetype, long contentLength) {
                try {
                    DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                    req.setMimeType(mimetype == null ? "application/octet-stream" : mimetype);
                    req.addRequestHeader("User-Agent", userAgent);
                    req.setNotificationVisibility(
                            DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    String name = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    if (Build.VERSION.SDK_INT >= 29) {
                        req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                    } else {
                        req.setDestinationInExternalFilesDir(MainActivity.this,
                                Environment.DIRECTORY_DOWNLOADS, name);
                    }
                    DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.enqueue(req);
                        toast("Скачивание: " + name);
                    }
                } catch (Exception e) {
                    toast("Не удалось скачать файл");
                }
            }
        });
        root.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        setContentView(root);

        String url = prefs.getString(KEY_URL, "");
        if (url == null || url.trim().isEmpty()) {
            showServerDialog(true);
        } else {
            web.loadUrl(url);
        }

        // разрешение на уведомление службы антисна (Android 13+)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 200);
        }

        // антисон включён по умолчанию: пинг сервера каждые 5 минут, даже в фоне
        if (prefs.getBoolean(KEY_KEEP, true)) {
            startKeepAlive();
        }
    }

    private void startKeepAlive() {
        Intent i = new Intent(this, KeepAliveService.class);
        if (Build.VERSION.SDK_INT >= 26) {
            startForegroundService(i);
        } else {
            startService(i);
        }
    }

    private void stopKeepAlive() {
        stopService(new Intent(this, KeepAliveService.class));
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private void toast(String text) {
        Toast.makeText(this, text, Toast.LENGTH_SHORT).show();
    }

    private void showServerDialog(final boolean firstRun) {
        final EditText input = new EditText(this);
        input.setHint("https://твой-сервер.onrender.com");
        input.setText(prefs.getString(KEY_URL, ""));
        input.setTextColor(Color.WHITE);
        input.setHintTextColor(Color.parseColor("#55556E"));
        LinearLayout wrap = new LinearLayout(this);
        wrap.setPadding(dp(24), dp(16), dp(24), 0);
        wrap.addView(input, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        AlertDialog.Builder b = new AlertDialog.Builder(this);
        b.setTitle("Адрес сервера FreeNeuro");
        b.setMessage("Вставь URL своего сервера:\n"
                + "\u2022 бесплатный хостинг: https://имя.onrender.com\n"
                + "\u2022 или локально: http://192.168.х.х:8000");
        b.setView(wrap);
        b.setPositiveButton("Открыть", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface d, int which) {
                String u = input.getText().toString().trim();
                if (u.isEmpty()) {
                    toast("Нужен адрес сервера");
                    if (firstRun) showServerDialog(true);
                    return;
                }
                if (!u.startsWith("http")) u = "https://" + u;
                prefs.edit().putString(KEY_URL, u).apply();
                web.loadUrl(u);
            }
        });
        if (!firstRun) {
            b.setNegativeButton("Отмена", null);
        }
        b.setCancelable(!firstRun);
        b.show();
    }

    private void showMenu() {
        final boolean keep = prefs.getBoolean(KEY_KEEP, true);
        final String[] items = {
                "Сменить сервер",
                "Перезагрузить",
                "Очистить данные сайта",
                keep ? "Сервер не спит: выключить" : "Сервер не спит: включить",
                "О приложении",
        };
        new AlertDialog.Builder(this)
                .setTitle("FreeNeuro")
                .setItems(items, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface d, int which) {
                        if (which == 0) {
                            showServerDialog(false);
                        } else if (which == 1) {
                            web.reload();
                        } else if (which == 2) {
                            web.clearCache(true);
                            web.clearHistory();
                            web.clearFormData();
                            toast("Кэш очищен");
                            web.reload();
                        } else if (which == 3) {
                            boolean keep = !prefs.getBoolean(KEY_KEEP, true);
                            prefs.edit().putBoolean(KEY_KEEP, keep).apply();
                            if (keep) {
                                startKeepAlive();
                                toast("Антисон включён: пинг каждые 5 минут");
                            } else {
                                stopKeepAlive();
                                toast("Антисон выключен");
                            }
                        } else {
                            showAbout();
                        }
                    }
                })
                .show();
    }

    private void showAbout() {
        new AlertDialog.Builder(this)
                .setTitle("О приложении")
                .setMessage("FreeNeuro v1.3\n\n"
                        + "\u2022 бесплатные нейросети: OpenRouter, Groq, Gemini, Pollinations, свои эндпоинты\n"
                        + "\u2022 автоматическое переключение при лимитах, приоритеты моделей\n"
                        + "\u2022 песочница файлов: нейросеть сама читает PDF, DOCX, XLSX, картинки; файлы можно скачивать\n"
                        + "\u2022 разные чаты, память, сжатие истории, поиск в интернете\n"
                        + "\u2022 уточнение промпта до отправки\n"
                        + "\u2022 антисон: сервер не засыпает, пока приложение живо (даже в фоне)\n\n"
                        + "Сервер — Python (FastAPI). Разверни его на бесплатном "
                        + "хостинге Render и укажи адрес здесь.")
                .setPositiveButton("OK", null)
                .show();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILECHOOSER_RESULT) {
            if (filePathCallback == null) {
                return;
            }
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    results = new Uri[n];
                    for (int i = 0; i < n; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
        }
        super.onDestroy();
    }
}
