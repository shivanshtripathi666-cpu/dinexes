package com.dinexes.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.dinexes.app.Ui.dp
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.launch

/**
 * The restaurant screens (dashboard, kitchen, counter, menu, staff ...) shown in a built-in browser,
 * signed in with the app's login, plus the app's own always-on order voice.
 */
class MainActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_PATH = "path"
    }

    private lateinit var web: WebView
    private lateinit var progress: ProgressBar
    private lateinit var prefs: Prefs
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    private val pickImage = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        fileCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        fileCallback = null
    }
    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { startVoice() }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!Config.initFirebase(this) || FirebaseAuth.getInstance().currentUser == null) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }
        prefs = Prefs(this)

        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(Ui.NAVY) }
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), 0, dp(6), 0)
            setBackgroundColor(Ui.NAVY)
        }
        bar.addView(android.widget.ImageView(this).apply { setImageResource(R.drawable.ic_mark) }, LinearLayout.LayoutParams(dp(28), dp(28)))
        bar.addView(TextView(this).apply {
            text = "Dinexes"
            textSize = 18f
            setTextColor(Ui.IVORY)
            typeface = android.graphics.Typeface.create(android.graphics.Typeface.SERIF, android.graphics.Typeface.BOLD)
            setPadding(dp(10), 0, 0, 0)
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        bar.addView(ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_lock_silent_mode_off)
            setColorFilter(Ui.AMBER)
            background = null
            contentDescription = "Voice settings"
            setOnClickListener { showVoiceSettings() }
        }, LinearLayout.LayoutParams(dp(48), dp(48)))
        root.addView(bar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)))

        val frame = FrameLayout(this)
        web = WebView(this)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply { isIndeterminate = true }
        frame.addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        frame.addView(progress, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(4)))
        root.addView(frame, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            userAgentString = "$userAgentString DinexesApp/${BuildConfig.VERSION_NAME}"
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }
        web.addJavascriptInterface(AppBridge(this), "DinexesApp")
        val host = Uri.parse(BuildConfig.BASE_URL).host
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url
                if (u.host == host || u.host == "checkout.razorpay.com" || u.host?.endsWith("razorpay.com") == true) return false
                try { startActivity(Intent(Intent.ACTION_VIEW, u)) } catch (e: Exception) {}
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                progress.visibility = View.GONE
                if (Uri.parse(url).path == "/login") signOutEverywhere()
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                pickImage.launch("image/*")
                return true
            }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else moveTaskToBack(true)
            }
        })

        openSignedIn(intent.getStringExtra(EXTRA_PATH).orEmpty())
        askThenStartVoice()
        lifecycleScope.launch { Session.registerPush(applicationContext) }
    }

    private fun openSignedIn(path: String) {
        progress.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val token = Session.handoffToken()
                web.loadUrl("${BuildConfig.BASE_URL}/app/handoff#t=${Uri.encode(token)}&next=${Uri.encode(path)}")
            } catch (e: ApiException) {
                if (e.status == 401 || e.status == 403) signOutEverywhere() else web.loadUrl("${BuildConfig.BASE_URL}/dashboard")
            } catch (e: Exception) {
                web.loadUrl("${BuildConfig.BASE_URL}/dashboard")
            }
        }
    }

    private fun askThenStartVoice() {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            startVoice()
        }
    }

    private fun startVoice() {
        if (prefs.voiceOn) OrderVoiceService.start(this)
        if (prefs.voiceOn && !prefs.askedBattery) {
            prefs.askedBattery = true
            AlertDialog.Builder(this)
                .setTitle("Keep order voice running")
                .setMessage("So that new orders are spoken even when the phone is locked, allow Dinexes to run in the background.\n\nOn the next screen choose Dinexes → “Don’t optimise” (or “Unrestricted”).")
                .setPositiveButton("Open settings") { _, _ ->
                    try { startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) } catch (e: Exception) {}
                }
                .setNegativeButton("Later", null)
                .show()
        }
    }

    fun showVoiceSettings() {
        val langs = arrayOf("English", "हिंदी (Hindi)")
        var lang = if (prefs.voiceLang == "hi") 1 else 0
        AlertDialog.Builder(this)
            .setTitle(if (prefs.voiceOn) "Order voice is ON" else "Order voice is OFF")
            .setSingleChoiceItems(langs, lang) { _, which -> lang = which }
            .setPositiveButton(if (prefs.voiceOn) "Save" else "Turn on") { _, _ ->
                prefs.voiceLang = if (lang == 1) "hi" else "en"
                prefs.voiceOn = true
                OrderVoiceService.start(this)
                testVoice()
            }
            .setNeutralButton(if (prefs.voiceOn) "Turn off" else "Cancel") { _, _ ->
                if (prefs.voiceOn) {
                    prefs.voiceOn = false
                    OrderVoiceService.stop(this)
                }
            }
            .setNegativeButton("Sign out") { _, _ -> signOutEverywhere() }
            .show()
    }

    private fun testVoice() {
        var s: Speaker? = null
        s = Speaker(this) {
            s?.let { sp ->
                sp.say(Words.order("101", "2", listOf(Line("Chicken Biryani", 1), Line("Cold Coffee", 2)), sp.modeFor(prefs.voiceLang)))
                if (prefs.voiceLang == "hi" && !sp.hindiAvailable) {
                    AlertDialog.Builder(this)
                        .setTitle("Hindi voice not installed")
                        .setMessage("Orders are spoken in Hinglish for now. For proper Hindi: Settings → search “Text-to-speech” → Speech Services by Google → Install voice data → Hindi (India).")
                        .setPositiveButton("OK", null)
                        .show()
                }
            }
        }
        web.postDelayed({ s?.shutdown() }, 15000)
    }

    private var signingOut = false

    fun signOutEverywhere() {
        if (signingOut) return
        signingOut = true
        lifecycleScope.launch {
            Session.signOut(applicationContext)
            startActivity(Intent(this@MainActivity, LoginActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
            finish()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.getStringExtra(EXTRA_PATH)?.takeIf { it.isNotBlank() }?.let { openSignedIn(it) }
    }
}
