import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {defaults,emptySample} from '../src/lib/domain.js';
import {chromium} from './playwright.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];
try{
 const context=await browser.newContext();
 await context.addInitScript(({settings,sample})=>{
  globalThis.isTauri=true;let serial=0,quitCalls=0,resolveQuit;const callbacks=new Map();
  globalThis.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener(){}};
  globalThis.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},
   transformCallback(fn){callbacks.set(++serial,fn);return serial;},async invoke(cmd,args){
    if(cmd==='plugin:event|listen')return args.handler;
    if(cmd==='bootstrap')return {settings,sample,history:[],logs:[],platform:'windows',startup:{supported:false}};
    if(cmd==='sample_snapshot')return sample;if(cmd==='settings_snapshot')return settings;
    if(cmd==='quit_app'){quitCalls++;if(quitCalls===1)throw Error('Synthetic exit request failed');return new Promise(resolve=>resolveQuit=resolve);}
    throw Error(cmd);
   }};
  globalThis.quitCount=()=>quitCalls;globalThis.completeQuit=()=>resolveQuit?.();
 },{settings:{...defaults,tray_enabled:false},sample:emptySample()});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:1420/',{waitUntil:'networkidle'});
 const quit=page.getByRole('button',{name:'退出软件',exact:true});
 await quit.click();await page.getByRole('alert').filter({hasText:'Synthetic exit request failed'}).waitFor();
 assert.equal(await quit.isEnabled(),true,'Failed request can be retried');
 await quit.click();const pending=page.getByRole('button',{name:'正在退出…',exact:true});
 await pending.waitFor();assert.equal(await pending.isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.quitCount()),2,'Only one request per click');
 await page.getByRole('button',{name:'音乐律动'}).click();
 assert.equal(await pending.isVisible(),true,'Quit available on every main tab with tray off');
 await page.evaluate(()=>window.completeQuit());
 const preview=await browser.newPage();await preview.goto('http://127.0.0.1:1420/',{waitUntil:'networkidle'});
 assert.equal(await preview.locator('[data-quit-app]').count(),0,'Browser preview cannot request native exit');
 assert.deepEqual(errors,[]);
 const result={passed:true,checks:['Main-window quit stays accessible with tray off','Exit failure permits retry','Pending exit ignores repeated clicks','Browser preview hides native Quit'],errors};
 await writeFile('test-results/exit-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
