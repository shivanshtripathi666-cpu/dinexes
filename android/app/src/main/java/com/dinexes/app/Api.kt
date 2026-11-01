package com.dinexes.app

import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class ApiException(message: String, val status: Int) : Exception(message)

/** Calls the Dinexes website API with the signed-in user's token. */
object Api {
    suspend fun call(method: String, path: String, body: JSONObject? = null, auth: Boolean = true): JSONObject = withContext(Dispatchers.IO) {
        val c = URL("${BuildConfig.BASE_URL}$path").openConnection() as HttpURLConnection
        c.requestMethod = method
        c.connectTimeout = 15000
        c.readTimeout = 20000
        if (auth) {
            val user = FirebaseAuth.getInstance().currentUser ?: throw ApiException("Please sign in.", 401)
            val token = user.getIdToken(false).await().token
            c.setRequestProperty("Authorization", "Bearer $token")
        }
        if (body != null) {
            c.doOutput = true
            c.setRequestProperty("Content-Type", "application/json")
            c.outputStream.use { it.write(body.toString().toByteArray()) }
        }
        val code = try {
            c.responseCode
        } catch (e: Exception) {
            throw ApiException("No internet connection. Please check and try again.", 0)
        }
        val stream = if (code in 200..299) c.inputStream else c.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() } ?: "{}"
        val json = try { JSONObject(text) } catch (e: Exception) { JSONObject() }
        if (code !in 200..299) throw ApiException(json.optString("error", "Something went wrong."), code)
        json
    }
}
