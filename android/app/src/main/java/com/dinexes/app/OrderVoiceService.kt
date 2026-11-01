package com.dinexes.app

import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentChange
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import org.json.JSONArray

/**
 * Keeps listening for new orders and speaks each one aloud, also when the app is closed or the
 * screen is locked. Runs until the staff member turns the voice off or signs out. A high-priority push
 * message also starts it (see DinexesMessaging), so orders are announced after the phone has slept.
 */
class OrderVoiceService : Service() {
    private var speaker: Speaker? = null
    private var listener: ListenerRegistration? = null
    private lateinit var prefs: Prefs

    companion object {
        const val ACTION_STOP = "com.dinexes.app.STOP_VOICE"
        const val EXTRA_ORDER = "order_json"

        fun start(ctx: Context, orderJson: String? = null) {
            val i = Intent(ctx, OrderVoiceService::class.java)
            if (orderJson != null) i.putExtra(EXTRA_ORDER, orderJson)
            try {
                ContextCompat.startForegroundService(ctx, i)
            } catch (e: Exception) {
                // Starting from the background can be refused by Android; the push notification still shows.
            }
        }

        fun stop(ctx: Context) {
            ctx.stopService(Intent(ctx, OrderVoiceService::class.java))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
        Config.initFirebase(this)
        speaker = Speaker(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            prefs.voiceOn = false
            stopSelf()
            return START_NOT_STICKY
        }
        goForeground()
        if (FirebaseAuth.getInstance().currentUser == null || !prefs.voiceOn) {
            stopSelf()
            return START_NOT_STICKY
        }
        intent?.getStringExtra(EXTRA_ORDER)?.let { announceJson(it) }
        if (listener == null) listen()
        return START_STICKY
    }

    private fun goForeground() {
        val stop = PendingIntent.getService(
            this, 1, Intent(this, OrderVoiceService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val n = NotificationCompat.Builder(this, Notify.SERVICE)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(0xFFD29B3A.toInt())
            .setContentTitle("Dinexes is listening for orders")
            .setContentText("New orders are spoken aloud. Tap to open.")
            .setOngoing(true)
            .setContentIntent(Notify.openApp(this))
            .addAction(0, "Turn off voice", stop)
            .build()
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        ServiceCompat.startForeground(this, 7, n, type)
    }

    private fun listen() {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        val db = FirebaseFirestore.getInstance()
        db.document("users/$uid").get().addOnSuccessListener { u ->
            val rid = u.getString("rid") ?: return@addOnSuccessListener
            val since = System.currentTimeMillis() - 2 * 60_000
            listener = db.collection("restaurants/$rid/orders")
                .whereGreaterThanOrEqualTo("createdAt", since)
                .orderBy("createdAt", Query.Direction.ASCENDING)
                .addSnapshotListener { snap, _ ->
                    snap?.documentChanges?.forEach { ch ->
                        if (ch.type != DocumentChange.Type.ADDED) return@forEach
                        val d = ch.document
                        if (d.getString("status") != "new") return@forEach
                        @Suppress("UNCHECKED_CAST")
                        val items = (d.get("items") as? List<Map<String, Any>>).orEmpty().map {
                            Line((it["name"] as? String).orEmpty(), (it["qty"] as? Number)?.toInt() ?: 1)
                        }
                        announce(d.id, d.getLong("number")?.toString().orEmpty(), d.getLong("seatNumber")?.toString().orEmpty(), d.getString("seatLabel").orEmpty(), items)
                    }
                }
        }
    }

    private fun announceJson(json: String) {
        try {
            val o = org.json.JSONObject(json)
            val arr = JSONArray(o.optString("items", "[]"))
            val items = (0 until arr.length()).map { Line(arr.getJSONObject(it).optString("name"), arr.getJSONObject(it).optInt("qty", 1)) }
            announce(o.optString("orderId"), o.optString("number"), o.optString("seatNumber"), o.optString("seatLabel"), items)
        } catch (e: Exception) {
            // Bad message: ignore. The live listener still announces the order.
        }
    }

    private fun announce(id: String, number: String, seatNumber: String, seatLabel: String, items: List<Line>) {
        if (id.isBlank() || !prefs.markSpoken(id)) return
        val sp = speaker ?: return
        val seat = seatNumber.ifBlank { seatLabel.filter { it.isDigit() } }
        sp.say(Words.order(number, seat, items, sp.modeFor(prefs.voiceLang)))
        Notify.newOrder(this, number, seatLabel.ifBlank { "Seat $seat" }, items.joinToString(", ") { "${it.qty} × ${it.name}" })
    }

    override fun onDestroy() {
        listener?.remove()
        speaker?.shutdown()
        super.onDestroy()
    }
}
