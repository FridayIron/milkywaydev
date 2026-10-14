---
name: gitlab-local-01-probe
description: >-
  探测内网 GitLab 目标机连通性与硬件盘形态（SSH/CPU/内存/lsblk），写出 DISK_CASE。
  在本地 GitLab 部署第 1 步、换服务器摸底、gitlab-local-01 时使用。
---

# GitLab 本地部署 · 01 连通与摸底

## 前置

- 会话已确认：`GITLAB_HOST`、`SSH_USER`（见 `gitlab-local-00-orchestrate` / env-template）。
- 用户能提供 SSH 登录方式（密钥或交互密码）；**不要把密码写入文件**。

## 步骤

### 1) 开发机网络

```bash
ping -n 4 $GITLAB_HOST
# Linux/macOS: ping -c 4 $GITLAB_HOST
```

SSH：

```bash
ssh $SSH_USER@$GITLAB_HOST
```

失败则停：查路由/防火墙 22，联系 IT。不进入 02。

### 2) 服务器清单（远程执行）

```bash
hostnamectl
free -h
nproc
df -h
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL
timedatectl
ss -lntp | grep -E ':80|:8080' || true
```

### 3) 判定 DISK_CASE

| 值 | 条件 | 后续 |
|---|---|---|
| A | 根分区或系统盘已是数 TB，无需另盘 | 03 跳过挂载，数据可用默认路径 |
| B | 存在未挂载大盘（如 `sdb` 无 MOUNTPOINT） | 03 需分区格式化挂载（确认设备名） |
| C | 大盘已挂到某路径 | 03 只设 `DATA_ROOT`/`GIT_DATA_PATH` |

把结论写回会话变量：`DISK_CASE`、`DATA_DISK`（若 B）、`DATA_ROOT`（若 C 填实际挂载点）。

### 4) 规格快速核对（参考）

- CPU ≥ 4（推荐 8）、内存 ≥ 8G（推荐 16G）
- 磁盘：仓库+备份建议独立大空间
- OS：Ubuntu 22.04（本系列 Skills 默认）

不达标则警告用户，由用户决定是否继续。

## 完成门槛

- [ ] ping / SSH 成功
- [ ] 已记录：CPU、内存、`df`/`lsblk` 摘要
- [ ] 已设定 `DISK_CASE`（及 B/C 相关路径变量）
- [ ] 已记录 80/8080 是否占用

## 下一步

→ `gitlab-local-02-sysprep`
