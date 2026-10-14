# 项目清单模板

每个要迁的 SVN 项目一行。填完后发给 Agent，再执行 01。

| 序号 | 显示名 | SVN_URL（到项目根） | LAYOUT | TARGET_GROUP | TARGET_PROJECT | 试迁优先 | 备注 |
|---|---|---|---|---|---|---|---|
| 1 | | svn://… 或 http(s)://… | L1 或 L2 | 如 is20pro/PC | 小写 path，如 pc_client | 是/否 | |
| 2 | | | | 如 is20pro/MX | 如 mcu_main | | |

说明：

- 先建产品 Group 与子组 **`PC` / `MC` / `MX`**，再迁仓。
- `TARGET_GROUP`：完整路径 = `<产品>/<PC|MC|MX>`（例 `is20pro/MC`）。
- `TARGET_PROJECT`：仓 path，英文小写+下划线。
- 同一大 SVN 仓下多个子目录：拆成多行；一编译单元一仓。
- 试迁：选体积中等、布局标准（优先 L1）的一行标「是」。
