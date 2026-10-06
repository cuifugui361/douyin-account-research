import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateConfig} from './configuration.mjs';
import {ROOT,SCRIPT_DIR,config,env,atomic,read,bb,evaluate,delay,ensureBrowser,accountKey,openReady,emit} from './runtime.mjs';
const args=process.argv.slice(2),url=args.find(x=>x.startsWith('https://')),resumeFlag=args.indexOf('--resume'),analysisFlag=args.indexOf('--analysis');
if(!url||!/^https:\/\/(?:v\.|www\.)?douyin\.com\//.test(url))throw Error('invalid_profile_url');
const analysis=analysisFlag>=0?args[analysisFlag+1]:'agent';if(!['coze','agent'].includes(analysis))throw Error('invalid_analysis_mode');
validateConfig(config,{requireFeishu:true,analysis});
const preflight=spawnSync(config.runtime.python,[path.join(SCRIPT_DIR,'preflight.py'),'--analysis',analysis],{env,cwd:ROOT,stdio:'inherit'});if(preflight.status!==0)throw Error('preflight_failed');
fs.mkdirSync(path.join(ROOT,'tmp'),{recursive:true});
const lockFile=path.join(ROOT,'tmp/account-pipeline.lock');
if(fs.existsSync(lockFile)){const lock=read(lockFile,{});let alive=false;try{process.kill(lock.pid,0);alive=true;}catch(e){if(e.code!=='ESRCH')throw e;}if(alive)throw Error('workspace_task_already_running');fs.unlinkSync(lockFile);}
const lockFd=fs.openSync(lockFile,'wx',0o600);fs.writeFileSync(lockFd,JSON.stringify({pid:process.pid,started_at:new Date().toISOString()}));fs.closeSync(lockFd);
process.on('exit',()=>{try{if(read(lockFile,{}).pid===process.pid)fs.unlinkSync(lockFile);}catch{}});
await ensureBrowser();fs.mkdirSync(path.join(ROOT,config.storage.runs),{recursive:true});
let tab=process.env.RESEARCH_TAB||bb(['tab','new',url]).tabId,resolved='';
for(let i=0;i<90;i++){await delay(500);const r=evaluate(tab,'({profile:location.origin+location.pathname,title:document.title})');if(r.profile.includes('/user/')){resolved=r.profile;break;}}
if(!resolved)throw Error('profile_resolution_failed');
const account=accountKey(resolved),runs=path.join(ROOT,config.storage.runs,account),stamp=new Date().toISOString().replace(/[:.]/g,'-');
let dir=resumeFlag>=0?path.resolve(args[resumeFlag+1]):path.join(runs,stamp);
if(resumeFlag<0&&!args.includes('--new')&&fs.existsSync(runs)){for(const name of fs.readdirSync(runs).sort().reverse()){const candidate=path.join(runs,name),m=read(path.join(candidate,'任务状态.json'),null);if(m&&['interrupted','partial'].includes(m.status)){dir=candidate;break;}}}
if(!dir.startsWith(path.join(ROOT,config.storage.runs)+path.sep))throw Error('resume_outside_task_storage');
const old=read(path.join(dir,'任务状态.json'),null);if(old&&old.account_id!==account)throw Error('resume_account_mismatch');
if(old&&old.input_url!==url&&old.resolved_profile===resolved){const checkpoint=read(path.join(dir,'采集进度.json'),null);if(checkpoint)atomic(path.join(dir,'采集进度.json'),{...checkpoint,input_url:url});}
fs.mkdirSync(dir,{recursive:true});const task={schema_version:2,account_id:account,input_url:url,resolved_profile:resolved,run_dir:dir,started_at:old?.started_at||new Date().toISOString(),complete:false,data_complete:false,analysis_status:'pending',stages:old?.stages||{},status:'running'};
const taskEnv={...env,RESEARCH_RUN_DIR:dir,RESEARCH_TAB:tab};
function save(){atomic(path.join(dir,'任务状态.json'),task);atomic(path.join(ROOT,'实施/最近运行.json'),task);}
function step(stage,executable,script,more=[]){task.stage=stage;task.stages[stage]={status:'running',started_at:new Date().toISOString()};save();emit(stage,{status:'running',run_dir:dir});const t=Date.now(),r=spawnSync(executable,[path.join(SCRIPT_DIR,script),...more],{env:taskEnv,cwd:ROOT,stdio:'inherit'});task.stages[stage]={...task.stages[stage],elapsed_seconds:(Date.now()-t)/1000,status:r.status===0?'complete':r.status===75?'interrupted':'failed'};save();return r.status===0;}
try{
 if(!step('采集主页',config.runtime.node,'collect_profile_v2.mjs',[url,tab]))throw Error(read(path.join(dir,'采集进度.json'),{}).reason||'collection_failed');
 if(!step('口播转写',config.runtime.python,'transcribe_v2.py'))throw Error('transcription_incomplete');
 if(!step('整理数据',config.runtime.python,'export_v2.py'))throw Error('data_validation_failed');
 const data=read(path.join(dir,'完整调研.json'));task.nickname=data.nickname;task.coverage=data.coverage;save();
 const feishu=await openReady(config.feishu.url,`window.bitableStore?.modelOperator?.getTableById(${JSON.stringify(config.feishu.table)})`);
 if(!step('飞书写入预检',config.runtime.node,'write_feishu_v2.mjs',[feishu,'--dry-run']))throw Error('feishu_preflight_failed');
 let verified=false;
 for(let attempt=0;attempt<3;attempt++){if(!step('回填飞书',config.runtime.node,'write_feishu_v2.mjs',[feishu]))throw Error('feishu_write_failed');if(step('飞书云端核验',config.runtime.node,'verify_feishu_v2.mjs',[feishu])){verified=true;break;}emit('回填重试',{attempt:attempt+1});}
 if(!verified)throw Error('cloud_verification_failed');task.data_complete=true;task.verified=read(path.join(dir,'飞书核验.json'));task.result_url=config.feishu.url;save();
 if(!step('分析证据',config.runtime.python,'analysis_evidence.py'))throw Error('analysis_evidence_failed');
 if(analysis==='coze'){
  try{const coze=await openReady(config.coze.url,`document.querySelector('[data-testid="bot.ide.chat_area.chat_input.textarea"]')`);if(!step('账号分析',config.runtime.node,'analyze_coze_v2.mjs',[coze]))throw Error('analysis_failed');task.analysis_status='draft';}
  catch(e){task.analysis_status='failed';task.reason=e.message;task.status='partial';save();emit('数据已保存，分析待重试',{run_dir:dir});process.exitCode=1;}
 }else task.analysis_status='agent_pending';
 if(task.analysis_status==='draft'){task.complete=false;task.status='data_ready_with_review_required';task.stage='数据完成，分析待审阅';task.data_completed_at=new Date().toISOString();save();emit(task.stage,{...task});}
 else if(analysis==='agent'){task.status='data_ready';save();emit('数据完成，等待Agent分析',{run_dir:dir});}
}catch(e){task.status='interrupted';task.reason=e.message;task.complete=false;save();emit('任务停止',{reason:e.message,run_dir:dir,data_complete:task.data_complete});process.exitCode=1;}
