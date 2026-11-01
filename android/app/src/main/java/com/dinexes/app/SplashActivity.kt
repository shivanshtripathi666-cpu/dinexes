package com.dinexes.app

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Loads settings, starts Firebase and opens the right screen. */
class SplashActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launch {
            val v = withContext(Dispatchers.IO) { Config.refresh(this@SplashActivity) }
            if (v == null || !Config.initFirebase(this@SplashActivity)) {
                Toast.makeText(this@SplashActivity, "Please connect to the internet and open Dinexes again.", Toast.LENGTH_LONG).show()
                finish()
                return@launch
            }
            val signedIn = FirebaseAuth.getInstance().currentUser != null
            startActivity(Intent(this@SplashActivity, if (signedIn) MainActivity::class.java else LoginActivity::class.java))
            finish()
        }
    }
}
