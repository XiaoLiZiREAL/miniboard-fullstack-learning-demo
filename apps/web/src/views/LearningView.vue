<script setup lang="ts">
import {
  ApiOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue'

const requestFlow = [
  { name: 'Vue View', file: 'apps/web/src/views', note: '收集表单数据并发起请求' },
  { name: 'API Client', file: 'apps/web/src/api/client.ts', note: '添加 Token，统一处理响应' },
  { name: 'Express Route', file: 'modules/*/*.routes.ts', note: '匹配 URL 与 HTTP 方法' },
  { name: 'Middleware', file: 'http/authenticate.ts', note: '认证、校验和横切逻辑' },
  { name: 'Controller', file: 'modules/*/*.controller.ts', note: '连接 HTTP 与业务层' },
  { name: 'Service / Policy', file: 'modules/*/*.service.ts', note: '业务规则和权限判断' },
  { name: 'Repository', file: 'repositories/*', note: '执行 SQL 或操作内存数据' },
  { name: 'MySQL', file: 'database/mysql/schema.sql', note: '持久保存关系型数据' },
]

const roadmap = [
  { title: '阶段 1 · 跑通请求', text: '启动项目，登录演示账号，在 Network 面板观察登录与项目列表请求。', icon: ApiOutlined },
  { title: '阶段 2 · 跟踪分层', text: '选择“创建任务”接口，从 Route 开始打断点，一直跟到 Repository。', icon: CodeOutlined },
  { title: '阶段 3 · 理解安全', text: '删除 Authorization 请求头、篡改 Token、提交错误参数并观察错误响应。', icon: SafetyCertificateOutlined },
  { title: '阶段 4 · 接入 MySQL', text: '安装 MySQL，执行迁移和种子命令，再把 DB_DRIVER 切换为 mysql。', icon: DatabaseOutlined },
  { title: '阶段 5 · 独立扩展', text: '完成标签、分页、任务历史等练习，把现有知识迁移到新需求。', icon: ExperimentOutlined },
]
</script>

<template>
  <div class="page-container learning-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Learning map</p>
        <h1>不要急着读完代码，先跟踪一条请求。</h1>
        <p>这个页面是导航，根目录 <code>docs/LEARNING_GUIDE.md</code> 是完整教材。</p>
      </div>
    </header>

    <section class="learning-callout">
      <div class="callout-icon"><CheckCircleOutlined /></div>
      <div>
        <strong>推荐的第一个实验</strong>
        <p>打开浏览器开发者工具，创建一个任务，然后依次在下列文件中搜索任务标题。</p>
      </div>
      <code>POST /api/projects/:projectId/tasks</code>
    </section>

    <section class="section-block">
      <div class="section-heading">
        <div><span>01</span><h2>一次请求的完整旅程</h2></div>
        <p>越靠左越接近用户界面，越靠右越接近数据。</p>
      </div>
      <div class="flow-grid">
        <article v-for="(step, index) in requestFlow" :key="step.name" class="flow-card">
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <h3>{{ step.name }}</h3>
          <code>{{ step.file }}</code>
          <p>{{ step.note }}</p>
        </article>
      </div>
    </section>

    <section class="section-block roadmap-block">
      <div class="section-heading">
        <div><span>02</span><h2>循序渐进的学习路线</h2></div>
      </div>
      <div class="roadmap-grid">
        <article v-for="item in roadmap" :key="item.title">
          <div class="roadmap-icon"><component :is="item.icon" /></div>
          <div><h3>{{ item.title }}</h3><p>{{ item.text }}</p></div>
        </article>
      </div>
    </section>

    <section class="concept-grid">
      <article>
        <span>PARAMETER CHECK</span>
        <h3>“标题是字符串吗？”</h3>
        <p>这是 Zod Schema 的职责。它不需要访问数据库。</p>
      </article>
      <article>
        <span>BUSINESS CHECK</span>
        <h3>“负责人属于项目吗？”</h3>
        <p>这是 Service / Policy 的职责，需要读取业务数据。</p>
      </article>
      <article>
        <span>DATABASE CONSTRAINT</span>
        <h3>“邮箱可以重复吗？”</h3>
        <p>Service 会提前判断，MySQL 唯一索引提供最终保证。</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.learning-page { padding-bottom: 60px; }
.learning-callout { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 18px; padding: 22px 24px; color: #e8fffb; background: linear-gradient(120deg, #17494e, #1b6263); border-radius: 14px; box-shadow: 0 16px 38px rgba(22, 78, 79, .13); }
.callout-icon { width: 43px; height: 43px; display: grid; place-items: center; color: #123b3f; background: #a4e1d7; border-radius: 50%; font-size: 21px; }
.learning-callout strong { font-size: 16px; }
.learning-callout p { margin: 4px 0 0; color: #a9ccca; }
.learning-callout > code { padding: 9px 12px; color: #b6eee7; background: rgba(5, 27, 29, .28); border-radius: 7px; }
.section-block { margin-top: 34px; padding: 28px; background: rgba(255,255,255,.82); border: 1px solid #dde6e2; border-radius: 15px; }
.section-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
.section-heading > div { display: flex; align-items: center; gap: 10px; }
.section-heading span { color: #168087; font-size: 12px; font-weight: 900; }
.section-heading h2 { margin: 0; color: #244246; font-size: 20px; }
.section-heading p { margin: 0; color: #879596; font-size: 13px; }
.flow-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.flow-card { position: relative; min-height: 170px; padding: 18px; background: #f2f6f3; border: 1px solid #e0e8e4; border-radius: 11px; }
.flow-card > span { color: #98a6a6; font-size: 10px; font-weight: 800; }
.flow-card h3 { margin: 14px 0 8px; color: #29494d; font-size: 14px; }
.flow-card code { color: #168087; font-size: 11px; overflow-wrap: anywhere; }
.flow-card p { margin: 13px 0 0; color: #78898a; font-size: 12px; line-height: 1.55; }
.roadmap-block { background: #e8efeb; }
.roadmap-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.roadmap-grid article { padding: 20px; background: white; border-radius: 11px; }
.roadmap-icon { width: 38px; height: 38px; display: grid; place-items: center; color: #167f87; background: #dff0ec; border-radius: 9px; font-size: 18px; }
.roadmap-grid h3 { margin: 17px 0 8px; color: #2b484c; font-size: 14px; }
.roadmap-grid p { margin: 0; color: #78888a; font-size: 12px; line-height: 1.65; }
.concept-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 20px; }
.concept-grid article { padding: 22px; background: white; border: 1px solid #dfe7e4; border-radius: 12px; }
.concept-grid span { color: #168087; font-size: 10px; font-weight: 900; letter-spacing: .12em; }
.concept-grid h3 { margin: 10px 0 7px; color: #2a474b; }
.concept-grid p { margin: 0; color: #778789; line-height: 1.6; }
@media (max-width: 1100px) { .flow-grid { grid-template-columns: repeat(2, 1fr); } .roadmap-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) { .learning-callout { grid-template-columns: auto 1fr; } .learning-callout > code { grid-column: 1 / -1; } .flow-grid, .roadmap-grid, .concept-grid { grid-template-columns: 1fr; } .section-heading { align-items: flex-start; flex-direction: column; gap: 8px; } }
</style>

