import{_ as s,o as n,c as p,ak as t}from"./chunks/framework.DKi5cyCJ.js";const b=JSON.parse('{"title":"GitLab 本地部署 · 环境变量模板","description":"","frontmatter":{},"headers":[],"relativePath":"public/assets/attachments/gitlab-skills/gitlab-local-00-orchestrate/env-template.md","filePath":"public/assets/attachments/gitlab-skills/gitlab-local-00-orchestrate/env-template.md"}'),l={name:"public/assets/attachments/gitlab-skills/gitlab-local-00-orchestrate/env-template.md"};function e(i,a,c,r,o,d){return n(),p("div",null,[...a[0]||(a[0]=[t(`<h1 id="gitlab-本地部署-·-环境变量模板" tabindex="-1">GitLab 本地部署 · 环境变量模板 <a class="header-anchor" href="#gitlab-本地部署-·-环境变量模板" aria-label="Permalink to &quot;GitLab 本地部署 · 环境变量模板&quot;">​</a></h1><p>换服务器时复制本表到对话开头，填新值即可复用后续 Skills。</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># === 必填 ===</span></span>
<span class="line"><span>GITLAB_HOST=192.168.1.173</span></span>
<span class="line"><span>EXTERNAL_URL=http://192.168.1.173</span></span>
<span class="line"><span>SSH_USER=root</span></span>
<span class="line"><span>OS_ID=ubuntu</span></span>
<span class="line"><span>OS_VERSION=22.04</span></span>
<span class="line"><span></span></span>
<span class="line"><span># === 磁盘（01 探测后填写）===</span></span>
<span class="line"><span># 2026-10-12 实测：/dev/sda3 4T 已挂载到 / → DISK_CASE=A</span></span>
<span class="line"><span>DISK_CASE=A</span></span>
<span class="line"><span># A=系统盘已够大，用默认 /var/opt/gitlab</span></span>
<span class="line"><span># B=独立盘未挂载，需格式化挂载</span></span>
<span class="line"><span># C=大盘已挂载，只需指路径</span></span>
<span class="line"><span>DATA_DISK=</span></span>
<span class="line"><span>DATA_ROOT=</span></span>
<span class="line"><span>GIT_DATA_PATH=/var/opt/gitlab/git-data</span></span>
<span class="line"><span>BACKUP_PATH=/var/opt/gitlab/backups</span></span>
<span class="line"><span>CONFIG_BACKUP_PATH=/root/gitlab-config-backup</span></span>
<span class="line"><span></span></span>
<span class="line"><span># === 组织约定 ===</span></span>
<span class="line"><span>DEFAULT_GROUP=embedded</span></span>
<span class="line"><span>DEFAULT_BRANCH=main</span></span>
<span class="line"><span>REPO_SIZE_LIMIT_MB=5120</span></span>
<span class="line"><span>TIMEZONE=Asia/Shanghai</span></span>
<span class="line"><span></span></span>
<span class="line"><span># === 客户端（06 使用）===</span></span>
<span class="line"><span>DEV_GIT_USER_NAME=wangqiao</span></span>
<span class="line"><span>DEV_GIT_USER_EMAIL=yqyfb06@szdrawray.com</span></span>
<span class="line"><span># 默认组/项目（本环境）</span></span>
<span class="line"><span>DEFAULT_GROUP=szdrawray_soft</span></span>
<span class="line"><span>DEFAULT_PROJECT=is20pro_mx</span></span></code></pre></div><h2 id="安全" tabindex="-1">安全 <a class="header-anchor" href="#安全" aria-label="Permalink to &quot;安全&quot;">​</a></h2><ul><li>不把系统 root 密码、GitLab root 密码写入本文件或仓库文档。</li><li>SSH 密码/密钥仅在会话中使用，不落盘到 skill 目录。</li></ul><h2 id="当前环境示例-可覆盖" tabindex="-1">当前环境示例（可覆盖） <a class="header-anchor" href="#当前环境示例-可覆盖" aria-label="Permalink to &quot;当前环境示例（可覆盖）&quot;">​</a></h2><table tabindex="0"><thead><tr><th>变量</th><th>示例值</th></tr></thead><tbody><tr><td>GITLAB_HOST</td><td>192.168.1.173</td></tr><tr><td>EXTERNAL_URL</td><td><a href="http://192.168.1.173" target="_blank" rel="noreferrer">http://192.168.1.173</a></td></tr><tr><td>SSH_USER</td><td>root</td></tr><tr><td>规格参考</td><td>8C / 16G / ~4T，Ubuntu 22.04</td></tr></tbody></table>`,7)])])}const h=s(l,[["render",e]]);export{b as __pageData,h as default};
