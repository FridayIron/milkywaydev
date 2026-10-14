# GitLab 本地部署 · 环境变量模板

换服务器时复制本表到对话开头，填新值即可复用后续 Skills。

```text
# === 必填 ===
GITLAB_HOST=192.168.1.173
EXTERNAL_URL=http://192.168.1.173
SSH_USER=root
OS_ID=ubuntu
OS_VERSION=22.04

# === 磁盘（01 探测后填写）===
# 2026-10-12 实测：/dev/sda3 4T 已挂载到 / → DISK_CASE=A
DISK_CASE=A
# A=系统盘已够大，用默认 /var/opt/gitlab
# B=独立盘未挂载，需格式化挂载
# C=大盘已挂载，只需指路径
DATA_DISK=
DATA_ROOT=
GIT_DATA_PATH=/var/opt/gitlab/git-data
BACKUP_PATH=/var/opt/gitlab/backups
CONFIG_BACKUP_PATH=/root/gitlab-config-backup

# === 组织约定 ===
DEFAULT_GROUP=embedded
DEFAULT_BRANCH=main
REPO_SIZE_LIMIT_MB=5120
TIMEZONE=Asia/Shanghai

# === 客户端（06 使用）===
DEV_GIT_USER_NAME=wangqiao
DEV_GIT_USER_EMAIL=yqyfb06@szdrawray.com
# 默认组/项目（本环境）
DEFAULT_GROUP=szdrawray_soft
DEFAULT_PROJECT=is20pro_mx
```

## 安全

- 不把系统 root 密码、GitLab root 密码写入本文件或仓库文档。
- SSH 密码/密钥仅在会话中使用，不落盘到 skill 目录。

## 当前环境示例（可覆盖）

| 变量 | 示例值 |
|---|---|
| GITLAB_HOST | 192.168.1.173 |
| EXTERNAL_URL | http://192.168.1.173 |
| SSH_USER | root |
| 规格参考 | 8C / 16G / ~4T，Ubuntu 22.04 |
