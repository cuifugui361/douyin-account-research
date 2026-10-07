import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

export const NAME='douyin-account-research';
const HOSTS={codex:'.agents',claude:'.claude',workbuddy:'.workbuddy'};
export function install({source,home=os.homedir(),host='auto',action='link'}={}){
  if(!['link','status','unlink'].includes(action))throw Error('invalid_action');
  if(host!=='auto'&&!Object.hasOwn(HOSTS,host))throw Error('invalid_host');
  source=fs.realpathSync(source);
  const skill=fs.readFileSync(path.join(source,'SKILL.md'),'utf8');
  if(!/^name: douyin-account-research$/m.test(skill))throw Error('wrong_skill_source');
  const results=[];
  for(const [name,dir] of Object.entries(HOSTS)){
    if(host!=='auto'&&host!==name)continue;
    const parent=path.join(home,dir),target=path.join(parent,'skills',NAME);
    if(name!=='codex'&&!fs.existsSync(parent)){results.push({host:name,status:'host_not_detected',target});continue;}
    if(name==='codex'){
      const legacy=path.join(home,'.codex','skills',NAME);
      if(fs.existsSync(legacy)){results.push({host:name,status:'legacy_entry_preserved',target:legacy,next:'Use the existing entry, or move its source outside both skill directories before creating the shared entry.'});continue;}
    }
    let stat;try{stat=fs.lstatSync(target);}catch(e){if(e.code!=='ENOENT')throw e;}
    if(stat?.isDirectory()&&fs.realpathSync(target)===source){results.push({host:name,status:action==='unlink'?'source_directory_preserved':'installed_directory',target});continue;}
    let same=false;
    if(stat?.isSymbolicLink())same=path.resolve(path.dirname(target),fs.readlinkSync(target))===source;
    if(stat&&!same){results.push({host:name,status:'conflict_preserved',target});continue;}
    if(action==='unlink'){
      if(same)fs.unlinkSync(target);
      results.push({host:name,status:same?'removed_own_link':'absent',target});continue;
    }
    if(action==='status'){results.push({host:name,status:same?'linked':'absent',target});continue;}
    if(!same){fs.mkdirSync(path.dirname(target),{recursive:true});fs.symlinkSync(source,target,'dir');}
    results.push({host:name,status:same?'already_linked':'linked',target});
  }
  return results;
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.includes('--help')){console.log('node scripts/install_macos.mjs [link|status|unlink] [--host codex|claude|workbuddy] [--home /test/home]\nLinks this source folder; preserves existing directories. Does not install dependencies.');process.exit(0);}
  if(process.platform!=='darwin'){console.error('macOS_only');process.exit(1);}
  const arg=k=>{const i=args.indexOf('--'+k);if(i<0)return undefined;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('missing_argument:'+k);return args[i+1];};
  const results=install({source:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),home:arg('home'),host:arg('host'),action:args[0]&&!args[0].startsWith('--')?args[0]:'link'});
  console.log(JSON.stringify({results,next:'Open a new session or refresh the skill list; then invoke the skill for first-use checks.'},null,2));
  if(results.some(x=>['conflict_preserved','legacy_entry_preserved'].includes(x.status)))process.exitCode=1;
}
