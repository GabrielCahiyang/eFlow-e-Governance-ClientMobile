const {withDangerousMod}=require('expo/config-plugins');
const fs=require('node:fs');const path=require('node:path');
const rules=`
# eFlow native release compatibility (exact optional/generated references only)
# PDFBox JPX image decoding is not used by the text/vector-only extractor.
-dontwarn com.gemalto.jp2.JP2Decoder
# Jitsi M155 ships this unused generated shim without its absent Java decoder/interface.
# The native SoftwareVideoDecoderFactory path does not reference the Java shim.
-dontwarn org.webrtc.Dav1dDecoder$Natives
`;
module.exports=config=>withDangerousMod(config,['android',async config=>{const file=path.join(config.modRequest.platformProjectRoot,'app','proguard-rules.pro');const current=fs.readFileSync(file,'utf8');if(!current.includes('# eFlow native release compatibility'))fs.appendFileSync(file,rules);return config;}]);
module.exports.rules=rules;
