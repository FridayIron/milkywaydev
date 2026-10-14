---
name: gitlab-local-07-backup
description: >-
  GitLab 备份与运维底线：gitlab-backup、备份 gitlab.rb/secrets、cron、升级注意。
  在本地 GitLab 部署第 7 步、gitlab-local-07、配置定期备份时使用。
---

# GitLab 本地部署 · 07 备份与运维

## 前置

- 04 已安装；`BACKUP_PATH`、`CONFIG_BACKUP_PATH`（默认 `$DATA_ROOT/gitlab/config-backup`）已知。

## 步骤（服务器）

### 1) 手动全量备份

```bash
gitlab-backup create
mkdir -p "$CONFIG_BACKUP_PATH"
cp -a /etc/gitlab/gitlab.rb /etc/gitlab/gitlab-secrets.json "$CONFIG_BACKUP_PATH/"
ls -lh "$BACKUP_PATH"
ls -lh "$CONFIG_BACKUP_PATH"
```

完整恢复需要：**backup 包 + gitlab.rb + gitlab-secrets.json**。

### 2) 每日 cron

```bash
crontab -e
# 添加：
# 30 2 * * * /opt/gitlab/bin/gitlab-backup create CRON=1 >> /var/log/gitlab-backup.log 2>&1
```

提醒：备份宜再拷到另一台机器/IT 备份系统；定期 `df -h` 看 `$BACKUP_PATH`。

### 3) 升级注意（写入交付说明即可，不必当场升级）

- 先备份再升；按官方 Upgrade Path，禁止跨多版本硬跳。
- `apt update && apt install gitlab-ce` 后检查 `gitlab-ctl status`。

### 4) 恢复（仅当用户明确要求时执行）

按当前版本官方 Restore 文档：同主版本 → 恢复 rb/secrets → reconfigure → `gitlab-backup restore BACKUP=时间戳`。执行前二次确认。

## 完成门槛

- [ ] 至少一次 `gitlab-backup create` 成功且文件可见
- [ ] `gitlab.rb` 与 `gitlab-secrets.json` 已复制到配置备份目录
- [ ] cron（或用户认可的等价调度）已配置
- [ ] 已提醒异地/另一介质副本

## 下一步

→ 回到 `gitlab-local-00-orchestrate` 做全流程验收清单；系列结束。
