package com.nova.companion.data.local

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature

object KeyStoreManager {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "nova_device_identity_key"

    fun getOrCreateDeviceKeyPair(): KeyPair {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        if (keyStore.containsAlias(KEY_ALIAS)) {
            val entry = keyStore.getEntry(KEY_ALIAS, null) as KeyStore.PrivateKeyEntry
            return KeyPair(entry.certificate.publicKey, entry.privateKey)
        }

        val keyPairGenerator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC,
            ANDROID_KEYSTORE
        )

        val parameterSpec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        )
            .setDigests(KeyProperties.DIGEST_SHA256)
            .build()

        keyPairGenerator.initialize(parameterSpec)
        return keyPairGenerator.generateKeyPair()
    }

    fun getPublicKeyPem(): String {
        val keyPair = getOrCreateDeviceKeyPair()
        val base64Key = Base64.encodeToString(keyPair.public.encoded, Base64.NO_WRAP)
        return "-----BEGIN PUBLIC KEY-----\n$base64Key\n-----END PUBLIC KEY-----"
    }

    fun signChallenge(challenge: String): String {
        val keyPair = getOrCreateDeviceKeyPair()
        val privateKey: PrivateKey = keyPair.private
        val signature = Signature.getInstance("SHA256withECDSA").apply {
            initSign(privateKey)
            update(challenge.toByteArray(Charsets.UTF_8))
        }
        val signedBytes = signature.sign()
        return Base64.encodeToString(signedBytes, Base64.NO_WRAP)
    }
}

