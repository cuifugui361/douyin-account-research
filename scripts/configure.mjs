import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {defaultConfigPath,validateConfig,FIELD_ROLES} from './configuration.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
if(args.includes('--help')){console.log('node scripts/configure.mjs --workspace /path/outside/skill --model /path/to/model [--bb /path/to/cli.js] [--python /path/to/python] [--ffmpeg /path/to/ffmpeg] [--config /path/to/config.json]');process.exit(0);}
const get=k=>{const i=args.indexOf('--'+k);if(i>=0&&!args[i+1])throw Error('missing_argument:'+k);return i>=0?args[i+1]:null;};
function which(name){try{return fs.realpathSync(execFileSync('which',[name],{encoding:'utf8'}).trim());}catch{return null;}}
const configPath=path.resolve(get('config')||defaultConfigPath()),old=fs.existsSync(configPath)?JSON.parse(fs.readFileSync(configPath,'utf8')):null;
const localBB=path.join(root,'node_modules/bb-browser/dist/cli.js'),localPython=path.join(root,'.venv/bin/python');
const bb=get('bb')||old?.runtime?.bb||(fs.existsSync(localBB)?localBB:which('bb-browser'));
const python=get('python')||old?.runtime?.python||(fs.existsSync(localPython)?localPython:which('python3'));
const ffmpeg=get('ffmpeg')||old?.runtime?.ffmpeg||which('ffmpeg');
const model=get('model')||old?.runtime?.model;
if(!bb||!python||!ffmpeg||!model)throw Error('runtime_not_found: install dependencies, then pass missing --bb/--python/--ffmpeg/--model');
const c=validateConfig({schema_version:1,workspace_root:get('workspace')||old?.workspace_root||path.join(os.homedir(),'.local/share/douyin-account-research'),runtime:{node:process.execPath,bb:fs.realpathSync(bb),python:path.resolve(python),ffmpeg:path.resolve(ffmpeg),model:path.resolve(model)},browser:old?.browser||{home:path.join(os.homedir(),'.bb-browser'),cdp_port:19825,daemon_port:19826},storage:old?.storage||{runs:'runs',cache:'cache/transcripts'},feishu:old?.feishu||{url:'',base:'',table:'',view:'',completed_option:'',fields:Object.fromEntries(FIELD_ROLES.map(k=>[k,'']))},coze:old?.coze||{url:''}},{codeRoot:root});
if(configPath.startsWith(root+path.sep))throw Error('config_must_be_outside_skill');
fs.mkdirSync(path.dirname(configPath),{recursive:true});fs.mkdirSync(c.workspace_root,{recursive:true});fs.writeFileSync(configPath,JSON.stringify(c,null,2)+'\n',{mode:0o600});fs.chmodSync(configPath,0o600);
console.log(JSON.stringify({configured:true,config_path:configPath,workspace:c.workspace_root,feishu_bound:!!c.feishu.table,next:'Create your research table, then run bind_feishu.mjs; configure does not install or download anything.'}));
