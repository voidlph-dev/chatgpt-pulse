// CI candidate packaging after native exit acceptance. No GitHub publication.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

assert.equal(process.platform,'win32','Windows runner required');
const root=fileURLToPath(new URL('../',import.meta.url));
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version;
const validation=JSON.parse(fs.readFileSync(path.join(root,'test-results/native-exit/result.json')));
assert.equal(validation.passed,true);assert.equal(validation.checks.length,7);assert.equal(validation.version,version);
const binary=path.join(root,'src-tauri/target/release/chatgpt-pulse.exe');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const nativeHash=sha(binary),folder=path.join(root,'release/windows-exit-fix');fs.mkdirSync(folder,{recursive:true});
const assets=[];
for(const variant of ['online','offline']){
 const config=`src-tauri/tauri.windows${variant==='offline'?'-offline':''}.conf.json`;
 const bundled=spawnSync(process.execPath,['scripts/windows-bundle.mjs','--config',config],{cwd:root,stdio:'inherit',timeout:600000});
 if(bundled.error)throw bundled.error;assert.equal(bundled.status,0,variant+' installer build failed');
 assert.equal(sha(binary),nativeHash,'Bundling must preserve the tested binary');
 const installers=fs.readdirSync(path.join(root,'src-tauri/target/release/bundle/nsis')).filter(n=>n.endsWith('-setup.exe'));
 assert.equal(installers.length,1,'Expected exactly one freshly built NSIS setup');
 const name=`ChatGPT-Pulse-${version}-windows-x64-music-${variant}-setup.exe`;
 fs.copyFileSync(path.join(root,'src-tauri/target/release/bundle/nsis',installers[0]),path.join(folder,name));
 assets.push({file:name,sha256:sha(path.join(folder,name)),bytes:fs.statSync(path.join(folder,name)).size});
}
// Install in the ephemeral runner and repeat the real-process quit tests on the
// installed executable. Existing WebView2 means clean offline deployment is NOT
// established by this acceptance.
const install=path.join(process.env.RUNNER_TEMP,'pulse-exit-fix-installed');
const installer=path.join(folder,assets.find(a=>a.file.includes('-offline-')).file);
const installed=spawnSync(installer,['/S','/D='+install],{cwd:root,stdio:'inherit',timeout:120000});
if(installed.error)throw installed.error;assert.equal(installed.status,0,'Silent installer failed');
const installedBinary=path.join(install,'chatgpt-pulse.exe');
assert.equal(sha(installedBinary),nativeHash,'Installed binary differs from tested build');
const tested=spawnSync(process.execPath,['scripts/test-native-exit.mjs'],{cwd:root,env:{...process.env,PULSE_APP:installedBinary},stdio:'inherit',timeout:180000});
if(tested.error)throw tested.error;assert.equal(tested.status,0,'Installed exit regression failed');
const installedValidation=JSON.parse(fs.readFileSync(path.join(root,'test-results/native-exit/result.json')));
fs.writeFileSync(path.join(folder,'WINDOWS_EXIT_FIX_VALIDATION.json'),JSON.stringify({
 version,source_commit:process.env.GITHUB_SHA,workflow_run:process.env.GITHUB_RUN_ID,native_sha256:nativeHash,
 build_native_exit:validation,installed_native_exit:installedValidation,installer_exit_code:installed.status,
 scope:'GitHub-hosted Windows x64 runner; isolated synthetic Work logs. No physical-user-machine acceptance.',
 unverified:['Windows 10','different hardware and real audio playback','new independent standard user','clean system without WebView2','browser SmartScreen reputation'],assets,
},null,2)+'\n');
assets.push({file:'WINDOWS_EXIT_FIX_VALIDATION.json',sha256:sha(path.join(folder,'WINDOWS_EXIT_FIX_VALIDATION.json'))});
fs.writeFileSync(path.join(folder,'SHA256SUMS.txt'),assets.map(a=>a.sha256+'  '+a.file).join('\n')+'\n');
