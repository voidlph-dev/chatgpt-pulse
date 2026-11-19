// Launch only isolated settings/log fixtures; never stop an installed user app.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const binary=path.resolve(process.env.PULSE_APP||path.join(root,'src-tauri','target','release',process.platform==='win32'?'chatgpt-pulse.exe':'chatgpt-pulse'));
assert.ok(fs.existsSync(binary),'Build candidate or set PULSE_APP');
const audio=process.platform==='win32'&&!process.argv.includes('--skip-audio');
const output=path.join(root,'test-results','native-exit');fs.mkdirSync(output,{recursive:true});
const results=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(const variant of ['exit-ui-race','off','tray-hidden','audio-on','toggle-then-quit','startup-quit','repeated-quit']){
 const folder=fs.mkdtempSync(path.join(output,variant+'-'));
 fs.mkdirSync(path.join(folder,'logs'));
 // Start the deterministic race only after both WebViews respond. A cold
 // WebView2/Defender startup is not part of the actual Quit deadline.
 const enabled=audio&&['audio-on','startup-quit','repeated-quit'].includes(variant);
 const db=new DatabaseSync(path.join(folder,'pulse.sqlite'));
 db.exec('CREATE TABLE settings(id INTEGER PRIMARY KEY,value TEXT NOT NULL)');
 db.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify({auto_monitor:true,keep_history:false,
  overlay_enabled:true,hover_hide:false,tray_enabled:variant!=='tray-hidden',music_enabled:enabled,interval_ms:500}));db.close();
 const launched=Date.now();
 const child=spawn(binary,[],{cwd:root,env:{...process.env,PULSE_OFFLINE_TEST:'1',PULSE_RENDER_PROBE:'1',
  PULSE_TEST_UI_CONTROL:'1',PULSE_DATA_DIR:folder,...(variant==='exit-ui-race'?{PULSE_TEST_EXIT_UI_RACE:'1'}:{})},stdio:'ignore'});
 let spawnError;child.on('error',e=>spawnError=e);
 const closed=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));
 const probe=name=>{try{return JSON.parse(fs.readFileSync(path.join(folder,'probe-'+name+'.json'),'utf8'));}catch{return {};}};
 async function until(test,label,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){
  if(spawnError)throw spawnError;
  assert.ok(child.exitCode===null&&child.signalCode===null,'Unexpected exit: '+label);
  if(test())return;await sleep(50);
 }throw Error('Timeout: '+label);}
 let nonce=0;
 function write(action){const file=path.join(folder,'fixture-ui-command.json');
  fs.writeFileSync(file+'.pending',JSON.stringify({nonce:++nonce,action}));fs.renameSync(file+'.pending',file);}
 async function command(action){write(action);await until(()=>probe('control').nonce===nonce,action);
  assert.equal(probe('control').error,null);}
 let result,startupMs;
 try{
  await until(()=>probe('sampler').sequence>0,'native startup');
  if(variant!=='startup-quit')await until(()=>Number.isFinite(probe('main').rendered_sequence)&&Number.isFinite(probe('overlay').rendered_sequence),'native WebViews ready');
  startupMs=Date.now()-launched;
  let captureStatus='off';
  if(enabled&&!['startup-quit','exit-ui-race'].includes(variant)){
   await until(()=>['active','silent','unavailable','unsupported','recovering'].includes(probe('audio').status),'capture starts or reports device absence');
   captureStatus=probe('audio').status;
  }
  if(variant==='off'||variant==='tray-hidden'){
   await command('close-main');await sleep(200);await command('inspect');
   assert.equal(probe('control').main_visible,false,'Window close remains background mode');
  }
  if(variant==='toggle-then-quit'&&audio){await command('audio-on');await command('audio-off');await command('audio-on');}
  const start=Date.now();
  write(variant==='exit-ui-race'?'audio-on':['off','tray-hidden'].includes(variant)?'quit-button':variant==='repeated-quit'?'quit-twice':'quit');
  let timer;
  const ending=await Promise.race([closed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Normal exit exceeded 7 seconds')),7000);})]).finally(()=>clearTimeout(timer));
  assert.equal(ending.code,0);assert.equal(ending.signal,null);
  assert.equal(probe('exit').audio_released,true,'Capture worker must release without deadline fallback');
  if(variant==='exit-ui-race')assert.equal(probe('exit-race').window_query_answered,true,'Event loop serviced pending capture query before exit');
  if(['off','tray-hidden'].includes(variant))assert.equal(probe('quit-command').window,'main','Actual WebView button invoked guarded quit command');
  result={variant,passed:true,startup_ms:startupMs,elapsed_ms:Date.now()-start,synthetic_capture:variant==='exit-ui-race',capture_requested:variant==='exit-ui-race'||enabled||audio&&variant==='toggle-then-quit',capture_status:captureStatus,
   real_loopback_observed:['active','silent'].includes(captureStatus),forced_termination:false};
 }catch(error){result={variant,passed:false,error:String(error),startup_ms:startupMs,
  probes:Object.fromEntries(['sampler','main','overlay','audio','control','exit','exit-race'].map(name=>[name,probe(name)]))};throw error;}
 finally{
  if(child.exitCode===null&&child.signalCode===null){child.kill();await closed;}
  if(result)results.push(result);
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({passed:results.every(r=>r.passed),platform:process.platform,
   version:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version,synthetic_work_logs:true,user_settings_accessed:false,checks:results},null,2));
 }
 console.log(JSON.stringify(result));
}
