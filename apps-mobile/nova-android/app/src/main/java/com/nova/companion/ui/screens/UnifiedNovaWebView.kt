package com.nova.companion.ui.screens

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.net.Uri
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.nova.companion.bridge.NovaNativeBridge

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun UnifiedNovaWebView(
    initialUrl: String = "https://nova-assistant-web.onrender.com",
    onRequestMicPermission: () -> Unit,
    modifier: Modifier = Modifier
) {
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    var progress by remember { mutableFloatStateOf(0f) }
    var isLoading by remember { mutableStateOf(true) }

    // Intercept hardware / gesture back button for in-WebView history navigation
    BackHandler(enabled = webViewInstance?.canGoBack() == true) {
        webViewInstance?.goBack()
    }

    Box(modifier = modifier.fillMaxSize().background(Color(0xFF0F0E17))) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )

                    // 1. Secured WebView Configuration
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        allowFileAccess = false
                        allowContentAccess = false
                        setSupportZoom(false)
                        builtInZoomControls = false
                        displayZoomControls = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                        cacheMode = WebSettings.LOAD_DEFAULT
                        userAgentString = "$userAgentString NovaUnifiedAndroid/1.0"
                    }

                    // 2. Register Javascript Bridge Interface
                    val bridge = NovaNativeBridge(context, onRequestMicPermission)
                    addJavascriptInterface(bridge, NovaNativeBridge.JAVASCRIPT_INTERFACE_NAME)

                    // 3. WebChromeClient for Progress & Media Permissions
                    webChromeClient = object : WebChromeClient() {
                        override fun onProgressChanged(view: WebView?, newProgress: Int) {
                            progress = newProgress / 100f
                            isLoading = newProgress < 100
                        }

                        override fun onPermissionRequest(request: PermissionRequest?) {
                            request?.let {
                                val resources = it.resources
                                if (resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                                    it.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                                } else {
                                    it.deny()
                                }
                            }
                        }
                    }

                    // 4. WebViewClient to Enforce Origin Security Boundaries
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            val url = request?.url?.toString() ?: return false
                            val uri = Uri.parse(url)
                            val host = uri.host ?: ""

                            // Stay inside trusted NOVA hosts
                            if (host.contains("onrender.com") || host.contains("localhost") || host.contains("10.0.2.2")) {
                                return false
                            }

                            // Open external links safely via external browser
                            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, uri)
                            context.startActivity(intent)
                            return true
                        }

                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            isLoading = true
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            isLoading = false
                        }
                    }

                    loadUrl(initialUrl)
                    webViewInstance = this
                }
            },
            update = {
                webViewInstance = it
            }
        )

        // Loading Progress Bar
        if (isLoading && progress < 1f) {
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .align(Alignment.TopCenter),
                color = Color(0xFF8B45F5),
                trackColor = Color(0xFF1E1B4B)
            )
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            webViewInstance?.destroy()
            webViewInstance = null
        }
    }
}
