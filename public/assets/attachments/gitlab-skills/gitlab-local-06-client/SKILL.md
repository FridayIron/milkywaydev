---
name: gitlab-local-06-client
description: >-
  开发机接入本地 GitLab：Git 配置、SSH Key、clone/push、嵌入式 .gitignore 约定。
  在本地 GitLab 部署第 6 步、gitlab-local-06、同事接入仓库时使用。
---

# GitLab 本地部署 · 06 开发机接入

## 前置

- 05 完成；至少有一个可写 Project。
- 变量：`GITLAB_HOST`、`DEFAULT_GROUP`、`DEV_GIT_USER_NAME`、`DEV_GIT_USER_EMAIL`。

## 步骤（开发机本地）

### 1) Git 身份

```bash
git config --global user.name "$DEV_GIT_USER_NAME"
git config --global user.email "$DEV_GIT_USER_EMAIL"
```

Windows 无 Git 时先安装 Git for Windows。

### 2) SSH Key

```bash
ssh-keygen -t ed25519 -C "$DEV_GIT_USER_EMAIL"
# 打印公钥并添加到 GitLab → Preferences → SSH Keys
cat ~/.ssh/id_ed25519.pub
```

验证：

```bash
ssh -T git@$GITLAB_HOST
```

### 3) 冒烟：clone / 推空提交或测试分支

```bash
git clone git@$GITLAB_HOST:$DEFAULT_GROUP/<project>.git
cd <project>
git checkout -b feature/gitlab-smoke
# 小改动或空 README 后
git add .
git commit -m "chore: smoke test push"
git push -u origin feature/gitlab-smoke
```

### 4) 嵌入式仓约定（告知用户）

| 纳入 | 不纳入 |
|---|---|
| 源码、构建脚本、小配置 | `build/`、`*.o`/`*.elf`、巨大 SDK |
| `.gitignore` | 密钥、客户机密；大 hex/bin 用 LFS 或制品区 |

示例 `.gitignore` 片段见项目 `1.gitlab本地配置指南.md`。

## 完成门槛

- [ ] SSH Key 已登记
- [ ] `ssh -T git@$GITLAB_HOST` 成功
- [ ] 至少一次 `git push` 成功

## 下一步

→ `gitlab-local-07-backup`
