"""Offline ASR with validated cache, atomic results and resumable failures."""
import argparse,json,os,subprocess,time,urllib.request,sys
from importlib.metadata import version
from cache_policy import model_fingerprint,valid_cache as cache_is_valid
from pathlib import Path
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1')
import numpy as np
import mlx_whisper
ROOT=Path(__file__).resolve().parents[1]
CONFIG_PATH=Path(os.environ.get('RESEARCH_CONFIG',Path.home()/'.config/douyin-account-research/config.json'))
cfg=json.loads(CONFIG_PATH.read_text());ROOT=Path(cfg.get('workspace_root',CONFIG_PATH.parent))
RUN=Path(os.environ['RESEARCH_RUN_DIR']);CACHE=ROOT/cfg['storage']['cache']
MODEL_ID=model_fingerprint(cfg['runtime']['model'])
ENGINE_VERSION=version('mlx-whisper')
def atomic(p,data):
 p.parent.mkdir(parents=True,exist_ok=True);tmp=p.with_name(p.name+'.pending');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)));tmp.replace(p)
def valid_cache(p,vid):return cache_is_valid(p,vid,MODEL_ID,ENGINE_VERSION)
def main():
 items=json.loads((RUN/'media-input.json').read_text());done=0;failed=0;skipped=0;cached=0
 stop=int(os.environ.get('RESEARCH_STOP_ASR_AFTER','0'))
 for item in items:
  vid=item['id']
  if not vid.isdigit():raise ValueError('invalid_video_id')
  if item.get('content_type')!='video':skipped+=1;continue
  d=CACHE/vid;d.mkdir(parents=True,exist_ok=True);result=d/'transcript.json'
  if valid_cache(result,vid):cached+=1;continue
  try:
   media=d/'video.mp4'
   if not media.exists():
    for url in item['urls']:
     try:
      req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://www.douyin.com/'})
      with urllib.request.urlopen(req,timeout=90) as r,open(d/'video.tmp','wb') as f:
       while b:=r.read(1024*1024):f.write(b)
      if (d/'video.tmp').stat().st_size<1024:raise RuntimeError('empty_media')
      (d/'video.tmp').replace(media);break
     except Exception:continue
   if not media.exists():raise RuntimeError('media_download_failed')
   raw=subprocess.run([cfg['runtime']['ffmpeg'],'-hide_banner','-loglevel','error','-nostdin','-i',str(media),'-vn','-ac','1','-ar','16000','-f','f32le','pipe:1'],capture_output=True,check=True,timeout=300).stdout
   audio=np.frombuffer(raw,dtype=np.float32).copy()
   if len(audio)==0:raise RuntimeError('empty_audio')
   start=time.monotonic();r=mlx_whisper.transcribe(audio,path_or_hf_repo=cfg['runtime']['model'],language='zh',verbose=False,temperature=0.0,condition_on_previous_text=False)
   if not r.get('text','').strip():raise RuntimeError('empty_transcript')
   o={'video_id':vid,'engine':'mlx_whisper','engine_version':ENGINE_VERSION,'model':'large-v3-turbo','model_revision':Path(cfg['runtime']['model']).name,'model_fingerprint':MODEL_ID,'audio_seconds':len(audio)/16000,'status':'自动转写待校对','elapsed_seconds':round(time.monotonic()-start,2),'text':r['text'].strip(),'segments':r.get('segments',[])}
   atomic(result,o);(d/'逐字稿.txt').write_text(o['text']);(d/'error.json').unlink(missing_ok=True);done+=1
   print(json.dumps({'stage':'口播转写','id':vid,'new_completed':done,'cached':cached,'characters':len(o['text']),'seconds':o['audio_seconds']}),flush=True)
   atomic(RUN/'转写进度.json',{'completed_new':done,'cached':cached,'failed':failed,'skipped':skipped,'last_video_id':vid})
   if stop and done>=stop:
    print(json.dumps({'stage':'转写测试中断','saved':done}),flush=True);return 75
  except Exception as e:
   failed+=1;atomic(d/'error.json',{'video_id':vid,'error_type':type(e).__name__,'reason':str(e).split('https:')[0][:150]});print(json.dumps({'stage':'转写失败','id':vid,'error_type':type(e).__name__}),flush=True)
 summary={'completed_new':done,'cached':cached,'failed':failed,'skipped':skipped};atomic(RUN/'转写进度.json',summary);print(json.dumps({'stage':'转写完成',**summary}),flush=True);return 1 if failed else 0
if __name__=='__main__':sys.exit(main())
