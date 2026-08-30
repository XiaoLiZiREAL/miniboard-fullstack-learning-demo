<script setup lang="ts">
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TaskDetailDrawer from '@/components/TaskDetailDrawer.vue'
import TaskEditorModal from '@/components/TaskEditorModal.vue'
import { projectApi, taskApi } from '@/api'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { Project, ProjectMember, Task, TaskPriority, TaskStatus } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projectId = Number(route.params.projectId)

const project = ref<Project | null>(null)
const members = ref<ProjectMember[]>([])
const tasks = ref<Task[]>([])
const loading = ref(true)
const editorOpen = ref(false)
const detailOpen = ref(false)
const memberModalOpen = ref(false)
const settingsModalOpen = ref(false)
const editingTask = ref<Task | null>(null)
const selectedTask = ref<Task | null>(null)
const memberEmail = ref('')
const addingMember = ref(false)
const savingProject = ref(false)
const removingMemberId = ref<number | null>(null)
const filters = reactive<{ keyword: string; priority?: TaskPriority }>({ keyword: '' })
const projectForm = reactive({ name: '', description: '' })

const columns: { status: TaskStatus; title: string; note: string; color: string }[] = [
  { status: 'todo', title: '待处理', note: '明确下一步行动', color: '#7c8e91' },
  { status: 'doing', title: '进行中', note: '保持工作项可控', color: '#c58532' },
  { status: 'done', title: '已完成', note: '形成可以验收的结果', color: '#378b68' },
]

const isOwner = computed(() => project.value?.ownerId === auth.user?.id)
const completionRate = computed(() =>
  tasks.value.length
    ? Math.round((tasks.value.filter((task) => task.status === 'done').length / tasks.value.length) * 100)
    : 0,
)

function tasksFor(status: TaskStatus) {
  return tasks.value.filter((task) => task.status === status)
}

function assigneeName(task: Task) {
  return members.value.find((member) => member.userId === task.assigneeId)?.name ?? '未分配'
}

async function loadAll() {
  loading.value = true
  try {
    const [detail, taskList] = await Promise.all([
      projectApi.detail(projectId),
      taskApi.list(projectId, filters),
    ])
    project.value = detail.project
    members.value = detail.members
    tasks.value = taskList
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '项目加载失败')
  } finally {
    loading.value = false
  }
}

async function searchTasks() {
  try {
    tasks.value = await taskApi.list(projectId, filters)
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '筛选失败')
  }
}

function createTask() {
  editingTask.value = null
  editorOpen.value = true
}

function editTask(task: Task) {
  detailOpen.value = false
  editingTask.value = task
  editorOpen.value = true
}

function openTask(task: Task) {
  selectedTask.value = task
  detailOpen.value = true
}

function upsertTask(saved: Task) {
  const index = tasks.value.findIndex((task) => task.id === saved.id)
  if (index >= 0) tasks.value[index] = saved
  else tasks.value.unshift(saved)
  if (selectedTask.value?.id === saved.id) selectedTask.value = saved
}

async function changeStatus(task: Task, status: TaskStatus) {
  try {
    upsertTask(await taskApi.update(task.id, { status }))
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '状态更新失败')
  }
}

function changeStatusFromSelect(task: Task, value: unknown) {
  if (value === 'todo' || value === 'doing' || value === 'done') {
    void changeStatus(task, value)
  }
}

function removeTask(taskId: number) {
  tasks.value = tasks.value.filter((task) => task.id !== taskId)
  selectedTask.value = null
}

async function addMember() {
  if (!memberEmail.value.trim()) return
  addingMember.value = true
  try {
    members.value = await projectApi.addMember(projectId, memberEmail.value.trim())
    memberEmail.value = ''
    memberModalOpen.value = false
    message.success('成员已加入项目')
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '添加成员失败')
  } finally {
    addingMember.value = false
  }
}

function openProjectSettings() {
  if (!project.value) return
  projectForm.name = project.value.name
  projectForm.description = project.value.description
  settingsModalOpen.value = true
}

async function saveProject() {
  if (!projectForm.name.trim()) {
    message.warning('项目名称不能为空')
    return
  }
  savingProject.value = true
  try {
    project.value = await projectApi.update(projectId, {
      name: projectForm.name.trim(),
      description: projectForm.description.trim(),
    })
    settingsModalOpen.value = false
    message.success('项目信息已更新')
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '项目更新失败')
  } finally {
    savingProject.value = false
  }
}

async function removeMember(member: ProjectMember) {
  removingMemberId.value = member.userId
  try {
    await projectApi.removeMember(projectId, member.userId)
    members.value = members.value.filter((item) => item.userId !== member.userId)
    message.success('成员已移出项目')
  } catch (error) {
    // 后端会阻止移除仍负责某些任务的成员，并给出需要先重新分配的明确提示。
    message.error(error instanceof ApiError ? error.message : '移除成员失败')
  } finally {
    removingMemberId.value = null
  }
}

onMounted(loadAll)
</script>

<template>
  <div class="page-container board-page">
    <a-spin :spinning="loading">
      <template v-if="project">
        <button class="back-link" @click="router.push('/projects')"><ArrowLeftOutlined /> 返回项目</button>
        <header class="board-heading">
          <div>
            <div class="project-meta">
              <span>PROJECT {{ String(project.id).padStart(2, '0') }}</span>
              <a-tag v-if="isOwner" color="cyan">所有者</a-tag>
            </div>
            <h1>{{ project.name }}</h1>
            <p>{{ project.description }}</p>
          </div>
          <a-space>
            <a-avatar-group :max-count="4">
              <a-tooltip v-for="member in members" :key="member.userId" :title="`${member.name} · ${member.role}`">
                <a-avatar>{{ member.name.slice(0, 1) }}</a-avatar>
              </a-tooltip>
            </a-avatar-group>
            <a-button v-if="isOwner" @click="openProjectSettings"><SettingOutlined /> 项目设置</a-button>
            <a-button v-if="isOwner" @click="memberModalOpen = true"><UserAddOutlined /> 成员管理</a-button>
            <a-button type="primary" @click="createTask"><PlusOutlined /> 新建任务</a-button>
          </a-space>
        </header>

        <section class="board-toolbar">
          <div class="board-stats">
            <span><b>{{ tasks.length }}</b> 全部任务</span>
            <span><b>{{ completionRate }}%</b> 已完成</span>
            <span><TeamOutlined /> {{ members.length }} 位成员</span>
          </div>
          <div class="board-filters">
            <a-input
              v-model:value="filters.keyword"
              allow-clear
              placeholder="搜索任务"
              @press-enter="searchTasks"
              @change="!filters.keyword && searchTasks()"
            >
              <template #prefix><SearchOutlined /></template>
            </a-input>
            <a-select v-model:value="filters.priority" allow-clear placeholder="全部优先级" @change="searchTasks">
              <a-select-option value="high">高优先级</a-select-option>
              <a-select-option value="medium">中优先级</a-select-option>
              <a-select-option value="low">低优先级</a-select-option>
            </a-select>
          </div>
        </section>

        <section class="kanban-board">
          <div v-for="column in columns" :key="column.status" class="task-column">
            <header>
              <div>
                <span class="column-dot" :style="{ background: column.color }" />
                <strong>{{ column.title }}</strong>
                <em>{{ tasksFor(column.status).length }}</em>
              </div>
              <small>{{ column.note }}</small>
            </header>

            <div class="task-list">
              <article
                v-for="task in tasksFor(column.status)"
                :key="task.id"
                class="task-card"
                role="button"
                tabindex="0"
                @click="openTask(task)"
                @keydown.enter="openTask(task)"
                @keydown.space.prevent="openTask(task)"
              >
                <div class="task-card-top">
                  <a-tag :color="task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'orange' : 'blue'">
                    {{ { low: '低', medium: '中', high: '高' }[task.priority] }}优先级
                  </a-tag>
                  <span>#{{ task.id }}</span>
                </div>
                <h3>{{ task.title }}</h3>
                <p>{{ task.description || '没有任务说明' }}</p>
                <div class="task-card-footer">
                  <a-avatar size="small">{{ assigneeName(task).slice(0, 1) }}</a-avatar>
                  <span>{{ assigneeName(task) }}</span>
                  <span v-if="task.dueDate" class="due-date"><CalendarOutlined /> {{ task.dueDate.slice(5) }}</span>
                </div>
                <a-select
                  :value="task.status"
                  size="small"
                  class="status-select"
                  @click.stop
                  @keydown.stop
                  @change="(value) => changeStatusFromSelect(task, value)"
                >
                  <a-select-option value="todo">待处理</a-select-option>
                  <a-select-option value="doing">进行中</a-select-option>
                  <a-select-option value="done">已完成</a-select-option>
                </a-select>
              </article>
              <button class="add-task-inline" @click="createTask"><PlusOutlined /> 添加任务</button>
            </div>
          </div>
        </section>
      </template>
    </a-spin>

    <TaskEditorModal
      v-model:open="editorOpen"
      :project-id="projectId"
      :members="members"
      :task="editingTask"
      @saved="upsertTask"
    />
    <TaskDetailDrawer
      v-model:open="detailOpen"
      :task="selectedTask"
      :members="members"
      :is-owner="isOwner"
      @edit="editTask"
      @deleted="removeTask"
    />

    <a-modal
      v-model:open="memberModalOpen"
      title="项目成员管理"
      ok-text="添加成员"
      :confirm-loading="addingMember"
      @ok="addMember"
    >
      <p class="member-help">为了保持 Demo 简洁，成员需要先注册账号，再由项目所有者通过邮箱添加。</p>
      <a-input v-model:value="memberEmail" size="large" placeholder="member@example.com" @press-enter="addMember" />
      <div class="member-list">
        <div v-for="member in members" :key="member.userId" class="member-row">
          <a-avatar>{{ member.name.slice(0, 1) }}</a-avatar>
          <div>
            <strong>{{ member.name }}</strong>
            <span>{{ member.email }}</span>
          </div>
          <a-tag :color="member.role === 'owner' ? 'cyan' : 'default'">
            {{ member.role === 'owner' ? '所有者' : '成员' }}
          </a-tag>
          <a-popconfirm
            v-if="member.role !== 'owner'"
            title="确定将该成员移出项目吗？"
            @confirm="removeMember(member)"
          >
            <a-button
              danger
              type="text"
              aria-label="移除成员"
              :loading="removingMemberId === member.userId"
            ><DeleteOutlined /></a-button>
          </a-popconfirm>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="settingsModalOpen"
      title="编辑项目信息"
      ok-text="保存"
      :confirm-loading="savingProject"
      @ok="saveProject"
    >
      <a-form layout="vertical" :model="projectForm" class="project-form">
        <a-form-item label="项目名称" required>
          <a-input v-model:value="projectForm.name" :maxlength="100" />
        </a-form-item>
        <a-form-item label="项目说明">
          <a-textarea v-model:value="projectForm.description" :rows="4" :maxlength="1000" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.back-link { margin-bottom: 18px; padding: 0; color: #6c8081; background: none; border: 0; cursor: pointer; }
.board-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 26px; }
.project-meta { display: flex; align-items: center; gap: 10px; color: #178087; font-size: 11px; font-weight: 900; letter-spacing: .12em; }
.board-heading h1 { margin: 9px 0 5px; color: #17363a; font-size: clamp(27px, 3vw, 38px); letter-spacing: -.03em; }
.board-heading p { max-width: 720px; margin: 0; color: #718284; }
.board-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 16px 18px; margin-bottom: 18px; background: white; border: 1px solid #dde7e3; border-radius: 12px; }
.board-stats, .board-filters { display: flex; align-items: center; gap: 20px; }
.board-stats span { color: #748586; font-size: 13px; }
.board-stats b { color: #234448; font-size: 16px; }
.board-filters .ant-input-affix-wrapper { width: 230px; }
.board-filters .ant-select { width: 145px; }
.kanban-board { display: grid; grid-template-columns: repeat(3, minmax(290px, 1fr)); gap: 16px; align-items: start; }
.task-column { min-height: 520px; padding: 15px; background: #e9efec; border: 1px solid #dbe4e0; border-radius: 14px; }
.task-column > header { padding: 4px 3px 15px; }
.task-column > header > div { display: flex; align-items: center; gap: 8px; }
.task-column > header strong { color: #29484c; }
.task-column > header em { min-width: 23px; padding: 2px 7px; color: #78888a; background: #d9e2de; border-radius: 20px; font-size: 11px; font-style: normal; text-align: center; }
.task-column > header small { display: block; margin: 4px 0 0 18px; color: #8d9a9a; }
.column-dot { width: 9px; height: 9px; border-radius: 50%; }
.task-list { display: flex; flex-direction: column; gap: 11px; }
.task-card { position: relative; padding: 17px; background: white; border: 1px solid #dce5e1; border-radius: 11px; cursor: pointer; box-shadow: 0 6px 14px rgba(39, 69, 69, .035); transition: transform 160ms ease, box-shadow 160ms ease; }
.task-card:hover { transform: translateY(-2px); box-shadow: 0 12px 22px rgba(35, 75, 75, .08); }
.task-card:focus-visible { outline: 3px solid rgba(22, 127, 135, .32); outline-offset: 2px; }
.task-card-top { display: flex; justify-content: space-between; align-items: center; color: #9aa6a6; font-size: 11px; }
.task-card h3 { margin: 14px 0 7px; color: #29474b; font-size: 15px; }
.task-card p { min-height: 39px; margin: 0 0 15px; color: #718284; font-size: 13px; line-height: 1.55; display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.task-card-footer { display: flex; align-items: center; gap: 7px; color: #748586; font-size: 12px; }
.due-date { margin-left: auto; }
.status-select { width: 100%; margin-top: 13px; }
.add-task-inline { width: 100%; padding: 11px; color: #718385; background: transparent; border: 1px dashed #bdcbc6; border-radius: 9px; cursor: pointer; }
.add-task-inline:hover { color: #167f87; border-color: #72aaa5; background: rgba(255,255,255,.45); }
.member-help { color: #6f8082; }
.member-list { display: flex; flex-direction: column; gap: 8px; max-height: 260px; margin-top: 20px; overflow: auto; }
.member-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 10px; padding: 10px; background: #f4f7f5; border-radius: 9px; }
.member-row > div { min-width: 0; display: flex; flex-direction: column; }
.member-row strong, .member-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.member-row span { color: #849294; font-size: 12px; }
.project-form { padding-top: 12px; }

@media (max-width: 1100px) { .kanban-board { grid-template-columns: 1fr; } .task-column { min-height: auto; } }
@media (max-width: 760px) { .board-heading, .board-toolbar { align-items: flex-start; flex-direction: column; } .board-stats, .board-filters { width: 100%; flex-wrap: wrap; } }
</style>
