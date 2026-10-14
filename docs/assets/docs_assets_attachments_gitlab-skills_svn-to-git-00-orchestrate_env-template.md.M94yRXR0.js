import{_ as a,o as n,c as p,ak as e}from"./chunks/framework.DKi5cyCJ.js";const T=JSON.parse('{"title":"SVN → GitLab · 环境变量模板","description":"","frontmatter":{},"headers":[],"relativePath":"docs/assets/attachments/gitlab-skills/svn-to-git-00-orchestrate/env-template.md","filePath":"docs/assets/attachments/gitlab-skills/svn-to-git-00-orchestrate/env-template.md"}'),t={name:"docs/assets/attachments/gitlab-skills/svn-to-git-00-orchestrate/env-template.md"};function l(i,s,c,o,r,_){return n(),p("div",null,[...s[0]||(s[0]=[e(`<h1 id="svn-→-gitlab-·-环境变量模板" tabindex="-1">SVN → GitLab · 环境变量模板 <a class="header-anchor" href="#svn-→-gitlab-·-环境变量模板" aria-label="Permalink to &quot;SVN → GitLab · 环境变量模板&quot;">​</a></h1><p>复制到对话开头填写；<strong>不要</strong>把密码写进本文件后提交公开仓。</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># === GitLab（本环境默认）===</span></span>
<span class="line"><span>GITLAB_HOST=192.168.1.173</span></span>
<span class="line"><span>EXTERNAL_URL=http://192.168.1.173</span></span>
<span class="line"><span>GIT_HTTP_TUNNEL=http://127.0.0.1:18173</span></span>
<span class="line"><span>DEFAULT_BRANCH=main</span></span>
<span class="line"><span></span></span>
<span class="line"><span># === 迁移策略（已拍板，改口再改）===</span></span>
<span class="line"><span>MIGRATE_TOOL=git-svn</span></span>
<span class="line"><span>HISTORY_MODE=H1</span></span>
<span class="line"><span>AUTHOR_MODE=A1</span></span>
<span class="line"><span>CUTOVER_MODE=C1</span></span>
<span class="line"><span># 方案1：产品 Group + 子组 PC/MC/MX（先建组再迁仓）</span></span>
<span class="line"><span>PRODUCT_GROUP=is20pro</span></span>
<span class="line"><span># 子组固定名（勿改）：PC=上位机 MC=中位机 MX=下位机</span></span>
<span class="line"><span>LAYER_PC=PC</span></span>
<span class="line"><span>LAYER_MC=MC</span></span>
<span class="line"><span>LAYER_MX=MX</span></span>
<span class="line"><span></span></span>
<span class="line"><span># === 本机路径 ===</span></span>
<span class="line"><span>WORK_ROOT=E:/svn_git_migrate</span></span>
<span class="line"><span>AUTHORS_FILE=E:/svn_git_migrate/authors.txt</span></span>
<span class="line"><span></span></span>
<span class="line"><span># === 当前处理的单个项目（01–03 使用）===</span></span>
<span class="line"><span>SVN_URL=</span></span>
<span class="line"><span>LAYOUT=L1</span></span>
<span class="line"><span># L1=标准 trunk/branches/tags（git svn -s）</span></span>
<span class="line"><span># L2=无 trunk（不加 -s）</span></span>
<span class="line"><span># TARGET_GROUP 必须含产品+层，例：is20pro/PC</span></span>
<span class="line"><span>TARGET_GROUP=</span></span>
<span class="line"><span>TARGET_PROJECT=</span></span>
<span class="line"><span># 本地目录名建议与 TARGET_PROJECT 相同</span></span>
<span class="line"><span>LOCAL_DIR=</span></span>
<span class="line"><span>DISPLAY_NAME=</span></span></code></pre></div><h2 id="安全" tabindex="-1">安全 <a class="header-anchor" href="#安全" aria-label="Permalink to &quot;安全&quot;">​</a></h2><ul><li>SVN 账号/密码、GitLab PAT：只放本机凭证管理或会话环境变量，不入库。</li><li>推送认证：用户名 <code>oauth2</code>，密码为 PAT（<code>read_repository</code> + <code>write_repository</code>）。</li></ul>`,5)])])}const h=a(t,[["render",l]]);export{T as __pageData,h as default};
