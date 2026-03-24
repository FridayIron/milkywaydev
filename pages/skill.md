---
# 技能星图配置 - 根据简历技能维度
skillTitle: 嵌入式技能雷达图
skillName: 我的技能
indicator:
  - { name: 'C/C++', max: 10 }
  - { name: 'RTOS(ThreadX/UCOS)', max: 10 }
  - { name: 'MCU外设/通信', max: 10 }
  - { name: '电机控制/算法', max: 10 }
  - { name: 'PCB/硬件', max: 10 }
  - { name: 'IVD/项目经验', max: 10 }
# 对应上面 6 个维度的分数，1-10 分
skillValue: [9, 9, 9, 8, 7, 9]
# 想加新技能？在 indicator 加一行，在 skillValue 加一个数字
---

# 技能星图

用雷达图直观展示各项技能掌握程度（1-10 分）。

<SkillChart />

## 个人项目与工具

我还做了一些网页小工具、Python 界面工具等实体项目，详见 [个人项目与工具](/pages/skill-tools)。

## 如何修改

1. 打开本文件 `pages/skill.md`
2. 修改 `indicator` 增加/删除技能维度
3. 修改 `skillValue` 对应每个维度的分数
4. 保存后刷新页面即可
