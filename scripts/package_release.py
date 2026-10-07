"""Create a source-only ZIP from the committed Git tree after audit."""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
import release_check
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--layout',choices=['source','skill'],default='source');a=p.parse_args();root=Path(__file__).resolve().parents[1];out=Path(a.output).resolve()
if out==root or root in out.parents:raise SystemExit('output_must_be_outside_repository')
errors=release_check.check()
if errors:raise SystemExit('release_check_failed:'+','.join(errors))
if subprocess.check_output(['git','status','--porcelain'],cwd=root).strip():raise SystemExit('commit_changes_before_packaging')
# Only Git-tracked committed source goes into the ZIP. Never package the workspace tree.
out.parent.mkdir(parents=True,exist_ok=True);prefix=[] if a.layout=='skill' else ['--prefix=douyin-account-research/'];subprocess.run(['git','archive','--format=zip',*prefix,'-o',str(out),'HEAD'],cwd=root,check=True)
print(json.dumps({'archive':str(out),'layout':a.layout,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'bytes':out.stat().st_size,'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()}))
