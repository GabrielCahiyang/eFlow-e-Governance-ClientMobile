import ExpoModulesCore
import AVFoundation

/** Delivers foreground mono 16 kHz signed PCM to the same bounded ASR path. */
public class EFlowPcmModule: Module {
  private var engine: AVAudioEngine?
  private var captureId: String?
  private let stateLock = NSLock()
  private let sessionQueue = DispatchQueue(label: "eflow.pcm.session")

  public func definition() -> ModuleDefinition {
    Name("EFlowPcm")
    Events("onPcm", "onEnded")
    AsyncFunction("start") { (id: String) in try self.startCapture(id) }.runOnQueue(sessionQueue)
    AsyncFunction("stop") { self.stopCapture() }.runOnQueue(sessionQueue)
    OnAppEntersBackground { self.sessionQueue.async { self.stopCapture() } }
    OnDestroy { self.sessionQueue.async { self.stopCapture() } }
  }

  private func isCurrent(_ id: String) -> Bool {
    stateLock.lock(); defer { stateLock.unlock() }
    return captureId == id
  }

  private func stopCapture() {
    stateLock.lock(); captureId = nil; stateLock.unlock()
    if let current = engine {
      current.inputNode.removeTap(onBus: 0)
      current.stop()
    }
    engine = nil
    // Playback owns the shared audio session after recording; do not deactivate it here.
  }

  private func startCapture(_ id: String) throws {
    stopCapture()
    let session = AVAudioSession.sharedInstance()
    guard session.recordPermission == .granted else { throw NSError(domain: "EFlowPcm", code: 1, userInfo: [NSLocalizedDescriptionKey: "Allow microphone access before starting eFlow Live."]) }
    try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
    try session.setActive(true)
    let current = AVAudioEngine()
    let input = current.inputNode
    let format = input.outputFormat(forBus: 0)
    guard format.sampleRate > 0, format.channelCount > 0,
      let output = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 16000, channels: 1, interleaved: false),
      let converter = AVAudioConverter(from: format, to: output) else {
      throw NSError(domain: "EFlowPcm", code: 2, userInfo: [NSLocalizedDescriptionKey: "The microphone format is unavailable."])
    }
    stateLock.lock(); captureId = id; stateLock.unlock()
    input.installTap(onBus: 0, bufferSize: 2048, format: format) { [weak self] buffer, _ in
      guard let self = self, self.isCurrent(id) else { return }
      let capacity = AVAudioFrameCount(ceil(Double(buffer.frameLength) * 16000 / format.sampleRate)) + 32
      guard let converted = AVAudioPCMBuffer(pcmFormat: output, frameCapacity: capacity) else { return }
      var provided = false
      var conversionError: NSError?
      let status = converter.convert(to: converted, error: &conversionError) { _, result in
        if provided { result.pointee = .noDataNow; return nil }
        provided = true; result.pointee = .haveData; return buffer
      }
      if status == .error {
        self.sendEvent("onEnded", ["captureId": id, "message": conversionError?.localizedDescription ?? "Microphone audio conversion failed."])
        self.sessionQueue.async { if self.isCurrent(id) { self.stopCapture() } }
        return
      }
      guard let channel = converted.floatChannelData?[0], converted.frameLength > 0, self.isCurrent(id) else { return }
      var pcm = [Int16](repeating: 0, count: Int(converted.frameLength))
      for index in pcm.indices {
        let raw = channel[index]
        let value: Float = raw.isFinite ? max(-1, min(1, raw)) : 0
        pcm[index] = Int16(value * (value < 0 ? 32768 : 32767)).littleEndian
      }
      let bytes = pcm.withUnsafeBufferPointer { Data(buffer: $0) }
      self.sendEvent("onPcm", ["captureId": id, "pcm": bytes.base64EncodedString(), "sampleRate": 16000])
    }
    engine = current
    do { current.prepare(); try current.start() }
    catch { stopCapture(); throw error }
  }
}
