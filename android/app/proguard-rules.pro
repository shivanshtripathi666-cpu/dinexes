# The website calls these methods from JavaScript.
-keepclassmembers class com.dinexes.app.AppBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
