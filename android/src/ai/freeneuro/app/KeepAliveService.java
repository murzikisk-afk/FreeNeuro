package ai.freeneuro.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;

import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Не даёт бесплатному серверу (Render) засыпать:
 * пингует /api/health каждые 5 минут, пока приложение живо —
 * в том числе когда оно свёрнуто в фоне.
 */
public class KeepAliveService extends Service {

    private static final String CHANNEL = "freeneuro_keep";
    private static final long INTERVAL_MS = 5 * 60 * 1000L;  // пинг каждые 5 минут
    private static final long RETRY_MS = 45 * 1000L;         // повтор при неудаче
    private static final int MAX_RETRIES = 3;

    private final Handler handler = new Handler();
    private Runnable tick;
    private int fails = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        startForegroundCompat();
        tick = new Runnable() {
            @Override
            public void run() {
                ping();
                handler.postDelayed(this, INTERVAL_MS);
            }
        };
    }

    private void startForegroundCompat() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL, "FreeNeuro: сервер не спит", NotificationManager.IMPORTANCE_MIN);
            ch.setDescription("Пинг сервера, чтобы бесплатный Render не засыпал");
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(ch);
        }
        Notification.Builder nb = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL)
                : new Notification.Builder(this);
        nb.setSmallIcon(android.R.drawable.stat_notify_sync)
          .setContentTitle("FreeNeuro")
          .setContentText("Сервер не засыпает: пинг каждые 5 минут")
          .setOngoing(true);
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(1, nb.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(1, nb.build());
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        handler.removeCallbacks(tick);
        handler.post(tick);
        return START_STICKY;
    }

    private void ping() {
        final String base = getSharedPreferences("freeneuro_prefs", MODE_PRIVATE)
                .getString("server_url", "").trim();
        new Thread(new Runnable() {
            @Override
            public void run() {
                if (base.isEmpty()) return;
                String u = base;
                if (!u.startsWith("http")) u = "https://" + u;
                u = u.replaceAll("/+$", "") + "/api/health";
                HttpURLConnection c = null;
                try {
                    c = (HttpURLConnection) new URL(u).openConnection();
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(60000);  // Render может просыпаться до минуты
                    c.setRequestMethod("GET");
                    int code = c.getResponseCode();
                    fails = (code >= 200 && code < 500) ? 0 : fails + 1;
                } catch (Exception e) {
                    fails++;
                } finally {
                    if (c != null) c.disconnect();
                }
                if (fails > 0 && fails <= MAX_RETRIES) {
                    handler.postDelayed(new Runnable() {
                        @Override
                        public void run() { ping(); }
                    }, RETRY_MS);
                }
            }
        }).start();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
