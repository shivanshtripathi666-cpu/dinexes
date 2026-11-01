package com.dinexes.app

import android.webkit.JavascriptInterface

/** Functions the website can call inside the app (window.DinexesApp). */
class AppBridge(private val activity: MainActivity) {
    @JavascriptInterface
    fun signOut() {
        activity.runOnUiThread { activity.signOutEverywhere() }
    }

    @JavascriptInterface
    fun openVoiceSettings() {
        activity.runOnUiThread { activity.showVoiceSettings() }
    }

    @JavascriptInterface
    fun isApp(): Boolean = true
}
