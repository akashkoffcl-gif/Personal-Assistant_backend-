package com.nova.companion.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nova.companion.ui.theme.DarkPurpleBg
import com.nova.companion.ui.theme.CardSurface
import com.nova.companion.ui.theme.PurplePrimary

@Composable
fun MainJarvisScreen() {
    var isListening by remember { mutableStateOf(false) }
    var assistantMessage by remember { mutableStateOf("JARVIS Companion ready. Listening for voice commands or mobile events.") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkPurpleBg)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.PhoneAndroid,
                    contentDescription = "Device",
                    tint = PurplePrimary,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "NOVA JARVIS",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = CardSurface
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = "Paired",
                        tint = Color(0xFF10B981),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "PAIRED (E2EE)",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF10B981)
                    )
                }
            }
        }

        // Assistant Status Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = CardSurface)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "STATUS FEED",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFA78BFA)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = assistantMessage,
                    fontSize = 15.sp,
                    color = Color(0xFFE5E7EB),
                    lineHeight = 22.sp
                )
            }
        }

        // Push to Talk / Voice Interaction Orb
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(bottom = 32.dp)
        ) {
            IconButton(
                onClick = {
                    isListening = !isListening
                    assistantMessage = if (isListening) "Listening to voice input..." else "Processing voice command..."
                },
                modifier = Modifier
                    .size(80.dp)
                    .background(
                        if (isListening) Color(0xFFEF4444) else PurplePrimary,
                        CircleShape
                    )
            ) {
                Icon(
                    imageVector = Icons.Default.Mic,
                    contentDescription = "Push to Talk",
                    tint = Color.White,
                    modifier = Modifier.size(36.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = if (isListening) "Tap to send" else "Hold or tap to speak",
                fontSize = 13.sp,
                color = Color(0xFF9CA3AF)
            )
        }
    }
}

