// Read-only, host-independent first-use inspection. No installation, download or account writes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {defaultConfigPath,validateConfig} from './configuration.mjs';
export const ROOT=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
function which(bin){try{return fs.realpathSync(execFileSync('which',[bin],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim());}catch{return null;}}
function moduleReady(python){try{execFileSync(python,['-c','import mlx_whisper,numpy,huggingface_hub'],{stdio:'ignore',timeout:30000});return true;}catch{return false;}}
export function stageFor({platform,arch,missing,bound}){
  if(platform!=='darwin'||arch!=='arm64')return 'unsupported_platform';
  if(missing.length)return 'dependencies_required';
  return bound?'ready_for_browser_checks':'feishu_binding_required';
}
export function inspect(overrides={}){
  const configPath=path.resolve(overrides.config||defaultConfigPath());
  let c=null,configError=null;
  if(fs.existsSync(configPath))try{c=validateConfig(JSON.parse(fs.readFileSync(configPath,'utf8')),{codeRoot:ROOT});}catch{configError='invalid_configuration';}
  const localBB=path.join(ROOT,'node_modules/bb-browser/dist/cli.js'),localPy=path.join(ROOT,'.venv/bin/python');
  const bb=overrides.bb||c?.runtime.bb||(fs.existsSync(localBB)?localBB:which('bb-browser'));
  const python=overrides.python||c?.runtime.python||(fs.existsSync(localPy)?localPy:which('python3.11')||which('python3'));
  const ffmpeg=overrides.ffmpeg||c?.runtime.ffmpeg||which('ffmpeg');
  const model=overrides.model||c?.runtime.model||path.join(os.homedir(),'.local/share/douyin-account-research/models/whisper-large-v3-turbo');
  const missing=[];
  if(Number(process.versions.node.split('.')[0])<20)missing.push('Node_20_or_newer');
  if(!bb||!fs.existsSync(bb))missing.push('bb_browser');
  if(!python)missing.push('python');else if(!moduleReady(python))missing.push('python_asr_modules');
  if(!ffmpeg||!fs.existsSync(ffmpeg))missing.push('ffmpeg');
  if(!fs.existsSync(path.join(model,'config.json'))||!['weights.npz','weights.safetensors'].some(x=>fs.existsSync(path.join(model,x))))missing.push('offline_model');
  if(configError)missing.push(configError);
  let bound=false;if(c)try{validateConfig(c,{codeRoot:ROOT,requireFeishu:true});bound=true;}catch{}
  const stage=stageFor({platform:process.platform,arch:process.arch,missing,bound});
  return {stage,skill_root:ROOT,config_path:configPath,config_exists:!!c,runtime:{node:process.execPath,bb,python,ffmpeg,model},missing,feishu_bound:bound,
    reference:path.join(ROOT,'references/first-use.md'),
    installation_performed:false,
    account_actions_performed:false,
    next:stage==='unsupported_platform'?'This release requires Apple Silicon Mac; do not install MLX on Windows or Intel Mac.':stage==='dependencies_required'?'Read first-use.md and reuse existing tools or prepare isolated dependencies under the user installation request.':bound?'Run preflight with the configured Python, then check bb-browser and the authorized table.':'Generate personal configuration; open and bind the user-owned Feishu view. User login and CAPTCHA remain interactive.'};
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),overrides={};
  if(args.includes('--help')){console.log('node /absolute/skill/scripts/first_use.mjs [--config PATH] [--bb PATH] [--python PATH] [--ffmpeg PATH] [--model PATH]\nRead-only: prints missing capabilities and next stage.');process.exit(0);}
  for(let i=0;i<args.length;i+=2){const k=args[i]?.replace(/^--/,'');if(!['config','bb','python','ffmpeg','model'].includes(k)||!args[i+1])throw Error('invalid_argument');overrides[k]=path.resolve(args[i+1]);}
  const result=inspect(overrides);console.log(JSON.stringify(result,null,2));
  if(result.stage==='unsupported_platform')process.exitCode=1;
}
