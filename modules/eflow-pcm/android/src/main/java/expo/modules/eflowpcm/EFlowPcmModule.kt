package expo.modules.eflowpcm

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Foreground-only mono PCM capture. No file, upload, or model runs in this module. */
class EFlowPcmModule : Module() {
  @Volatile private var captureId: String? = null
  private var recorder: AudioRecord? = null
  private var worker: Thread? = null
  private var echo: AcousticEchoCanceler? = null
  private var noise: NoiseSuppressor? = null

  override fun definition() = ModuleDefinition {
    Name("EFlowPcm")
    Events("onPcm", "onEnded")
    AsyncFunction("start") { id: String -> startCapture(id) }
    AsyncFunction("stop") { stopCapture() }
    OnActivityEntersBackground { stopCapture() }
    OnDestroy { stopCapture() }
  }

  @Synchronized private fun startCapture(id: String) {
    stopCapture()
    val context = appContext.reactContext ?: error("The eFlow app is unavailable.")
    check(context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
      "Microphone access is required. Allow it in the app permission prompt."
    }
    val minimum = AudioRecord.getMinBufferSize(16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    check(minimum > 0) { "This microphone does not support mono 16 kHz audio." }
    val input = AudioRecord.Builder()
      .setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION)
      .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT)
        .setSampleRate(16000).setChannelMask(AudioFormat.CHANNEL_IN_MONO).build())
      .setBufferSizeInBytes(maxOf(minimum * 2, 6400)).build()
    if (input.state != AudioRecord.STATE_INITIALIZED) {
      input.release()
      error("The microphone could not initialize. Close other recording apps and try again.")
    }
    recorder = input
    try {
      if (AcousticEchoCanceler.isAvailable()) echo = AcousticEchoCanceler.create(input.audioSessionId)?.also { it.enabled = true }
      if (NoiseSuppressor.isAvailable()) noise = NoiseSuppressor.create(input.audioSessionId)?.also { it.enabled = true }
      input.startRecording()
      check(input.recordingState == AudioRecord.RECORDSTATE_RECORDING) { "The microphone did not start recording." }
      captureId = id
      worker = Thread({
        android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_AUDIO)
        val bytes = ByteArray(3200)
        try {
          while (captureId == id) {
            val count = input.read(bytes, 0, bytes.size, AudioRecord.READ_BLOCKING)
            if (captureId != id) break
            check(count > 0 && count % 2 == 0) { "The microphone stopped delivering PCM audio." }
            sendEvent("onPcm", mapOf("captureId" to id, "pcm" to Base64.encodeToString(bytes, 0, count, Base64.NO_WRAP), "sampleRate" to 16000))
          }
        } catch (cause: Exception) {
          if (captureId == id) {
            captureId = null
            try { input.stop() } catch (_: Exception) { }
            sendEvent("onEnded", mapOf("captureId" to id, "message" to (cause.message ?: "Microphone capture stopped.")))
          }
        }
      }, "eFlow-PCM").also { it.start() }
    } catch (cause: Exception) {
      stopCapture()
      throw cause
    }
  }

  @Synchronized private fun stopCapture() {
    captureId = null
    val input = recorder
    recorder = null
    try { input?.stop() } catch (_: Exception) { }
    worker?.let { if (it !== Thread.currentThread()) it.join(1000) }
    worker = null
    echo?.release(); echo = null
    noise?.release(); noise = null
    input?.release()
  }
}
