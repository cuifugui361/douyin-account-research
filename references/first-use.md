# 三种 Agent 的首次使用

Codex、Claude Code、WorkBuddy 共用同一份 SKILL.md、脚本和引用规则。Agent 需要读写本机文件并执行本机命令；仅能对话的云会话不能运行这套链路。完整数据链路目前要求 Apple Silicon Mac。

## 安装入口

使用者可以把仓库网址或已下载的完整文件夹交给自己的 Agent：

> 请安装这个抖音账号调研 Skill，并完成首次环境检查。缺依赖时复用已有工具；需要下载时说明来源、位置和资源用量。使用我自己的抖音和飞书登录，不使用作者配置。

源文件夹保留在固定位置，不能只复制 SKILL.md，也不要在链接安装后删除或移动源文件夹。推荐源码放在 `~/.local/share/douyin-account-research/skill/`，研究资料在其父目录的 `runs/` 和 `cache/`，配置在目录外。

在源码目录运行 `node scripts/install_macos.mjs`，会给 Codex 创建公共入口，并给已有 Claude Code、WorkBuddy 主目录创建专属入口；没有对应宿主时跳过。可以加 `--host codex`、`--host claude`、`--host workbuddy` 只安装一个。不会覆盖原有真实文件夹、其他来源的链接或旧 Codex 入口。

| 宿主 | 本机入口 | 调用方式 |
| --- | --- | --- |
| Codex | `~/.agents/skills/douyin-account-research/` | `$douyin-account-research`，或明确要求使用该技能 |
| Claude Code | `~/.claude/skills/douyin-account-research/` | `/douyin-account-research`，或明确要求使用该技能 |
| WorkBuddy Desktop | `~/.workbuddy/skills/douyin-account-research/` | 在技能列表找到“抖音账号调研”，或明确要求使用该技能 |

Codex 官方支持[用户目录和链接](https://learn.chatgpt.com/docs/build-skills)，Claude Code 官方支持[个人技能目录和链接](https://code.claude.com/docs/en/skills)。WorkBuddy 路径和“技能→添加技能→上传技能”在 Mac 桌面 v5.3.14 本机检查；其嵌入 CodeBuddy CLI 默认目录不同，不能把 CodeBuddy CLI 运行等同于 WorkBuddy Desktop 测试。

`agents/openai.yaml` 仅为 Codex 的显示元数据，其他宿主读取 SKILL.md 即可。无需为每种 Agent 安装 bb-browser MCP；脚本直接调用 bb-browser CLI。原有 MCP 可继续使用，缺 MCP 不构成运行阻断。

安装后开新会话或刷新技能列表；若没出现，检查入口中的 SKILL.md 是否可读。`node scripts/install_macos.mjs status` 显示链接，`unlink` 只移除本脚本指向该源的链接；真实源目录不删除。宿主安全审查失败时保留拒绝原因，不绕过。

## 首次调用由 Agent 完成

1. 以载入的 SKILL.md 所在目录为 Skill 根目录。全部脚本、引用用绝对路径，不能把聊天的工作目录当成 Skill 目录。用本机 Node 执行 `scripts/first_use.mjs`，可加 `--python`、`--bb`、`--ffmpeg`、`--model` 指定已有环境。它只检查，不安装、不写账号。
2. 非 Darwin arm64 时停止完整采集，解释当前平台限制。缺依赖时先复用；用户已要求安装/准备环境时，说明实际下载位置和成本后执行所需步骤。只有调用调研、没有安装授权时，先说明缺失工具与补齐方案。所有依赖位于该 Skill 的 node_modules、.venv 或独立工具目录，不修改其他项目。
3. bb-browser 缺失：在 Skill 根目录运行 `npm ci --ignore-scripts`。Python 3.11 可用且缺 ASR 模块：在 Skill 根目录创建 `.venv`，用其中的 Python 安装 requirements.txt。FFmpeg、Node/Python 不可用时按 README 的上游安装方式准备；不默默改变系统工具版本。模型缺失时用 download_model.py 下载到 Skill 外，约1.5GiB；不把已有模型复制进发布目录。
4. 依赖准备后调用 configure.mjs，并显式传入检查获得的工具/模型路径。只生成使用者自己的配置；不导入作者个人文件。再读[飞书绑定说明](setup.md)，引导本人登录真实 Chrome 中的抖音、飞书并选定允许写入的表格。表格必须符合15字段约定；缺字段时列出具体差异。用户要求准备新表时可协助创建，其真实建表路径必须另行核验，不能宣称脚本会自动建表。
5. 读取 bb-browser 标签列表，选本人提供的目标视图，调用 bind_feishu.mjs 检查并保存。运行配置中 Python 的 preflight.py。浏览器连通、目标表加载与登录状态仍由实际调用检查；`first_use` 的 ready_for_browser_checks 不是整条链路已就绪。
6. 三种宿主都执行 `run_account_v2.mjs '<主页链接>' --analysis agent`，以当前宿主模型完成[分析和复核](analysis-and-recovery.md)。首次先用小账号或当前任务的真实小样本核验；完整量、空正文类型、飞书刷新比对、引文、分析完成门禁仍适用。不能以入口存在、格式通过或其他宿主的旧结果宣称当前宿主首用成功。

完成首次配置后，每次输入主页链接即可调用完整流程；验证码或登录失效需要本人操作。更换飞书目标需重新绑定。首次使用记录应分别说明“识别”“依赖”“浏览器/目标”“数据链路”“宿主分析”的实际通过范围。
