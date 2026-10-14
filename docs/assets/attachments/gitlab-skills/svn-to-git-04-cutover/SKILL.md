---
name: svn-to-git-04-cutover
description: >-
  SVN→Git 切换：冻结写、只读保留、通知同事、补推末次变更与回滚说明。
  在 SVN 迁 Git 第 4 步、svn-to-git-04、截止切换、SVN 只读时使用。
---

# SVN → GitLab · 04 切换（Cutover）

## 前置

- 至少试迁仓 03 验收通过；批量仓已 push 或已排期。
- 策略 **C1**：不做长期双写。
- 变量：项目清单、`SVN_URL` 列表、GitLab 路径列表。

## 步骤

### 1) 切换前末次同步（每个仓）

若 SVN 在迁后仍有提交：

```bat
cd /d "%WORK_ROOT%\%LOCAL_DIR%"
git svn fetch
git checkout main
git svn rebase
git push origin --all
git push origin --tags
```

确认无人再向 SVN 写入后再做 §2。

### 2) SVN 只读

与 SVN 管理员约定生效时刻，任选其一并记录：

- 路径级 authz 改为只读  
- 收回写账号 / 只留只读账号  
- 停用写服务（仍保留只读或备份）

**建议只读保留 ≥ 6 个月**后再谈归档下线。

### 3) 通知同事（模板）

```text
主题：【仓库切换】<项目名> 自 <日期时间> 起改用 GitLab

1. 新地址：http://192.168.1.173/<GROUP>/<PROJECT>
2. 克隆：先开 git_http_tunnel.bat，再
   git clone http://127.0.0.1:18173/<GROUP>/<PROJECT>.git
3. 认证：用户名 oauth2，密码用 Personal Access Token
4. 默认分支：main；请推 feature/* 再提 MR
5. SVN 自该时刻起只读，勿再提交
```

附：《2.GitLab部署操作命令手册》§7。

### 4) 文档与周边

- [ ] 设计/发布文档中的 SVN URL 改为 GitLab  
- [ ] 构建机/脚本 checkout 地址已改  
- [ ] Issue/看板说明已更新  

### 5) 回滚说明（仅紧急）

若 Git 侧不可用且必须临时写回：

1. 恢复 SVN 写权限（仅紧急窗口）  
2. 修复 GitLab/网络后再次 `git svn fetch` + push，或从 Git 导出补丁回 SVN（需人工评审）  
3. **禁止**长期双向提交

本 Skill **不自动**改 SVN 服务端权限；只产出清单与提醒，由有权限的人执行。

## 完成门槛

- [ ] 末次同步已做或确认无新 SVN 提交
- [ ] SVN 只读已执行或有明确延期日期与责任人
- [ ] 同事通知已发出（或草稿已交用户发送）
- [ ] 文档/脚本 URL 已改或已列待改项

## 下一步

迁移批次结束。后续大文件清理、CI、HTTPS 另开任务。  
若还有未迁清单项 → 回到 `svn-to-git-01-inventory`。
