package com.dinexes.app

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Public settings come from the website (/api/app-config), so the app needs no Firebase file in its
 * code and always matches the live project. They are cached for offline starts.
 */
object Config {
    private const val PREFS = "dinexes_config"

    data class Values(
        val baseUrl: String,
        val apiKey: String,
        val projectId: String,
        val storageBucket: String,
        val senderId: String,
        val androidAppId: String,
        val webClientId: String,
    )

    @Volatile var values: Values? = null
        private set

    fun load(ctx: Context): Values? {
        values?.let { return it }
        val raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("json", null) ?: return null
        return parse(raw)?.also { values = it }
    }

    /** Downloads fresh settings; returns null when offline and nothing is cached. */
    fun refresh(ctx: Context): Values? {
        return try {
            val c = URL("${BuildConfig.BASE_URL}/api/app-config").openConnection() as HttpURLConnection
            c.connectTimeout = 10000
            c.readTimeout = 10000
            val body = c.inputStream.bufferedReader().use { it.readText() }
            val v = parse(body) ?: return load(ctx)
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("json", body).apply()
            values = v
            v
        } catch (e: Exception) {
            load(ctx)
        }
    }

    private fun parse(raw: String): Values? = try {
        val j = JSONObject(raw)
        val v = Values(
            baseUrl = BuildConfig.BASE_URL,
            apiKey = j.optString("apiKey"),
            projectId = j.optString("projectId"),
            storageBucket = j.optString("storageBucket"),
            senderId = j.optString("senderId"),
            androidAppId = j.optString("androidAppId"),
            webClientId = j.optString("webClientId"),
        )
        if (v.apiKey.isBlank() || v.projectId.isBlank() || v.androidAppId.isBlank()) null else v
    } catch (e: Exception) {
        null
    }

    /** Starts Firebase once with the downloaded settings. Safe to call many times. */
    fun initFirebase(ctx: Context): Boolean {
        if (FirebaseApp.getApps(ctx).isNotEmpty()) return true
        val v = load(ctx) ?: return false
        val opts = FirebaseOptions.Builder()
            .setApiKey(v.apiKey)
            .setApplicationId(v.androidAppId)
            .setProjectId(v.projectId)
            .setGcmSenderId(v.senderId)
            .setStorageBucket(v.storageBucket)
            .build()
        FirebaseApp.initializeApp(ctx.applicationContext, opts)
        return true
    }
}
