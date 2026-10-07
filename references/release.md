# 发布步骤

仓库根目录本身就是可安装的Skill，包含SKILL.md、scripts、references和agents。首次发布的代码以MIT许可开源，研究语料、视频、模型权重、浏览器资料和私人配置不在许可包内。

发布前：

```bash
npm test
python3 scripts/release_check.py
git status --short
```

确认审计通过并提交代码。仅将源码仓库上传到自己的GitHub公共仓库；不要上传运行工作台整个目录。压缩包从已提交的Git树制作：

```bash
python3 scripts/package_release.py --output /仓库外/douyin-account-research-v0.1.1.zip
python3 scripts/package_release.py --layout skill --output /仓库外/douyin-account-research-v0.1.1-skill.zip
```

它会拒绝未提交的变更、私人文件、模型/媒体，以及仓库内输出路径。命令输出ZIP的SHA-256，校验解压后的README、Skill及引用链接存在。新机器或临时目录再运行一次配置流程及合成测试；已有账号的旧测试只作兼容背景。

source 包含一个 douyin-account-research 外层文件夹，适合解压保留源码；skill 布局把 SKILL.md 放在 ZIP 根层，供宿主技能导入。两种包都包含完整源码，不包括运行资料。不能仅凭根层结构说导入已成功，必须在目标宿主中观察导入/识别结果。

GitHub新仓库可用上传文件界面上传ZIP内的源码，或设置remote后`git push -u origin main`。若仓库已有提交，不覆盖历史或强制推送；先检查并使用普通分支/PR流程。CI只跑合成测试，不上传或访问账号资料。

模型和依赖版本升级需要检查上游许可、安装和缓存兼容，并对授权的测试账号与专用表格另外运行集成测试。不要仅因CI为绿就宣称所有账号兼容。
