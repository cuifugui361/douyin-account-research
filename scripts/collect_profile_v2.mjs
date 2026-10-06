import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT,config,env,runDir,fileFor,bb,evaluate,delay,atomic,read,emit,accountKey} from './runtime.mjs';
const url=process.argv[2];
if(!url||!/^https:\/\/(?:v\.|www\.)?douyin\.com\//.test(url))throw Error('invalid_profile_url');
const tab=process.argv[3]||process.env.RESEARCH_TAB||bb(['tab','new',url]).tabId;
const checkpoint=runDir?path.join(runDir,'采集进度.json'):path.join(ROOT,'tmp/采集进度.json');
const previous=read(checkpoint,null),resume=previous?.input_url===url&&previous.status!=='complete';
const all=new Map(resume?previous.videos.map(v=>[v.video_id,v]):[]),media=new Map();
if(resume)for(const v of read(fileFor('media-input.json'),[]))media.set(v.id,v);
let observed=resume?previous.observed_total:0,profile=resume?previous.resolved_profile:'',nickname='',ended=false,stable=0,completed=false;
const started=new Date().toISOString(),stopAfter=Number(process.env.RESEARCH_STOP_COLLECT_AFTER||0);
function save(status,reason=null){atomic(checkpoint,{input_url:url,resolved_profile:profile,observed_total:observed,collected_at:started,status,reason,videos:[...all.values()]});atomic(fileFor('media-input.json'),[...media.values()],true);}
try{
 evaluate(tab,`(()=>{const sc=document.querySelector('.route-scroll-container');if(sc)sc.scrollTop=0;window.scrollTo(0,0);return true;})()`);
 for(let iteration=0;iteration<250;iteration++){
  await delay(1200);
  const r=evaluate(tab,`(()=>{const list=[];let last;const scope=document.querySelector('[data-e2e="user-post-list"]');if(!scope)return{count:0,total:null,ended:false,profile:location.origin+location.pathname,captcha:/验证码/.test(document.title)||[...document.querySelectorAll('iframe[src*="captcha"],iframe[src*="verifycenter"]')].some(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;}),login:/登录后查看/.test(document.body.innerText),structure_missing:true};for(const a of scope.querySelectorAll('a[href*="/video/"],a[href*="/note/"],a[href*="/article/"]')){let f=a[Object.keys(a).find(k=>k.startsWith('__reactFiber'))];for(let n=0;f&&n<10;n++,f=f.return){const v=f.memoizedProps?.awemeInfo;if(v){const play=v.video?.playAddr||[];const urls=(Array.isArray(play)?play:[]).slice(0,2).map(x=>typeof x==='string'?x:x.src).filter(Boolean);const duration=v.video?.duration;list.push({video_id:String(v.awemeId),url:'https://www.douyin.com/'+(a.href.includes('/article/')?'article/':a.href.includes('/note/')?'note/':'video/')+v.awemeId,nickname:v.authorInfo?.nickname||'',published_at:v.createTime?new Date(v.createTime*1000).toISOString():null,caption:v.desc||'',duration_seconds:Number.isFinite(duration)?duration/1000:null,likes:v.stats?.diggCount??null,comments:v.stats?.commentCount??null,collects:v.stats?.collectCount??null,shares:v.stats?.shareCount??null,content_type:(a.href.includes('/article/')||v.awemeType===163)?'article':(a.href.includes('/note/')||v.awemeType===68)?'image_note':urls.length?'video':'unsupported',media_urls:urls});last=a;break;}}}const text=document.body.innerText;const m=text.match(/作品\\s*([\\d,]+)\\s*推荐/);const isCaptcha=/验证码/.test(document.title)||[...document.querySelectorAll('iframe[src*="captcha"],iframe[src*="verifycenter"]')].some(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';})||!!document.querySelector('#captcha_container')&&getComputedStyle(document.querySelector('#captcha_container')).display!=='none';window.__researchProfileVideos=list;if(!isCaptcha){last?.scrollIntoView({block:'end'});const sc=document.querySelector('.route-scroll-container');if(sc)sc.scrollTop=sc.scrollHeight;}return{count:list.length,total:m?Number(m[1].replaceAll(',','')):null,ended:text.includes('暂时没有更多了'),profile:location.origin+location.pathname,captcha:isCaptcha,login:!list.length&&/登录后查看/.test(text)};})()`);
  if(r.captcha)throw Error('captcha_required');if(r.login)throw Error('login_required');if(r.structure_missing)throw Error('profile_list_not_found');
  if(profile&&r.profile.includes('/user/')&&accountKey(profile)!==accountKey(r.profile))throw Error('profile_identity_changed');
  if(r.profile.includes('/user/'))profile=r.profile;
  const old=all.size;
  for(let start=0;start<r.count;start+=10){const chunk=JSON.parse(evaluate(tab,`JSON.stringify(window.__researchProfileVideos.slice(${start},${start+10}))`));for(const v of chunk){if(!/^\d+$/.test(v.video_id))throw Error('invalid_video_id');media.set(v.video_id,{id:v.video_id,urls:v.media_urls,duration:(v.duration_seconds||0)*1000,content_type:v.content_type});delete v.media_urls;all.set(v.video_id,v);nickname=v.nickname||nickname;}}
  stable=all.size===old?stable+1:0;if(r.total!==null)observed=r.total;ended=r.ended;
  save('collecting');emit('采集主页',{iteration,collected:all.size,observed,ended,resumed:!!resume});
  if(stopAfter&&iteration+1>=stopAfter)throw Error('test_interruption');
  if(ended&&(!observed||all.size>=observed)){completed=true;break;}
  if(stable>12)throw Error('pagination_stalled');
  execFileSync(config.runtime.node,[config.runtime.bb,'screenshot',path.join(ROOT,'tmp/collector-frame.png'),'--tab',tab],{stdio:'ignore',env,timeout:45000});
 }
 if(!completed)throw Error('coverage_incomplete');
 save('complete');const videos=[...all.values()];atomic(fileFor('作品.json'),{schema_version:2,profile_url:url,resolved_profile:profile,account_id:accountKey(profile),nickname:nickname||videos[0]?.nickname||'',observed_total:observed,collected_at:new Date().toISOString(),coverage:{unique_works:videos.length,terminal_observed:true,completion_source:'page_end_text_and_visible_count',image_notes:videos.filter(v=>v.content_type==='image_note').length,articles:videos.filter(v=>v.content_type==='article').length,unsupported:videos.filter(v=>v.content_type==='unsupported').length},videos});emit('采集完成',{count:videos.length,tab});
}catch(e){save('interrupted',e.message);emit('采集停止',{reason:e.message,saved:all.size,checkpoint});process.exitCode=e.message==='test_interruption'?75:1;}
