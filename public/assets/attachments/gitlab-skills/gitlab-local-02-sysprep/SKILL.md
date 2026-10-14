---
name: gitlab-local-02-sysprep
description: >-
  为 GitLab CE 准备 Ubuntu 系统：依赖包、时区、ufw/端口、清理 80 占用。
  在本地 GitLab 部署第 2 步、gitlab-local-02、换服务器系统准备时使用。
---

# GitLab 本地部署 · 02 系统准备

## 前置

- `gitlab-local-01-probe` 已通过；`GITLAB_HOST`、`SSH_USER`、`TIMEZONE`（默认 `Asia/Shanghai`）已知。

## 步骤（均在服务器上）

### 1) 基础包

指导用户时：**一条命令回车一次**，避免 `<<EOF` heredoc（易卡在 `>`）。

```bash
echo "postfix postfix/main_mailer_type select Internet Site" | debconf-set-selections
echo "postfix postfix/mailname string $GITLAB_HOST" | debconf-set-selections
apt update
DEBIAN_FRONTEND=noninteractive apt install -y curl openssh-server ca-certificates tzdata postfix
```

`apt upgrade` 仅在用户同意的维护窗口执行。

### 2) 时区

```bash
timedatectl set-timezone "$TIMEZONE"
timedatectl | grep Time
```

### 3) 防火墙

```bash
ufw status
```

若 `active`：

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw reload
```

未启用 ufw 时：提醒确认公司防火墙已放行 `$GITLAB_HOST:22/80`。

### 4) 释放 80（若占用）

```bash
ss -lntp | grep -E ':80|:8080' || true
```

有冲突服务时与用户确认后 stop/disable，或改端口。Omnibus 默认需要 80。

## 完成门槛

- [ ] curl / ca-certificates / openssh / tzdata 已装
- [ ] 时区为约定值
- [ ] 22/80 策略已处理（ufw 或 IT）
- [ ] 80 无冲突占用（或已有明确方案）

## 下一步

→ `gitlab-local-03-datadisk`
