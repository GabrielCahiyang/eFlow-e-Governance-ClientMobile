import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import{execFileSync}from'node:child_process';
const source=ts.createSourceFile('accounts.ts',fs.readFileSync('src/core/web/app/shared/quickLoginAccounts.ts','utf8'),ts.ScriptTarget.Latest,true);
const developmentCredentials=new Set();
function visit(node){if(ts.isPropertyAssignment(node)&&['email','password'].includes(node.name.getText(source).replaceAll(/["']/g,''))&&ts.isStringLiteralLike(node.initializer))developmentCredentials.add(node.initializer.text);ts.forEachChild(node,visit);}
visit(source);
if(!developmentCredentials.size)throw new Error('The development-account audit did not locate its source literals.');
function files(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(path.join(folder,item.name)):[path.join(folder,item.name)]);}
const findings=[];const bundles=[];
for(const platform of ['android','ios',...(process.env.EFLOW_ANDROID_APK_BUNDLE?['android-apk']:[])]){
 const folder=path.join('dist',platform);if(platform!=='android-apk'&&!fs.existsSync(path.join(folder,'metadata.json')))throw new Error(`${platform} export is missing.`);
 const platformBundles=platform==='android-apk'?[path.resolve(process.env.EFLOW_ANDROID_APK_BUNDLE)]:files(folder).filter(file=>/\.(?:hbc|js|bundle)$/.test(file));if(!platformBundles.length)throw new Error(`${platform} export has no executable bundle.`);
 for(const file of platformBundles){
  bundles.push(file);
  if(file.endsWith('.hbc')){
   const compiler=path.resolve('node_modules/hermes-compiler/hermesc',process.platform==='win32'?'win64-bin/hermesc.exe':process.platform==='darwin'?'osx-bin/hermesc':'linux64-bin/hermesc');
   const dump=execFileSync(compiler,['-dump-bytecode',file],{encoding:'utf8',maxBuffer:200*1024*1024});
   const strings=new Set(dump.split(/\r?\n/).flatMap(line=>{const match=line.match(/^[is]\d+\[[^\]]+\](?: #[0-9a-fA-F]+)?: (.*)$/);return match?[match[1]]:[];}));
   if(strings.size<100)throw new Error('The Hermes string-table audit could not read the current format.');
   if([...developmentCredentials].some(value=>strings.has(value)))findings.push(file);
  }else{
   const data=fs.readFileSync(file,'utf8');if([...developmentCredentials].some(value=>data.includes(JSON.stringify(value))))findings.push(file);
  }
 }
}
if(findings.length)throw new Error(`Development account literals reached ${findings.length} production bundle(s). Values were not printed.`);
const receipt={at:new Date().toISOString(),method:'Exact Hermes string-table entries; quoted literals for JavaScript. Numeric substrings are not credential matches.',platforms:['android','ios'],bundles:bundles.map(file=>file.replaceAll('\\','/')),developmentAccountLiteralCount:developmentCredentials.size,developmentAccountLiteralsFound:0};
fs.writeFileSync('docs/NATIVE_RELEASE_AUDIT.json',JSON.stringify(receipt,null,2)+'\n');
console.log(`Checked ${bundles.length} production bundles. Development account literals are absent.`);
