package com.nova.companion.data.remote

import android.content.Context
import com.nova.companion.data.local.SecureSessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NovaApiClient {
    private const val BASE_URL = "https://nova-assistant-api.onrender.com/api/v1/"

    private var retrofitInstance: Retrofit? = null

    fun getApiService(): NovaApiService {
        if (retrofitInstance == null) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }

            val okHttpClient = OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .addInterceptor(logging)
                .build()

            retrofitInstance = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofitInstance!!.create(NovaApiService::class.java)
    }
}
