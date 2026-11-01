package com.dinexes.app

import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.lifecycle.lifecycleScope
import com.dinexes.app.Ui.add
import com.dinexes.app.Ui.dp
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.material.button.MaterialButton
import com.google.android.material.button.MaterialButtonToggleGroup
import com.google.firebase.FirebaseException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.concurrent.TimeUnit

/**
 * Sign-in. Owner: Google, phone OTP or email. Staff: email and the password the owner set
 * (staff never register).
 */
class LoginActivity : AppCompatActivity() {
    private val auth by lazy { FirebaseAuth.getInstance() }
    private var staff = false
    private var verificationId: String? = null
    private lateinit var error: TextView
    private lateinit var ownerBox: LinearLayout
    private lateinit var phoneBox: LinearLayout
    private lateinit var codeBox: LinearLayout
    private lateinit var note: TextView
    private val busyViews = mutableListOf<View>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = Ui.column(this).apply { setBackgroundColor(Ui.PAPER) }

        // Header
        val head = Ui.column(this).apply {
            setBackgroundColor(Ui.NAVY)
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(40), dp(24), dp(28))
        }
        head.addView(ImageView(this).apply { setImageResource(R.drawable.ic_mark) }, LinearLayout.LayoutParams(dp(64), dp(64)))
        head.add(Ui.center(Ui.title(this, "Dinexes", Ui.IVORY)), 12)
        head.add(Ui.center(Ui.text(this, "Orders from every seat, spoken in your kitchen.", 14f, 0xCCF4EEE2.toInt())), 4)
        root.add(head)

        val body = Ui.column(this).apply { setPadding(dp(20), dp(20), dp(20), dp(32)) }
        root.add(body)

        val tabs = MaterialButtonToggleGroup(this).apply { isSingleSelection = true; isSelectionRequired = true }
        val ownerTab = tabButton("Owner").apply { id = View.generateViewId() }
        val staffTab = tabButton("Staff").apply { id = View.generateViewId() }
        tabs.addView(ownerTab, LinearLayout.LayoutParams(0, dp(50), 1f))
        tabs.addView(staffTab, LinearLayout.LayoutParams(0, dp(50), 1f))
        tabs.check(ownerTab.id)
        body.add(tabs)

        note = Ui.text(this, "", 14f, Ui.MUTED)
        body.add(note, 12)

        // Owner: Google and phone
        ownerBox = Ui.column(this)
        body.add(ownerBox, 8)
        ownerBox.add(Ui.button(this, "Continue with Google", "outline") { google() }.also { busyViews += it }, 8)
        ownerBox.add(Ui.button(this, "Continue with phone number", "outline") {
            phoneBox.visibility = if (phoneBox.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }, 10)

        phoneBox = Ui.column(this).apply { visibility = View.GONE }
        ownerBox.add(phoneBox, 8)
        val (phoneLayout, phone) = Ui.field(this, "Mobile number", InputType.TYPE_CLASS_PHONE)
        phone.setText("+91 ")
        phoneBox.add(phoneLayout)
        phoneBox.add(Ui.button(this, "Send OTP", "dark") { sendOtp(phone.text.toString()) }.also { busyViews += it }, 8)
        codeBox = Ui.column(this).apply { visibility = View.GONE }
        phoneBox.add(codeBox, 8)
        val (codeLayout, code) = Ui.field(this, "6-digit OTP", InputType.TYPE_CLASS_NUMBER)
        codeBox.add(codeLayout)
        codeBox.add(Ui.button(this, "Verify and sign in", "primary") { verifyOtp(code.text.toString()) }.also { busyViews += it }, 8)

        ownerBox.add(Ui.center(Ui.text(this, "—  or with email  —", 12f, Ui.MUTED)), 18)

        // Email and password (owner and staff)
        val (emailLayout, email) = Ui.field(this, "Email", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS)
        body.add(emailLayout, 10)
        val (passLayout, pass) = Ui.field(this, "Password", password = true)
        body.add(passLayout, 10)
        error = Ui.text(this, "", 14f, Ui.BAD).apply { visibility = View.GONE }
        body.add(error, 10)
        val signIn = Ui.button(this, "Sign in as owner", "primary") { emailSignIn(email.text.toString().trim(), pass.text.toString()) }
        busyViews += signIn
        body.add(signIn, 12)
        val forgot = Ui.text(this, "Forgot password?", 14f, Ui.INK, true).apply {
            setPadding(0, dp(14), 0, dp(4))
            setOnClickListener { resetPassword(email.text.toString().trim()) }
        }
        body.add(forgot)
        val register = Ui.text(this, "New restaurant? Use “Continue with Google” or your phone number above, then add your restaurant. You get 7 days free.", 13f, Ui.MUTED)
        body.add(register, 14)

        fun show() {
            ownerBox.visibility = if (staff) View.GONE else View.VISIBLE
            register.visibility = if (staff) View.GONE else View.VISIBLE
            signIn.text = if (staff) "Sign in as staff" else "Sign in as owner"
            forgot.text = if (staff) "Forgot your password? Ask your owner to set a new one." else "Forgot password?"
            forgot.isClickable = !staff
            note.text = if (staff) "For staff added by the owner. Use the email and password your owner gave you. Staff do not register."
            else "For the restaurant owner."
            error.visibility = View.GONE
        }
        tabs.addOnButtonCheckedListener { _, id, checked -> if (checked) { staff = id == staffTab.id; show() } }
        show()

        setContentView(ScrollView(this).apply { isFillViewport = true; addView(root) })
    }

    private fun tabButton(label: String) = MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
        text = label
        isAllCaps = false
        textSize = 15f
    }

    private fun busy(b: Boolean) = busyViews.forEach { it.isEnabled = !b }

    private fun fail(msg: String) {
        busy(false)
        error.setTextColor(Ui.BAD)
        error.text = msg
        error.visibility = View.VISIBLE
    }

    private fun message(e: Exception): String = when (e) {
        is FirebaseAuthInvalidUserException -> "No account with these details. Check the email, or ask your owner."
        is FirebaseAuthInvalidCredentialsException -> if (verificationId != null) "That OTP is not right. Please check and try again." else "Email or password is incorrect."
        is FirebaseTooManyRequestsException -> "Too many attempts. Please wait a few minutes."
        is ApiException -> e.message ?: "Something went wrong."
        is FirebaseException -> e.message ?: "Could not sign in. Check your internet connection."
        else -> "Could not sign in. Check your internet connection."
    }

    private fun emailSignIn(email: String, pass: String) {
        if (email.isBlank() || pass.isBlank()) return fail("Enter your email and password.")
        busy(true)
        lifecycleScope.launch {
            try {
                auth.signInWithEmailAndPassword(email, pass).await()
                afterSignIn()
            } catch (e: Exception) {
                fail(message(e))
            }
        }
    }

    private fun google() {
        val clientId = Config.values?.webClientId.orEmpty()
        if (clientId.isBlank()) return fail("Google sign-in is not turned on yet. Use phone or email for now.")
        busy(true)
        lifecycleScope.launch {
            try {
                val option = GetGoogleIdOption.Builder().setServerClientId(clientId).setFilterByAuthorizedAccounts(false).build()
                val result = CredentialManager.create(this@LoginActivity)
                    .getCredential(this@LoginActivity, GetCredentialRequest.Builder().addCredentialOption(option).build())
                val google = GoogleIdTokenCredential.createFrom(result.credential.data)
                auth.signInWithCredential(GoogleAuthProvider.getCredential(google.idToken, null)).await()
                afterSignIn()
            } catch (e: GetCredentialCancellationException) {
                busy(false)
            } catch (e: Exception) {
                fail(if (e is androidx.credentials.exceptions.GetCredentialException) "Google sign-in could not start on this phone. Try phone or email." else message(e))
            }
        }
    }

    private fun sendOtp(raw: String) {
        val digits = raw.filter { it.isDigit() || it == '+' }
        val number = when {
            digits.startsWith("+") -> digits
            digits.length == 10 -> "+91$digits"
            else -> digits
        }
        if (!Regex("^\\+\\d{10,14}$").matches(number)) return fail("Enter a valid mobile number, like +91 98765 43210.")
        busy(true)
        val opts = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(number)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(this)
            .setCallbacks(object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                override fun onVerificationCompleted(credential: PhoneAuthCredential) = signInWith(credential)
                override fun onVerificationFailed(e: FirebaseException) = fail(message(e))
                override fun onCodeSent(id: String, token: PhoneAuthProvider.ForceResendingToken) {
                    verificationId = id
                    busy(false)
                    codeBox.visibility = View.VISIBLE
                    note.text = "We sent an OTP by SMS to $number."
                }
            })
            .build()
        PhoneAuthProvider.verifyPhoneNumber(opts)
    }

    private fun verifyOtp(code: String) {
        val id = verificationId ?: return fail("Tap “Send OTP” first.")
        if (code.trim().length < 6) return fail("Enter the 6-digit OTP.")
        signInWith(PhoneAuthProvider.getCredential(id, code.trim()))
    }

    private fun signInWith(credential: PhoneAuthCredential) {
        busy(true)
        lifecycleScope.launch {
            try {
                auth.signInWithCredential(credential).await()
                afterSignIn()
            } catch (e: Exception) {
                fail(message(e))
            }
        }
    }

    private fun resetPassword(email: String) {
        if (staff) return
        if (email.isBlank()) return fail("Enter your email above, then tap “Forgot password?”.")
        lifecycleScope.launch {
            try {
                auth.sendPasswordResetEmail(email).await()
            } catch (e: Exception) {
                // Do not reveal whether the email exists.
            }
            error.setTextColor(Ui.OK)
            error.text = "If an account exists for this email, a reset link is on its way."
            error.visibility = View.VISIBLE
        }
    }

    private suspend fun afterSignIn() {
        try {
            val me = Session.me()
            if (!me.hasRestaurant && staff) {
                auth.signOut()
                return fail("This login is not part of any restaurant. Ask your restaurant owner to add your email under Staff.")
            }
            val prefs = Prefs(this)
            prefs.voiceLang = me.voiceLang
            startActivity(
                Intent(this, MainActivity::class.java)
                    .putExtra(MainActivity.EXTRA_PATH, if (me.hasRestaurant) "" else "/register")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK),
            )
            finish()
        } catch (e: Exception) {
            auth.signOut()
            fail("Signed in, but your restaurant could not be opened: ${message(e)}")
        }
    }
}
