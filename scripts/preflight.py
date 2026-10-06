"""Read-only local readiness checks. No browser writes, installation or download."""
import argparse,json,os,sys,shutil,subprocess,platform
from pathlib import Path
ROLES=['url','status','collected_at','nickname','caption','published_at','likes','comments','collects','shares','transcript','review','duration_seconds','hook','raw']
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--analysis',choices=['agent','coze'],default='agent');a=parser.parse_args()
 p=Path(os.environ.get('RESEARCH_CONFIG',Path.home()/'.config/douyin-account-research/config.json'))
 if not p.exists():print(json.dumps({'ready':False,'reason':'configuration_required','next':'node scripts/configure.mjs --help'}));return 1
 try:c=json.loads(p.read_text())
 except (ValueError,OSError):print(json.dumps({'ready':False,'reason':'configuration_invalid'}));return 1
 missing=[]
 for k in ['node','bb','python','ffmpeg']:
  value=c.get('runtime',{}).get(k,'')
  if not value or not (Path(value).is_file() or shutil.which(value)):missing.append(k)
 if not Path(c.get('runtime',{}).get('bb','')).is_absolute():missing.append('bb_absolute_node_cli_path')
 model=Path(c.get('runtime',{}).get('model',''))
 if not (model/'config.json').is_file() or not any((model/f).is_file() for f in ['weights.npz','weights.safetensors']):missing.append('offline_model_files')
 if sys.platform!='darwin' or platform.machine()!='arm64':missing.append('Apple_Silicon_Mac_required')
 if 'python' not in missing:
  try:
   if subprocess.run([c['runtime']['python'],'-c','import mlx_whisper,numpy'],capture_output=True,timeout=30).returncode:missing.append('mlx_whisper_modules')
  except (OSError,subprocess.TimeoutExpired):missing.append('mlx_whisper_modules')
 if 'node' not in missing:
  try:
   check="import {validateConfig} from './scripts/configuration.mjs';import fs from 'node:fs';validateConfig(JSON.parse(fs.readFileSync(process.env.RESEARCH_CONFIG,'utf8')),{codeRoot:process.cwd(),requireFeishu:true,analysis:process.env.RESEARCH_ANALYSIS});"
   result=subprocess.run([c['runtime']['node'],'--input-type=module','-e',check],cwd=Path(__file__).resolve().parents[1],env={**os.environ,'RESEARCH_CONFIG':str(p.resolve()),'RESEARCH_ANALYSIS':a.analysis},capture_output=True,timeout=30)
   if result.returncode:missing.append('configuration_or_feishu_binding')
  except (OSError,subprocess.TimeoutExpired):missing.append('node_configuration_validation')
 result={'ready':not missing,'missing':missing,'workspace':c.get('workspace_root'),'platform_scope':'Apple Silicon Mac, offline MLX, existing Chrome login','browser_and_target_permission':'checked_at_runtime'}
 print(json.dumps(result,ensure_ascii=False));return 0 if result['ready'] else 1
if __name__=='__main__':sys.exit(main())
