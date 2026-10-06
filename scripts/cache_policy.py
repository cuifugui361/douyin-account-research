"""Content-addressed offline ASR cache policy; no MLX imports."""
import hashlib,json
from pathlib import Path
def model_fingerprint(model):
 h=hashlib.sha256()
 weight='weights.safetensors' if (Path(model)/'weights.safetensors').is_file() else 'weights.npz'
 for name in ['config.json',weight]:
  with (Path(model)/name).open('rb') as f:
   while chunk:=f.read(1024*1024):h.update(chunk)
 return h.hexdigest()
def valid_cache(path,video_id,fingerprint,engine_version):
 try:
  d=json.loads(Path(path).read_text());return d.get('model_fingerprint')==fingerprint and d.get('engine_version')==engine_version and d.get('video_id')==video_id and d.get('engine')=='mlx_whisper' and d.get('model')=='large-v3-turbo' and bool(d.get('text','').strip()) and d.get('audio_seconds',0)>0
 except (OSError,ValueError,TypeError,AttributeError):return False
