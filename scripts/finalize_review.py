import json,os,sys,datetime,hashlib
from pathlib import Path
RUN=Path(os.environ['RESEARCH_RUN_DIR'])
def main():
 task=json.loads((RUN/'任务状态.json').read_text());cloud=json.loads((RUN/'飞书核验.json').read_text());refs=json.loads((RUN/'分析引用核验.json').read_text());data=json.loads((RUN/'数据核验.json').read_text());report=RUN/'分析复核.md'
 full=json.loads((RUN/'完整调研.json').read_text());source_hash=hashlib.sha256((RUN/'完整调研.json').read_bytes()).hexdigest()
 if not all([cloud['passed'],refs['passed'],data['passed'],cloud.get('checked')==len(full['videos']),cloud.get('account_id')==task['account_id'],refs.get('source_sha256')==source_hash,report.exists() and report.stat().st_size>100]):print(json.dumps({'complete':False,'reason':'review_or_verification_incomplete'}));return 1
 task.update(complete=True,data_complete=True,analysis_status='reviewed',status='complete',verified=cloud,completed_at=datetime.datetime.now(datetime.timezone.utc).isoformat())
 (RUN/'任务状态.json').write_text(json.dumps(task,ensure_ascii=False,indent=2))
 cp=Path(os.environ.get('RESEARCH_CONFIG',Path.home()/'.config/douyin-account-research/config.json'));cfg=json.loads(cp.read_text());root=Path(cfg.get('workspace_root',cp.parent));(root/'实施/最近运行.json').write_text(json.dumps(task,ensure_ascii=False,indent=2))
 print(json.dumps({'complete':True,'account_id':task['account_id'],'scope':'data_cloud_and_agent_review'}));return 0
if __name__=='__main__':sys.exit(main())
