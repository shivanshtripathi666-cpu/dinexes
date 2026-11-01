package com.dinexes.app

import android.content.Context

/** Small settings kept on this phone. */
class Prefs(ctx: Context) {
    private val p = ctx.getSharedPreferences("dinexes", Context.MODE_PRIVATE)

    var voiceOn: Boolean
        get() = p.getBoolean("voice_on", true)
        set(v) = p.edit().putBoolean("voice_on", v).apply()

    /** "en" or "hi". */
    var voiceLang: String
        get() = p.getString("voice_lang", "en") ?: "en"
        set(v) = p.edit().putString("voice_lang", v).apply()

    var pushToken: String
        get() = p.getString("push_token", "") ?: ""
        set(v) = p.edit().putString("push_token", v).apply()

    var askedBattery: Boolean
        get() = p.getBoolean("asked_battery", false)
        set(v) = p.edit().putBoolean("asked_battery", v).apply()

    /** Remembers which orders were already announced, so an order is spoken once. */
    @Synchronized
    fun markSpoken(id: String): Boolean {
        val list = (p.getString("spoken", "") ?: "").split(",").filter { it.isNotBlank() }.toMutableList()
        if (list.contains(id)) return false
        list.add(id)
        while (list.size > 200) list.removeAt(0)
        p.edit().putString("spoken", list.joinToString(",")).apply()
        return true
    }

    fun clear() {
        val lang = voiceLang
        p.edit().clear().apply()
        voiceLang = lang
    }
}
