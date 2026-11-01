package com.dinexes.app

import android.content.Context
import android.webkit.CookieManager
import android.webkit.WebStorage
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await
import org.json.JSONObject

data class Me(val hasRestaurant: Boolean, val role: String, val voiceLang: String)

object Session {
    suspend fun me(): Me {
        val j = Api.call("GET", "/api/me")
        val r = j.optJSONObject("restaurant")
        val m = j.optJSONObject("member")
        return Me(
            hasRestaurant = r != null && m != null,
            role = m?.optString("role").orEmpty(),
            voiceLang = r?.optJSONObject("settings")?.optString("voiceLang", "en") ?: "en",
        )
    }

    /** Tells the server this phone should get new-order pushes. */
    suspend fun registerPush(ctx: Context, token: String? = null) {
        try {
            val t = token ?: FirebaseMessaging.getInstance().token.await()
            Prefs(ctx).pushToken = t
            Api.call("POST", "/api/push", JSONObject().put("token", t).put("platform", "android"))
        } catch (e: Exception) {
            // Not part of a restaurant yet, or offline: tried again on next start.
        }
    }

    /** One-time token so the built-in browser opens already signed in. */
    suspend fun handoffToken(): String = Api.call("POST", "/api/auth/handoff").getString("token")

    /** Signs out everywhere on this phone: voice off, pushes off, browser data cleared. */
    suspend fun signOut(ctx: Context) {
        OrderVoiceService.stop(ctx)
        val prefs = Prefs(ctx)
        val token = prefs.pushToken
        if (token.isNotBlank()) {
            try { Api.call("DELETE", "/api/push", JSONObject().put("token", token)) } catch (e: Exception) {}
        }
        try { FirebaseMessaging.getInstance().deleteToken().await() } catch (e: Exception) {}
        FirebaseAuth.getInstance().signOut()
        prefs.clear()
        CookieManager.getInstance().removeAllCookies(null)
        WebStorage.getInstance().deleteAllData()
    }
}
