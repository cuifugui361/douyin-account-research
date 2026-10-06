export const FIELD_SCHEMA={
 url:{name:'作品链接',type:1,aliases:['视频链接']},status:{name:'处理状态',type:3,aliases:['状态']},collected_at:{name:'采集时间',type:5,aliases:[]},nickname:{name:'作者',type:1,aliases:['作者昵称','昵称','博主昵称']},caption:{name:'发布文案',type:1,aliases:['标题','视频标题','标题（发布文案）','作品标题（发布文案）']},published_at:{name:'发布时间',type:1,aliases:['发布时间（UTC）']},likes:{name:'点赞',type:2,aliases:['点赞数']},comments:{name:'评论',type:2,aliases:['评论数']},collects:{name:'收藏',type:2,aliases:['收藏数']},shares:{name:'分享',type:2,aliases:['分享数','转发','转发数']},transcript:{name:'口播逐字稿',type:1,aliases:['短视频文案','口播文案','逐字稿']},review:{name:'转写状态',type:1,aliases:['待校对说明','复核说明','转写说明']},duration_seconds:{name:'时长（秒）',type:2,aliases:['时长(秒)','视频时长','作品时长（秒）']},hook:{name:'开头',type:1,aliases:['开头（自动截取）','开头钩子']},raw:{name:'原始记录',type:1,aliases:['原始数据','原始返回']}
};
export function bindSchema(fields,{completedName='已完成',overrides={}}={}){
 const values=Object.values(fields),mapping={};
 for(const [role,spec] of Object.entries(FIELD_SCHEMA)){
  const choices=overrides[role]?values.filter(f=>f.id===overrides[role]):values.filter(f=>[spec.name,...spec.aliases].includes(f.name));
  if(choices.length!==1)throw Error('field_missing_or_ambiguous:'+role);
  if(choices[0].type!==spec.type)throw Error('field_schema_mismatch:'+role);
  mapping[role]=choices[0].id;
 }
 if(new Set(Object.values(mapping)).size!==Object.keys(mapping).length)throw Error('duplicate_field_mapping');
 const status=values.find(f=>f.id===mapping.status),options=Object.values(status.options||status.property?.options||[]),done=options.filter(o=>o.name===completedName||o.text===completedName);
 if(done.length!==1)throw Error('completed_option_missing_or_ambiguous');
 return {fields:mapping,completed_option:done[0].id};
}
