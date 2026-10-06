"""Explicit model download, never called by the collection pipeline."""
import argparse,json
from pathlib import Path
from huggingface_hub import snapshot_download
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--revision',default='a4aaeec0636e6fef84abdcbe3544cb2bf7e9f6fb');a=p.parse_args()
r=Path(a.output).expanduser().resolve();snapshot_download('mlx-community/whisper-large-v3-turbo',revision=a.revision,local_dir=str(r),allow_patterns=['config.json','weights.npz','weights.safetensors'])
if not (r/'config.json').is_file() or not any((r/f).is_file() for f in ['weights.npz','weights.safetensors']):raise SystemExit('model_download_incomplete')
(r/'research-model.json').write_text(json.dumps({'repo':'mlx-community/whisper-large-v3-turbo','revision':a.revision},indent=2))
print(json.dumps({'model_path':str(r),'revision':a.revision}))
