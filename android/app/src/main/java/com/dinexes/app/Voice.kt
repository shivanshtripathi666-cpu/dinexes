package com.dinexes.app

import android.content.Context
import android.media.AudioAttributes
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import java.util.UUID

data class Line(val name: String, val qty: Int)

/** The words spoken for an order, in English, Hindi, or Hinglish when the phone has no Hindi voice. */
object Words {
    private val EN = listOf("zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty")
    private val HI = listOf("शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस")
    private val HR = listOf("shunya", "ek", "do", "teen", "chaar", "paanch", "chhah", "saat", "aath", "nau", "das", "gyaarah", "baarah", "terah", "chaudah", "pandrah", "solah", "satrah", "athaarah", "unnees", "bees")

    private fun join(parts: List<String>, and: String) =
        if (parts.size <= 1) parts.joinToString("") else parts.dropLast(1).joinToString(", ") + " $and " + parts.last()

    fun order(number: String, seat: String, items: List<Line>, mode: String): String = when (mode) {
        "hi" -> "नया ऑर्डर। सीट नंबर $seat। ${join(items.map { "${HI.getOrElse(it.qty) { it.qty.toString() }} ${it.name}" }, "और")}। ऑर्डर नंबर $number।"
        "hinglish" -> "Naya order. Seat number $seat. ${join(items.map { "${HR.getOrElse(it.qty) { it.qty.toString() }} ${it.name}" }, "aur")}. Order number $number."
        else -> "New order. Seat number $seat. ${join(items.map { "${EN.getOrElse(it.qty) { it.qty.toString() }} ${it.name}" }, "and")}. Order number $number."
    }
}

/** Android text-to-speech. Works offline; Hindi uses the phone's Hindi voice when installed. */
class Speaker(ctx: Context, private val onReady: (() -> Unit)? = null) : TextToSpeech.OnInitListener {
    private val tts = TextToSpeech(ctx.applicationContext, this)
    private val pending = mutableListOf<String>()
    @Volatile private var ready = false
    var hindiAvailable = false
        private set

    override fun onInit(status: Int) {
        if (status != TextToSpeech.SUCCESS) return
        tts.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
        val r = tts.isLanguageAvailable(Locale("hi", "IN"))
        hindiAvailable = r == TextToSpeech.LANG_AVAILABLE || r == TextToSpeech.LANG_COUNTRY_AVAILABLE || r == TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE
        tts.setSpeechRate(0.95f)
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {}
            override fun onDone(id: String?) {}
            @Deprecated("Deprecated in Java")
            override fun onError(id: String?) {}
        })
        ready = true
        synchronized(pending) {
            pending.forEach { speakNow(it) }
            pending.clear()
        }
        onReady?.invoke()
    }

    /** "hi" falls back to Hinglish (spoken by the Indian English voice) when Hindi is not installed. */
    fun modeFor(lang: String) = if (lang == "hi") (if (hindiAvailable) "hi" else "hinglish") else "en"

    fun say(text: String) {
        if (!ready) {
            synchronized(pending) { pending.add(text) }
            return
        }
        speakNow(text)
    }

    private fun speakNow(text: String) {
        val devanagari = text.any { it in 'ऀ'..'ॿ' }
        tts.language = if (devanagari) Locale("hi", "IN") else Locale("en", "IN")
        tts.speak(text, TextToSpeech.QUEUE_ADD, null, UUID.randomUUID().toString())
    }

    fun shutdown() {
        tts.stop()
        tts.shutdown()
    }
}
