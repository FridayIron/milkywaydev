# SVN → GitLab · 环境变量模板

复制到对话开头填写；**不要**把密码写进本文件后提交公开仓。

```text
# === GitLab（本环境默认）===
GITLAB_HOST=192.168.1.173
EXTERNAL_URL=http://192.168.1.173
GIT_HTTP_TUNNEL=http://127.0.0.1:18173
DEFAULT_BRANCH=main

# === 迁移策略（已拍板，改口再改）===
MIGRATE_TOOL=git-svn
HISTORY_MODE=H1
AUTHOR_MODE=A1
CUTOVER_MODE=C1
# 方案1：产品 Group + 子组 PC/MC/MX（先建组再迁仓）
PRODUCT_GROUP=is20pro
# 子组固定名（勿改）：PC=上位机 MC=中位机 MX=下位机
LAYER_PC=PC
LAYER_MC=MC
LAYER_MX=MX

# === 本机路径 ===
WORK_ROOT=E:/svn_git_migrate
AUTHORS_FILE=E:/svn_git_migrate/authors.txt

# === 当前处理的单个项目（01–03 使用）===
SVN_URL=
LAYOUT=L1
# L1=标准 trunk/branches/tags（git svn -s）
# L2=无 trunk（不加 -s）
# TARGET_GROUP 必须含产品+层，例：is20pro/PC
TARGET_GROUP=
TARGET_PROJECT=
# 本地目录名建议与 TARGET_PROJECT 相同
LOCAL_DIR=
DISPLAY_NAME=
```

## 安全

- SVN 账号/密码、GitLab PAT：只放本机凭证管理或会话环境变量，不入库。
- 推送认证：用户名 `oauth2`，密码为 PAT（`read_repository` + `write_repository`）。
