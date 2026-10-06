import csv,json,re,statistics,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def atomic(path,data):
 tmp=path.with_name(path.name+'.pending');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2));tmp.replace(path)
def summarize(rows):
 vals=[v['likes'] for v in rows if isinstance(v.get('likes'),(int,float))];total=sum(vals)
 top=sorted(rows,key=lambda v:v.get('likes') or 0,reverse=True)[:10];recent=sorted(rows,key=lambda v:v.get('published_at') or '',reverse=True)[:20]
 rv=[v['likes'] for v in recent if isinstance(v.get('likes'),(int,float))]
 return {'count':len(rows),'transcribed':sum(bool(v.get('transcript')) for v in rows),'total_likes':total,'missing_likes':len(rows)-len(vals),'median_likes':statistics.median(vals) if vals else None,'top10_like_share':sum(v.get('likes') or 0 for v in top)/total if total else None,'top10':top,'recent20':{'count':len(recent),'median_likes':statistics.median(rv) if rv else None,'max_likes':max(rv) if rv else None,'videos':recent}}
def main():
 run=Path(os.environ['RESEARCH_RUN_DIR']);cp=Path(os.environ.get('RESEARCH_CONFIG',Path.home()/'.config/douyin-account-research/config.json'));cfg=json.loads(cp.read_text());cache=Path(cfg.get('workspace_root',cp.parent))/cfg['storage']['cache'];data=json.loads((run/'作品.json').read_text());videos=[]
 for v in data['videos']:
  p=cache/v['video_id']/'transcript.json';t={}
  if p.exists():
   try:t=json.loads(p.read_text())
   except ValueError:pass
  text=t.get('text','').strip() if v['content_type']=='video' else ''
  hook=re.split('[。！？!?]',text)[0][:80]
  status='自动转写待校对' if text else '图文作品：未作OCR，无视频口播' if v['content_type']=='image_note' else '文章作品：仅采集发布文案与互动，未提取正文，无视频口播' if v['content_type']=='article' else '未完成或不支持'
  videos.append({**v,'transcript':text,'hook':hook,'transcription_status':status,'asr_review_needed':any(s.get('avg_logprob',0)<-.8 or s.get('compression_ratio',0)>2.4 or s.get('no_speech_prob',0)>.6 for s in t.get('segments',[]))})
 full={**data,'videos':videos};atomic(run/'完整调研.json',full);stats={**summarize(videos),'collected_at':data['collected_at']};atomic(run/'统计.json',stats)
 columns=[('作品ID','video_id'),('作者','nickname'),('标题（发布文案）','caption'),('发布时间（UTC）','published_at'),('点赞','likes'),('评论','comments'),('收藏','collects'),('分享','shares'),('时长（秒）','duration_seconds'),('作品链接','url'),('作品类型','content_type'),('口播逐字稿','transcript'),('开头（自动截取）','hook'),('转写状态','transcription_status')]
 with (run/'完整调研.csv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.writer(f);w.writerow([k for k,v in columns]);w.writerows([[v.get(key) for _,key in columns] for v in videos])
 missing=[v['video_id'] for v in videos if v['content_type']=='video' and not v['transcript']];unsupported=[v['video_id'] for v in videos if v['content_type']=='unsupported'];duplicate_ids=len({v['video_id'] for v in videos})!=len(videos);duplicate_urls=len({v['url'] for v in videos})!=len(videos);atomic(run/'数据核验.json',{'missing_transcripts':missing,'unsupported':unsupported,'duplicate_ids':duplicate_ids,'duplicate_urls':duplicate_urls,'passed':not missing and not unsupported and not duplicate_ids and not duplicate_urls})
 print(json.dumps({'stage':'整理数据','count':len(videos),'transcribed':stats['transcribed'],'image_notes':sum(v['content_type']=='image_note' for v in videos),'missing_transcripts':len(missing),'unsupported':len(unsupported)},ensure_ascii=False))
 if missing or unsupported or duplicate_ids or duplicate_urls:raise SystemExit(1)
if __name__=='__main__':main()
