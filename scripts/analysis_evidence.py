"""Build reproducible facts and validate structured model citations."""
import json,sys,os,hashlib
from pathlib import Path
def validate(proposal,evidence):
 errors=[];stats=evidence['stats'];by_id={v['video_id']:v for v in evidence['videos']}
 if not isinstance(proposal,dict):return {'passed':False,'errors':['proposal_must_be_object'],'semantic_review_required':True}
 if not proposal.get('statistics'):errors.append('statistics_required')
 if any(v.get('transcript') for v in by_id.values()) and (not proposal.get('quotes') or not proposal.get('observations')):errors.append('transcript_evidence_required')
 for key in ['statistics','quotes','observations']:
  if not isinstance(proposal.get(key,[]),list) or not all(isinstance(x,dict) for x in proposal.get(key,[])):return {'passed':False,'errors':['invalid_evidence_array:'+key],'semantic_review_required':True}
 for item in proposal.get('statistics',[]):
  if not isinstance(item.get('path'),str):errors.append('statistic_path_required');continue
  value=stats
  try:
   for part in item['path'].split('.'):value=value[part]
   if isinstance(value,(dict,list)) or value!=item.get('value'):errors.append('statistic_mismatch:'+item['path'])
  except (KeyError,TypeError):errors.append('unknown_statistic:'+item.get('path',''))
 for item in proposal.get('quotes',[]):
  v=by_id.get(item.get('video_id'));text=item.get('text','')
  if not isinstance(text,str) or not v or not text or text not in v.get('transcript',''):errors.append('quote_mismatch:'+item.get('video_id',''))
 for item in proposal.get('observations',[]):
  if not isinstance(item.get('video_ids'),list) or not item.get('video_ids') or any(not isinstance(i,str) or i not in by_id for i in item['video_ids']):errors.append('observation_source_missing')
  if item.get('status') not in {'observation','hypothesis'}:errors.append('observation_status_invalid')
 return {'passed':not errors,'errors':errors,'scope':'structured_numbers_and_verbatim_quotes_only','semantic_review_required':True}
def main():
 run=Path(os.environ['RESEARCH_RUN_DIR']);full=json.loads((run/'完整调研.json').read_text());stats=json.loads((run/'统计.json').read_text());evidence={**full,'stats':stats}
 (run/'分析证据.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
 if len(sys.argv)>1:
  result=validate(json.loads(Path(sys.argv[1]).read_text()),evidence);result['source_sha256']=hashlib.sha256((run/'完整调研.json').read_bytes()).hexdigest();(run/'分析引用核验.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result));return 0 if result['passed'] else 1
 pct=f"{stats['top10_like_share']*100:.2f}%" if stats['top10_like_share'] is not None else '不可计算（已知点赞总数为0）'
 lines=[f"# {full['nickname']}：采集与分析证据",f"采集时间：{full['collected_at']}（UTC）。",f"主页：{full['profile_url']}",f"本次记录 {stats['count']} 条作品，{stats['transcribed']} 份视频口播。",f"已知作品点赞合计 {stats['total_likes']}；缺失点赞字段 {stats['missing_likes']} 条；点赞中位数 {stats['median_likes']}；前10条点赞占比 {pct}。",f"最近{stats['recent20']['count']}条点赞中位数 {stats['recent20']['median_likes']}，最高 {stats['recent20']['max_likes']}。",'', '## 数据限制','口播为自动转写待校对；图文和文章没有视频口播；本版未作图文OCR或文章正文提取。页面终止判定与数量核对的依据记录在作品JSON中。无播放量、留存、受众与成交数据，不推断这些指标；不同发布时间的累计互动不能直接证明内容质量或流量趋势。','','## 高互动与近期样本']
 by_id={v['video_id']:v for v in full['videos']};selected=stats['top10'][:3]+stats['recent20']['videos'][:3];seen=set()
 for v in selected:
  if v['video_id'] in seen:continue
  seen.add(v['video_id']);source=by_id[v['video_id']];lines += [f"### {v['caption']}",v['url'],f"点赞 {v['likes']}；评论 {v['comments']}；收藏 {v['collects']}；分享 {v['shares']}。",'开头原文（自动截取，待校对）：',source.get('hook') or '无视频口播','']
 lines+=['## 后续分析','数字由代码计算；模型负责基于作品的结构观察和待验证建议。模型草稿与复核版单独保存；引用核验只检验结构化数字和原文，不代表语义或健康、产品断言已验证。']
 (run/'采集核验报告.md').write_text('\n'.join(lines));print(json.dumps({'stage':'分析证据已生成','samples':len(seen)}));return 0
if __name__=='__main__':sys.exit(main())
