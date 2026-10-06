import {config,CONFIG_PATH,evaluate,atomic,emit} from './runtime.mjs';
import {bindSchema} from './feishu_schema.mjs';
import {validateConfig} from './configuration.mjs';
const args=process.argv.slice(2),tab=args.find(x=>!x.startsWith('--'));
if(!tab||args.includes('--help')){console.log('node scripts/bind_feishu.mjs TAB [--completed-name 已完成] [--write]\nReads the active table schema only. --write saves your private config; it never changes the table.');process.exit(args.includes('--help')?0:1);}
const nameAt=args.indexOf('--completed-name'),completedName=nameAt>=0?args[nameAt+1]:'已完成';
const target=evaluate(tab,`(()=>{const u=new URL(location.href);if(u.protocol!=='https:'||!/(^|\\.)(feishu\\.cn|larksuite\\.com)$/.test(u.hostname))throw Error('invalid_feishu_host');const s=window.bitableStore,tableId=u.searchParams.get('table'),viewId=u.searchParams.get('view');if(!s||!tableId||!viewId)throw Error('open_table_view_with_table_and_view_query');const t=s.modelOperator.getTableById(tableId);if(!t)throw Error('table_not_loaded');return{url:location.href,base:s.token,table:tableId,view:viewId,fields:Object.fromEntries(Object.entries(t.getFields()).map(([id,f])=>[id,{id:f.id||id,name:f.name,type:f.type,options:f.type===3?Object.values(f.options||f.property?.options||[]).map(o=>({id:o.id,name:o.name||o.text})):[]}]))};})()`);
const normalized=Object.fromEntries(Object.entries(target.fields).map(([id,f])=>[id,{...f,id:f.id||id}]));const binding=bindSchema(normalized,{completedName,overrides:config.feishu?.fields&&Object.values(config.feishu.fields).some(Boolean)?config.feishu.fields:{}});
const next=validateConfig({...config,feishu:{url:target.url,base:target.base,table:target.table,view:target.view,...binding}},{requireFeishu:true});
if(args.includes('--write'))atomic(CONFIG_PATH,next,true);
emit('飞书字段绑定',{saved:args.includes('--write'),fields:Object.keys(binding.fields).length,config_path:CONFIG_PATH,target_table:target.table});
