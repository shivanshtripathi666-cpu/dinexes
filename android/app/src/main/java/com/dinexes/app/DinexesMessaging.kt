package com.dinexes.app

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

/** Push messages from the Dinexes server: a new order wakes the voice service, even after sleep. */
class DinexesMessaging : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val d = message.data
        if (d["type"] != "new_order") return
        val json = JSONObject(d as Map<*, *>).toString()
        if (FirebaseAuth.getInstance().currentUser != null && Prefs(this).voiceOn) {
            OrderVoiceService.start(this, json)
        } else {
            val name = d["customerName"].orEmpty()
            val who = when (d["kind"]) {
                "takeaway" -> "Parcel · ${name.ifBlank { d["seatLabel"].orEmpty() }}"
                "counter" -> if (name.isBlank()) d["seatLabel"].orEmpty() else "$name · ${d["seatLabel"].orEmpty()}"
                else -> d["seatLabel"].orEmpty()
            }
            Notify.newOrder(this, d["number"].orEmpty(), who, "Open Dinexes to see the order.")
        }
    }

    override fun onNewToken(token: String) {
        Prefs(this).pushToken = token
        if (FirebaseAuth.getInstance().currentUser == null) return
        CoroutineScope(Dispatchers.IO).launch { Session.registerPush(applicationContext, token) }
    }
}
