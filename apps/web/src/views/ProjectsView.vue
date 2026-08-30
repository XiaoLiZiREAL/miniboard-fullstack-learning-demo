<script setup lang="ts">
import { ArrowRightOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { projectApi } from '@/api'
import { ApiError } from '@/api/client'
import type { ProjectSummary } from '@/types/domain'

const router = useRouter()
const projects = ref<ProjectSummary[]>([])
const loading = ref(true)
const submitting = ref(false)
const modalOpen = ref(false)
const form = reactive({ name: '', description: '' })

const totalTasks = computed(() => projects.value.reduce((sum, project) => sum + project.taskCount, 0))
const completedTasks = computed(() =>
  projects.value.reduce((sum, project) => sum + project.completedTaskCount, 0),
)
const completionRate = computed(() =>
  totalTasks.value ? Math.round((completedTasks.value / totalTasks.value) * 100) : 0,
)

async function loadProjects() {
  loading.value = true
  try {
    projects.value = await projectApi.list()
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '项目加载失败')
  } finally {
    loading.value = false
  }
}

async function createProject() {
  submitting.value = true
  try {
    const project = await projectApi.create(form)
    message.success('项目创建成功')
    modalOpen.value = false
    form.name = ''
    form.description = ''
    await router.push(`/projects/${project.id}`)
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '创建失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadProjects)
</script>

<template>
  <div class="page-container">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Workspace</p>
        <h1>项目工作台</h1>
        <p>每一个项目都是一组真实的后端数据关系，而不只是前端卡片。</p>
      </div>
      <a-button type="primary" size="large" @click="modalOpen = true">
        <template #icon><PlusOutlined /></template>
        新建项目
      </a-button>
    </header>

    <section class="metric-grid">
      <div class="metric-card">
        <span>参与项目</span><strong>{{ projects.length }}</strong><small>project_members 查询结果</small>
      </div>
      <div class="metric-card accent">
        <span>全部任务</span><strong>{{ totalTasks }}</strong><small>通过 LEFT JOIN 聚合</small>
      </div>
      <div class="metric-card">
        <span>总体完成度</span><strong>{{ completionRate }}%</strong><small>{{ completedTasks }} 项已完成</small>
      </div>
    </section>

    <a-spin :spinning="loading">
      <section v-if="projects.length" class="project-grid">
        <article
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          role="link"
          tabindex="0"
          @click="router.push(`/projects/${project.id}`)"
          @keydown.enter="router.push(`/projects/${project.id}`)"
          @keydown.space.prevent="router.push(`/projects/${project.id}`)"
        >
          <div class="project-card-top">
            <span class="project-index">P{{ String(project.id).padStart(2, '0') }}</span>
            <a-tag :color="project.role === 'owner' ? 'cyan' : 'default'">
              {{ project.role === 'owner' ? '所有者' : '成员' }}
            </a-tag>
          </div>
          <h2>{{ project.name }}</h2>
          <p>{{ project.description || '暂时没有项目说明' }}</p>
          <a-progress
            :percent="project.taskCount ? Math.round(project.completedTaskCount / project.taskCount * 100) : 0"
            :show-info="false"
            stroke-color="#309b98"
          />
          <footer>
            <span><TeamOutlined /> {{ project.taskCount }} 项任务</span>
            <span class="open-link">打开看板 <ArrowRightOutlined /></span>
          </footer>
        </article>
      </section>
      <a-empty v-else-if="!loading" description="还没有项目，创建第一个项目开始学习">
        <a-button type="primary" @click="modalOpen = true">创建项目</a-button>
      </a-empty>
    </a-spin>

    <a-modal v-model:open="modalOpen" title="创建学习项目" :confirm-loading="submitting" @ok="createProject">
      <a-form layout="vertical" :model="form" class="modal-form">
        <a-form-item label="项目名称" required>
          <a-input v-model:value="form.name" :maxlength="100" placeholder="例如：个人博客 API" />
        </a-form-item>
        <a-form-item label="项目说明">
          <a-textarea v-model:value="form.description" :rows="4" :maxlength="1000" placeholder="这个项目要解决什么问题？" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}

.metric-card {
  min-height: 138px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px 26px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid #dee7e3;
  border-radius: 14px;
  box-shadow: 0 12px 34px rgba(38, 68, 68, 0.035);
}

.metric-card.accent {
  color: #e9fffb;
  background: #1a5559;
  border-color: #1a5559;
}

.metric-card span { color: #738386; font-size: 13px; }
.metric-card.accent span, .metric-card.accent small { color: #9bc8c7; }
.metric-card strong { margin: 3px 0; color: #1c3c40; font-size: 34px; }
.metric-card.accent strong { color: white; }
.metric-card small { color: #98a5a5; }

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 18px;
}

.project-card {
  min-height: 270px;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #fff;
  border: 1px solid #dfe7e4;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.project-card:hover {
  transform: translateY(-3px);
  border-color: #9fc9c4;
  box-shadow: 0 18px 40px rgba(31, 81, 82, 0.09);
}

.project-card:focus-visible {
  outline: 3px solid rgba(22, 127, 135, 0.32);
  outline-offset: 3px;
}

.project-card-top,
.project-card footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-index { color: #8a9a9a; font-size: 12px; font-weight: 800; letter-spacing: .1em; }
.project-card h2 { margin: 25px 0 8px; color: #1d3a3e; font-size: 20px; }
.project-card p { min-height: 48px; margin: 0 0 24px; color: #778789; line-height: 1.65; }
.project-card footer { margin-top: auto; padding-top: 18px; color: #839192; font-size: 13px; }
.open-link { color: #167f87; font-weight: 700; }
.modal-form { padding-top: 14px; }

@media (max-width: 800px) {
  .metric-grid { grid-template-columns: 1fr; }
}
</style>
