<script setup lang="ts">
import { message } from 'ant-design-vue'
import { reactive, ref, watch } from 'vue'
import { taskApi, type TaskPayload } from '@/api'
import { ApiError } from '@/api/client'
import type { ProjectMember, Task } from '@/types/domain'

const props = defineProps<{
  open: boolean
  projectId: number
  members: ProjectMember[]
  task: Task | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [task: Task]
}>()

const submitting = ref(false)
const form = reactive<{
  title: string
  description: string
  status: TaskPayload['status']
  priority: TaskPayload['priority']
  assigneeId: number | undefined
  dueDate: string | null
}>({
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assigneeId: undefined,
  dueDate: null,
})

// value-format 存在时 DatePicker 在运行时返回字符串；清空时则返回 null/undefined。
function updateDueDate(value: unknown) {
  form.dueDate = typeof value === 'string' ? value : null
}

watch(
  () => [props.open, props.task] as const,
  ([open, task]) => {
    if (!open) return
    form.title = task?.title ?? ''
    form.description = task?.description ?? ''
    form.status = task?.status ?? 'todo'
    form.priority = task?.priority ?? 'medium'
    form.assigneeId = task?.assigneeId ?? undefined
    form.dueDate = task?.dueDate ?? null
  },
  { immediate: true },
)

async function submit() {
  if (!form.title.trim()) {
    message.warning('请输入任务标题')
    return
  }
  submitting.value = true
  const payload: TaskPayload = {
    title: form.title.trim(),
    description: form.description.trim(),
    status: form.status,
    priority: form.priority,
    assigneeId: form.assigneeId ?? null,
    dueDate: form.dueDate,
  }
  try {
    const saved = props.task
      ? await taskApi.update(props.task.id, payload)
      : await taskApi.create(props.projectId, payload)
    message.success(props.task ? '任务已更新' : '任务已创建')
    emit('saved', saved)
    emit('update:open', false)
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '任务保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <a-modal
    :open="open"
    :title="task ? '编辑任务' : '创建任务'"
    :confirm-loading="submitting"
    width="620px"
    @update:open="emit('update:open', $event)"
    @ok="submit"
  >
    <a-form layout="vertical" :model="form" class="task-form">
      <a-form-item label="任务标题" required>
        <a-input v-model:value="form.title" :maxlength="100" placeholder="用一句话说明要完成什么" />
      </a-form-item>
      <a-form-item label="任务说明">
        <a-textarea v-model:value="form.description" :rows="4" :maxlength="2000" placeholder="补充背景、验收条件或学习目标" />
      </a-form-item>
      <div class="form-grid">
        <a-form-item label="状态">
          <a-select v-model:value="form.status">
            <a-select-option value="todo">待处理</a-select-option>
            <a-select-option value="doing">进行中</a-select-option>
            <a-select-option value="done">已完成</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="优先级">
          <a-select v-model:value="form.priority">
            <a-select-option value="low">低</a-select-option>
            <a-select-option value="medium">中</a-select-option>
            <a-select-option value="high">高</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="负责人">
          <a-select v-model:value="form.assigneeId" allow-clear placeholder="暂不分配">
            <a-select-option v-for="member in members" :key="member.userId" :value="member.userId">
              {{ member.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="截止日期">
          <a-date-picker
            v-bind="form.dueDate === null ? {} : { value: form.dueDate }"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            @update:value="updateDueDate"
          />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>

<style scoped>
.task-form { padding-top: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
</style>
