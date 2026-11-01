package com.dinexes.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

object Notify {
    const val ORDERS = "orders"
    const val SERVICE = "voice_service"

    fun createChannels(ctx: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        val orders = NotificationChannel(ORDERS, "New orders", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "A notification with sound for every new order"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 400, 150, 400, 150, 400)
            setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build(),
            )
        }
        val service = NotificationChannel(SERVICE, "Order voice is on", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Shown while Dinexes is listening for new orders"
            setShowBadge(false)
        }
        nm.createNotificationChannel(orders)
        nm.createNotificationChannel(service)
    }

    fun openApp(ctx: Context): PendingIntent =
        PendingIntent.getActivity(
            ctx, 0,
            Intent(ctx, SplashActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    fun newOrder(ctx: Context, number: String, seat: String, text: String) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(ctx, android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) return
        val n = NotificationCompat.Builder(ctx, ORDERS)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(0xFFD29B3A.toInt())
            .setContentTitle("New order #$number · $seat")
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setContentIntent(openApp(ctx))
            .build()
        NotificationManagerCompat.from(ctx).notify(number.hashCode(), n)
    }
}
