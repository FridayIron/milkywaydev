# 博客

> 技术笔记与生活随笔

## 文章列表

### 软件版本管理

- [内网 GitLab CE 部署与配置指南（精要）](/pages/blog/2026-10-14-内网GitLab-CE部署与配置指南)
- [GitLab 本地部署操作命令手册（按步执行）](/pages/blog/2026-10-14-GitLab本地部署操作命令手册)
- [SVN → GitLab 迁移方案（保留历史）](/pages/blog/2026-10-14-SVN到GitLab迁移方案)
- [Git 日常开发与团队培训手册](/pages/blog/2026-10-14-Git日常开发与培训手册)

### 嵌入式驱动

- [嵌入式驱动面试手册（目录）](/pages/blog/2026-10-20-嵌入式驱动面试手册)
- [CAN：标识符、拓扑、帧与位时序](/pages/blog/2026-10-20-CAN总线)
- [I2C：开漏、时序与卡死恢复](/pages/blog/2026-10-20-I2C总线)
- [SPI：四种模式与片选](/pages/blog/2026-10-20-SPI总线)
- [UART：帧格式、波特率与 RS485](/pages/blog/2026-10-20-UART串口)
- [网络：UDP、TCP 握手与 LwIP](/pages/blog/2026-10-20-嵌入式网络TCP与UDP)
- [定时器：时钟倍频与输入捕获](/pages/blog/2026-10-20-定时器)
- [PWM：占空比、互补与死区](/pages/blog/2026-10-20-PWM)
- [内存、启动与链接](/pages/blog/2026-10-20-内存启动与链接)
- [DMA](/pages/blog/2026-10-20-DMA)
- [Cache 与 DMA 一致性](/pages/blog/2026-10-20-Cache与DMA一致性)
- [中断与抢占](/pages/blog/2026-10-20-中断与抢占)
- [手册前提与深水区](/pages/blog/2026-10-21-手册前提与深水区)
- [中断优先级与 FreeRTOS](/pages/blog/2026-10-21-中断优先级与FreeRTOS)
- [ADC 驱动](/pages/blog/2026-10-21-ADC驱动)
- [USB 驱动](/pages/blog/2026-10-21-USB驱动)
- [RTOS 线程与多轴](/pages/blog/2026-10-21-RTOS线程与多轴)
- [插补与速度规划](/pages/blog/2026-10-21-插补与速度规划)（[动态演示](/demos/interp-demo.html){target="_blank"}）

- [测试文章](/pages/blog/2026-03-22-测试文章)（示例，可删除）

## 如何新增博客

1. 在项目根目录执行：`npm run new:blog "我的文章标题"`
2. 编辑生成的 `pages/blog/yyyy-mm-dd-文件名.md`
3. 在本文「文章列表」中添加该文章链接
4. 同步在 `.vitepress/config.mjs` 里加链接：版本管理放进「软件版本管理」，驱动笔记放进「嵌入式驱动」
5. 运行 `npm run deploy` 后上传到腾讯云
