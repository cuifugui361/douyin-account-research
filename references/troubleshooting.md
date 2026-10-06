# 故障与恢复

错误阶段与材料在任务目录的 `任务状态.json`；执行程序输出JSON行。分享错误时只给脱敏阶段、错误代码和版本，原始浏览器命令、配置、日志及媒体索引可能包含私人目标或地址。

| 情形 | 处理 |
| --- | --- |
| configuration_required | 先运行 configure；非默认文件要给全部命令设置RESEARCH_CONFIG |
| runtime_not_found / preflight missing | 复用已有路径或按README安装独立依赖；不要改其他项目环境 |
| browser_connection_unavailable | 使用配置中安装的bb-browser检查daemon；关闭任务后重启同一工具；登录其打开的真实Chrome |
| bb_daemon_not_found | runtime.bb应指向安装包dist/cli.js或指向它的符号链接，不能写MCP启动器或原生浏览器路径 |
| captcha_required / login_required | 在原标签页自己完成验证码或登录，继续同一个任务；不得绕过或替换账号 |
| pagination_stalled / profile_list_not_found | 保留检查点；确认主页作品页正常，再检查平台DOM变化；数量不符不能称为全量 |
| transcription_incomplete | 查看每条缓存目录error.json，检查媒体失效、磁盘和FFmpeg；恢复同一任务，已通过指纹校验的转写复用 |
| field_missing_or_ambiguous / field_schema_mismatch | 核对专用表15列及类型；通过个人映射消除歧义；不要自动覆盖其他表 |
| wrong_target_base / record_index_target_mismatch | 目标与配置不符；停止写入，确认是否改过表格。换表用新工作目录，不删旧索引冒充恢复 |
| duplicate_existing_url | 停止，单独检查重复来源；常规程序不删除行 |
| indexed_record_missing / indexed_record_changed | 人工或其他任务改变过记录，需查明；不能静默覆盖其他内容 |
| save_timeout / cloud_verification_failed | 核对页面权限和网络，等同步队列结束后恢复；不能把本地显示当云端保存 |
| data_ready | 数据完成，Agent尚未分析；按分析参考继续 |
| data_ready_with_review_required | 扣子草稿生成，等待Agent复核；不是整个任务完成 |

```bash
node scripts/run_account_v2.mjs '相同账号主页链接' --resume /任务目录 --analysis agent
```

同一数据目录一次只运行一条链路。`workspace_task_already_running` 时等待原任务；不能删除活进程的锁。旧进程确实退出时程序会回收遗留锁。不要因为观察超时重新启动同一任务。

模型内容变化会使旧缓存失效，重新转写；不会把不同模型的旧稿当新稿。ASR模型目录必须含config.json，以及weights.safetensors或weights.npz。普通运行不会下载缺失模型。

批量写入不是事务。中断前已写入的行和URL—记录ID索引会保留，恢复时逐条核对。文件检查点不保证突然断电时的事务一致性；出现索引冲突先诊断，不自动清空。
