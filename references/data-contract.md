# 数据与配置约定

个人配置使用独立 JSON 文件，字段示例见 config.example.json。指定绝对 workspace_root，运行材料在该目录，代码资源与材料分开。运行前检查已有工具与模型，不把示例配置当成可用授权。

任务目录由账号 ID 和运行 ID 隔离；任务状态分别记录采集、转写、数据、云端核验和分析。media-input.json 含临时媒体地址，文件私有，不发给模型或打包。全局转写缓存按作品 ID 保存，检查非空文本、引擎、模型版本和有效时长才复用。

作品JSON保存视频ID、来源URL、发布文案、发布UTC时间、互动快照、时长及类型。未知数值留 null；图文和文章不生成视频口播；图文不做OCR，文章未提取正文。覆盖判定记录页面终止证据与数量口径，不冒充原始接口 has_more。若出现 unsupported 项，输出部分结果并明确停止。

CSV与完整JSON保持原始发布文案和口播分列。统计中的 top10_like_share 是比例，不是百分数；全部零点赞时为 null，不能计算占比。缺失点赞不当0混入中位数，missing_likes 标明缺失数。

飞书映射角色包括 url、status、collected_at、nickname、caption、published_at、likes、comments、collects、shares、duration_seconds、transcript、review、hook、raw。写入前核对目标、字段类型及完整加载；索引按作品URL保存记录ID，避免半加载造成重复创建。只更新用户授权目标中的对应作品，不覆盖其他作品。

核验要求等待同步队列清空，再刷新并确认全部记录加载，逐项检查唯一作品URL、标题、作者、时间、赞评藏转、时长、口播、开头和处理状态。重试同样执行这些步骤，不以本地内存相等替代云端保存。
