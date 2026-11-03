Pod::Spec.new do |s|
  s.name = 'EFlowPcm'
  s.version = '1.0.0'
  s.summary = 'Foreground PCM microphone capture for eFlow Live'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'eFlow'
  s.homepage = 'https://expo.dev'
  s.platform = :ios, '16.4'
  s.swift_version = '5.9'
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
