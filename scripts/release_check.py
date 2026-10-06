"""Audit publishable files; no account access. Also used by CI and packaging."""
import ast,json,re,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EXCLUDED={'.git','node_modules','.venv','__pycache__','dist'}
REQUIRED=['SKILL.md','agents/openai.yaml','README.md','LICENSE','.gitignore','package.json','package-lock.json','requirements.txt','.github/workflows/check.yml']
PATTERNS=[r'/'+'Users/'+r'[^/\s]+/',r'(?:https://)?www\.douyin\.com/user/MS4',r'\bfld[A-Za-z0-9]{7,}\b',r'\btbl[A-Za-z0-9]{7,}\b',r'\bsk-[A-Za-z0-9_-]{20,}\b',r'Bearer\s+[A-Za-z0-9._-]{25,}',r'(?:msToken|X-Amz-Signature|X-Bogus)=[A-Za-z0-9%._-]{12,}']
def files():
 for p in ROOT.rglob('*'):
  if p.is_file() and not any(x in EXCLUDED for x in p.relative_to(ROOT).parts):yield p

def check():
 errors=[]
 for name in REQUIRED:
  if not (ROOT/name).is_file():errors.append('missing:'+name)
 skill=(ROOT/'SKILL.md').read_text();head=re.match(r'^---\n(.*?)\n---',skill,re.S)
 if not head or not re.search(r'^name: douyin-account-research$',head[1],re.M) or not re.search(r'^description: .+',head[1],re.M):errors.append('invalid_skill_frontmatter')
 for p in files():
  rel=p.relative_to(ROOT).as_posix()
  if p.name in {'config.json','config.local.json','daemon.json','cookies.json','media-input.json','transcript.json','任务状态.json'} or p.name=='.env' or p.name.startswith('.env.') or any(x in {'runs','cache','models','任务','数据','实施','tmp'} for x in p.relative_to(ROOT).parts) or p.suffix in {'.mp4','.mp3','.wav','.npz','.safetensors','.log'}:errors.append('private_or_runtime_file:'+rel)
  try:text=p.read_text(encoding='utf-8')
  except UnicodeError:errors.append('unexpected_binary:'+rel);continue
  if any(re.search(pattern,text) for pattern in PATTERNS):errors.append('private_value:'+rel)
  if p.suffix=='.py':
   try:ast.parse(text)
   except SyntaxError:errors.append('python_syntax:'+rel)
  if p.suffix=='.mjs':
   try:
    result=subprocess.run(['node','--check',str(p)],capture_output=True,timeout=15)
    if result.returncode:errors.append('node_syntax:'+rel)
   except FileNotFoundError:errors.append('node_required_for_release_check')
  if p.suffix=='.md':
   for target in re.findall(r'\]\(([^)]+)\)',text):
    if target.startswith(('http:','https:','#','mailto:')):continue
    target=target.split('#')[0]
    if target and not (p.parent/target).exists():errors.append('broken_doc_link:'+rel+':'+target)
 if (ROOT/'package-lock.json').exists():
  lock=json.loads((ROOT/'package-lock.json').read_text());p=json.loads((ROOT/'package.json').read_text())
  if lock.get('packages',{}).get('',{}).get('dependencies')!=p['dependencies']:errors.append('lockfile_root_mismatch')
  if lock.get('packages',{}).get('node_modules/bb-browser',{}).get('version')!='0.11.5':errors.append('untested_browser_version')
 return sorted(set(errors))
if __name__=='__main__':
 errors=check();print(json.dumps({'publishable':not errors,'files_checked':sum(1 for _ in files()),'errors':errors},ensure_ascii=False));sys.exit(bool(errors))
