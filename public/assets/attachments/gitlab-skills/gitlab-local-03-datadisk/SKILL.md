---
name: gitlab-local-03-datadisk
description: >-
  按 DISK_CASE 处理 GitLab 数据盘：挂载大盘、建目录、规划 git_data_dirs/backup_path。
  在本地 GitLab 部署第 3 步、4T 盘落盘、gitlab-local-03 时使用。
---

# GitLab 本地部署 · 03 数据盘

## 前置

- 01 已给出 `DISK_CASE`；变量：`DATA_DISK`、`DATA_ROOT`、`GIT_DATA_PATH`、`BACKUP_PATH`。
- 默认：`DATA_ROOT=/data`，`GIT_DATA_PATH=/data/gitlab/git-data`，`BACKUP_PATH=/data/gitlab/backups`。

## 按 DISK_CASE 分支

### A — 系统盘已够大

- 不格式化、不强制改路径；**禁止**对本环境执行 mkfs/`/data` 挂载。
- 记录：`GIT_DATA_PATH=/var/opt/gitlab/git-data`，`BACKUP_PATH=/var/opt/gitlab/backups`，`CONFIG_BACKUP_PATH=/root/gitlab-config-backup`。
- 核对：`df -h /`、`lsblk`；可选 `mkdir -p /root/gitlab-config-backup`。
- **当前目标机（192.168.1.173）实测**：`/dev/sda3` 4.0T 挂 `/`，可用约 3.8T，无 sdb → 固定为 A，完成后进 04。
- 直接标记本 Skill 完成 → 04。

### B — 独立盘未挂载（破坏性，须确认）

1. 与用户二次确认设备名等于 `DATA_DISK`（例 `/dev/sdb`）。
2. 仅在确认后执行：

```bash
DISK="$DATA_DISK"
parted -s "$DISK" mklabel gpt
parted -s "$DISK" mkpart primary ext4 0% 100%
mkfs.ext4 -L gitlab_data "${DISK}1"
mkdir -p "$DATA_ROOT"
mount "${DISK}1" "$DATA_ROOT"
UUID=$(blkid -s UUID -o value "${DISK}1")
grep -q "$UUID" /etc/fstab || \
  echo "UUID=${UUID}  ${DATA_ROOT}  ext4  defaults,nofail  0  2" >> /etc/fstab
df -h "$DATA_ROOT"
```

3. 建目录：

```bash
mkdir -p "$GIT_DATA_PATH" "$BACKUP_PATH" "${DATA_ROOT}/gitlab/config-backup"
```

### C — 大盘已挂载

- 确认 `DATA_ROOT` 可写；创建同上子目录。无需 `mkfs`。

## 给 04 的配置片段（先记下，安装后写入 gitlab.rb）

```ruby
external_url 'http://GITLAB_HOST'

git_data_dirs({
  "default" => { "path" => "GIT_DATA_PATH" }
})

gitlab_rails['backup_path'] = "BACKUP_PATH"
```

将 `GITLAB_HOST` / 路径替换为会话变量真实值。`DISK_CASE=A` 且用默认路径时可省略 `git_data_dirs`。

## 完成门槛

- [ ] `DISK_CASE` 处理完毕
- [ ] B/C：`GIT_DATA_PATH`、`BACKUP_PATH` 目录存在且可写
- [ ] B：fstab 已加 UUID 挂载并 `df` 验证
- [ ] 已准备好将写入 `gitlab.rb` 的路径值

## 下一步

→ `gitlab-local-04-install`
