import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
export const FIELD_ROLES=['url','status','collected_at','nickname','caption','published_at','likes','comments','collects','shares','transcript','review','duration_seconds','hook','raw'];
export const defaultConfigPath=()=>process.env.RESEARCH_CONFIG||path.join(os.homedir(),'.config/douyin-account-research/config.json');
export function inside(parent,child){const rel=path.relative(parent,child);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));}
export function validateConfig(input,{codeRoot,requireFeishu=false,analysis='agent'}={}){
 const c=structuredClone(input);
 if(!c.workspace_root||!path.isAbsolute(c.workspace_root))throw Error('workspace_root_must_be_absolute');
 if(codeRoot&&inside(path.resolve(codeRoot),path.resolve(c.workspace_root)))throw Error('workspace_must_be_outside_skill');
 c.storage={runs:'runs',cache:'cache/transcripts',...c.storage};
 for(const k of ['runs','cache']){const v=c.storage[k];if(typeof v!=='string'||!v||path.isAbsolute(v)||!inside(c.workspace_root,path.resolve(c.workspace_root,v)))throw Error('storage_path_unsafe:'+k);}
 if(c.storage.runs===c.storage.cache)throw Error('storage_paths_must_differ');
 c.browser={home:path.join(os.homedir(),'.bb-browser'),daemon_port:19826,cdp_port:19825,...c.browser};
 if(!path.isAbsolute(c.browser.home))throw Error('browser_home_must_be_absolute');
 for(const k of ['daemon_port','cdp_port'])if(!Number.isInteger(c.browser[k])||c.browser[k]<1024||c.browser[k]>65535)throw Error('invalid_browser_port:'+k);
 if(!c.runtime?.bb||!path.isAbsolute(c.runtime.bb))throw Error('bb_cli_must_be_absolute');
 for(const k of ['node','python','ffmpeg','model'])if(typeof c.runtime[k]!=='string'||!c.runtime[k])throw Error('runtime_required:'+k);
 c.feishu=c.feishu||{};c.coze=c.coze||{};
 if(requireFeishu){
  let u;try{u=new URL(c.feishu.url);}catch{throw Error('feishu_url_required');}
  if(u.protocol!=='https:'||!/(^|\.)(feishu\.cn|larksuite\.com)$/.test(u.hostname)||u.username||u.password)throw Error('invalid_feishu_url');
  for(const k of ['base','table','view','completed_option'])if(!c.feishu[k])throw Error('feishu_binding_required:'+k);
  for(const k of FIELD_ROLES)if(!c.feishu.fields?.[k])throw Error('feishu_field_required:'+k);
  const ids=FIELD_ROLES.map(k=>c.feishu.fields[k]);if(new Set(ids).size!==ids.length)throw Error('duplicate_field_mapping');
 }
 if(analysis==='coze'){let u;try{u=new URL(c.coze.url);}catch{throw Error('coze_url_required');}if(u.protocol!=='https:'||u.hostname!=='www.coze.cn')throw Error('invalid_coze_url');}
 return c;
}
export function loadConfig(codeRoot){const configPath=path.resolve(defaultConfigPath());if(!fs.existsSync(configPath))throw Error('configuration_required: run node scripts/configure.mjs first');return {configPath,config:validateConfig(JSON.parse(fs.readFileSync(configPath,'utf8')),{codeRoot})};}
