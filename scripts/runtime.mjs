import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';
import {loadConfig} from './configuration.mjs';
export const CODE_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const SCRIPT_DIR=path.dirname(fileURLToPath(import.meta.url));
const loaded=loadConfig(CODE_ROOT);
export const CONFIG_PATH=loaded.configPath;
export const config=loaded.config;
export const ROOT=path.resolve(config.workspace_root||path.dirname(CONFIG_PATH));
export const env={...process.env,RESEARCH_CONFIG:CONFIG_PATH,BB_BROWSER_HOME:config.browser.home||path.join(os.homedir(),'.bb-browser')};
export const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function atomic(file,data,privateFile=false){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.pending';fs.writeFileSync(tmp,typeof data==='string'?data:JSON.stringify(data,null,2),{mode:privateFile?0o600:0o644});if(privateFile)fs.chmodSync(tmp,0o600);fs.renameSync(tmp,file);}
export function read(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(fallback!==undefined&&e.code==='ENOENT')return fallback;throw e;}}
export const runDir=process.env.RESEARCH_RUN_DIR||null;
export function fileFor(name){if(!runDir)throw Error('task_run_dir_required: set RESEARCH_RUN_DIR');return path.join(runDir,name);}
export function bb(args){let raw;try{raw=execFileSync(config.runtime.node,[config.runtime.bb,...args,'--json'],{env,maxBuffer:4*1024*1024,timeout:45000}).toString();}catch(e){try{const r=JSON.parse(e.stdout?.toString()||'{}');throw Error(String(r.error||'browser_command_failed').slice(0,350));}catch(parsed){if(parsed instanceof SyntaxError)throw Error('browser_command_failed');throw parsed;}}let result;try{result=JSON.parse(raw);}catch{throw Error('browser_response_invalid_or_truncated');}if(result.success===false)throw Error(String(result.error||'browser_failed').slice(0,350));return result.data??result;}
export function evaluate(tab,script){return bb(['eval',script,'--tab',tab]).result;}
export async function ensureBrowser(){if(bb(['daemon','status']).running)return;const daemon=path.join(path.dirname(fs.realpathSync(config.runtime.bb)),'daemon.js');if(!fs.existsSync(daemon))throw Error('bb_daemon_not_found: configure the installed dist/cli.js');const log=fs.openSync(path.join(ROOT,'tmp/browser-start.log'),'a',0o600);const p=spawn(config.runtime.node,[daemon,'--port',String(config.browser.daemon_port),'--cdp-port',String(config.browser.cdp_port)],{env,detached:true,stdio:['ignore',log,log]});p.unref();fs.closeSync(log);for(let i=0;i<30;i++){await delay(500);if(bb(['daemon','status']).running)return;}throw Error('browser_connection_unavailable');}
export function accountKey(profile){return crypto.createHash('sha256').update(new URL(profile).pathname.replace(/\/$/,'')).digest('hex').slice(0,16);}
export async function openReady(url,predicate){const tab=bb(['tab','new',url]).tabId;for(let i=0;i<90;i++){await delay(500);const s=evaluate(tab,`({title:document.title,url:location.origin+location.pathname,ready:!!(${predicate})})`);if(/验证码/.test(s.title))throw Error('captcha_required');if(s.ready)return tab;}throw Error('page_or_login_not_ready');}
export function emit(stage,data={}){console.log(JSON.stringify({...data,stage}));}
export async function waitFeishuLoaded(tab){const f=config.feishu;for(let i=0;i<120;i++){const r=evaluate(tab,`(()=>{const s=window.bitableStore;if(!s)return{ready:false};if(s.token!==${JSON.stringify(f.base)})throw Error('wrong_target_base');const t=s.modelOperator.getTableById(${JSON.stringify(f.table)});if(!t)return{ready:false};return{ready:t.tableLoaded&&t.isAllRecordMetaLoaded()&&t.checkFullLoaded()&&t.getLoadedRecordCount()===t.getAllRecordCount()&&!s.isActiveTableLoading,loaded:t.getLoadedRecordCount(),total:t.getAllRecordCount()};})()`);if(r.ready)return r;if(i%10===0)emit('等待飞书完整加载',r);await delay(500);}throw Error('feishu_records_not_fully_loaded');}
