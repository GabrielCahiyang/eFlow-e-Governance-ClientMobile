"""Check the actual installable artifact, not just its filename/build command."""
import hashlib,json,os,re,subprocess,sys,zipfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
apk=Path(sys.argv[1]).resolve()
config=json.loads((root/'app.json').read_text(encoding='utf-8'))['expo']
version=config['android']['versionCode']
sdk=Path(os.environ.get('ANDROID_HOME',str(Path.home()/'AppData/Local/Android/Sdk')))
tools=sdk/'build-tools'/'37.0.0'
metadata=subprocess.check_output([str(tools/'aapt.exe'),'dump','badging',str(apk)],text=True,encoding='utf-8')
manifest=subprocess.check_output([str(tools/'aapt.exe'),'dump','xmltree',str(apk),'AndroidManifest.xml'],text=True,encoding='utf-8')
if 'application-debuggable' in metadata:raise RuntimeError('Refusing a debuggable APK')
if version<2 or f"versionCode='{version}'" not in metadata or "name='com.eflow.mobile'" not in metadata:raise RuntimeError('Wrong package/build number')
if any(value.lower() in manifest.lower() for value in ['expo.modules.devlauncher','expo.modules.devmenu','DevLauncherActivity','exp+eflow-mobile']):raise RuntimeError('Development launcher metadata is packaged')
if "launchable-activity: name='com.eflow.mobile.MainActivity'" not in metadata:raise RuntimeError('Unexpected launch activity')
with zipfile.ZipFile(apk) as archive:
 names=archive.namelist()
 code=archive.read('assets/index.android.bundle')
 if len(code)<100000:raise RuntimeError('Embedded app bundle missing or empty')
 for entry in names:
  if re.fullmatch(r'classes\d*\.dex',entry):
   dex=archive.read(entry)
   if b'Lexpo/modules/devlauncher/' in dex or b'Lexpo/modules/devmenu/' in dex:raise RuntimeError('Development launcher bytecode is packaged')
 native=root/'android/app/build/generated/assets/react/release/index.android.bundle'
 if code!=native.read_bytes():raise RuntimeError('APK contains a different app bundle than the current release output')
 source_map=json.loads((root/'android/app/build/generated/sourcemaps/react/release/index.android.bundle.map').read_text(encoding='utf-8'))
 checked=[]
 for file in ['src/app/features/app-shell/AppRoot.tsx','src/app/features/authentication/LoginScreen.tsx','src/platform/bootstrap.ts','src/platform/webRuntime.ts']:
  index=next((i for i,name in enumerate(source_map['sources']) if name.replace('\\','/').endswith('/'+file)),None)
  if index is None or source_map['sourcesContent'][index]!=(root/file).read_bytes().decode('utf-8'):raise RuntimeError('Bundled eFlow startup/login source is missing or stale')
  checked.append(file)
 receipt={'apk':str(apk),'versionCode':version,'debuggable':False,'launchActivity':'com.eflow.mobile.MainActivity','developmentLauncherPackaged':False,'embeddedBundleBytes':len(code),'startupSourcesMatched':checked,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'bytes':apk.stat().st_size}
 label = {'eFlow-android-standalone-catchup-x86_64.apk': 'CATCHUP_X86_64', 'eFlow-Android.apk': 'PHONE_ARM64'}.get(apk.name, f'V{version}')
 out=root/f'docs/STANDALONE_{label}_APK_VERIFICATION.json'
 out.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
 (root/f'artifacts/embedded-android-{label.lower()}.hbc').write_bytes(code)
 print(json.dumps(receipt))



