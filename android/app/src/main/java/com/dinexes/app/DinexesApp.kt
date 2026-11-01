package com.dinexes.app

import android.app.Application

class DinexesApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Notify.createChannels(this)
        // Start Firebase from cached settings so push messages work even before any screen opens.
        Config.initFirebase(this)
    }
}
