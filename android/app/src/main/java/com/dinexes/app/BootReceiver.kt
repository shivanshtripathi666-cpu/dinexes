package com.dinexes.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.firebase.auth.FirebaseAuth

/** After the phone restarts (or the app updates), the voice comes back on by itself. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (!Config.initFirebase(ctx)) return
        if (FirebaseAuth.getInstance().currentUser != null && Prefs(ctx).voiceOn) OrderVoiceService.start(ctx)
    }
}
