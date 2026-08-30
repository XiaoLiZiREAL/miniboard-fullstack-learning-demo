<script setup lang="ts">
import { DeleteOutlined, EditOutlined, SendOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { commentApi, taskApi } from '@/api'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { ProjectMember, Task, TaskComment } from '@/types/domain'

const props = defineProps<{
  open: boolean
  task: Task | null
  members: ProjectMember[]
  isOwner: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  edit: [task: Task]
  deleted: [taskId: number]
}>()

const auth = useAuthStore()
const comments = ref<TaskComment[]>([])
const commentText = ref('')
const loadingComments = ref(false)
const sending = ref(false)

const assigneeName = computed(
  () => props.members.find((member) => member.userId === props.task?.assigneeId)?.name ?? '未分配',
)
const canDeleteTask = computed(
  () => props.isOwner || props.task?.creatorId === auth.user?.id,
)

watch(
  () => [props.open, props.task?.id] as const,
  ([open]) => {
    if (open && props.task) void loadComments()
  },
)

async function loadComments() {
  if (!props.task) return
  loadingComments.value = true
  try {
    comments.value = await commentApi.list(props.task.id)
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '评论加载失败')
  } finally {
    loadingComments.value = false
  }
}

async function addComment() {
  if (!props.task || !commentText.value.trim()) return
  sending.value = true
  try {
    comments.value.push(await commentApi.create(props.task.id, commentText.value.trim()))
    commentText.value = ''
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '评论发送失败')
  } finally {
    sending.value = false
  }
}

async function deleteComment(comment: TaskComment) {
  try {
    await commentApi.delete(comment.id)
    comments.value = comments.value.filter((item) => item.id !== comment.id)
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '评论删除失败')
  }
}

async function deleteTask() {
  if (!props.task) return
  try {
    await taskApi.delete(props.task.id)
    message.success('任务已删除')
    emit('deleted', props.task.id)
    emit('update:open', false)
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '任务删除失败')
  }
}
</script>

<template>
  <a-drawer
    :open="open"
    width="min(500px, 100vw)"
    :title="task?.title"
    @update:open="emit('update:open', $event)"
  >
    <template v-if="task" #extra>
      <a-space>
        <a-button @click="emit('edit', task)"><EditOutlined /> 编辑</a-button>
        <a-popconfirm v-if="canDeleteTask" title="确定删除这个任务吗？" @confirm="deleteTask">
          <a-button danger aria-label="删除任务"><DeleteOutlined /></a-button>
        </a-popconfirm>
      </a-space>
    </template>

    <div v-if="task" class="task-detail">
      <div class="detail-tags">
        <a-tag :color="task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'orange' : 'blue'">
          {{ { low: '低优先级', medium: '中优先级', high: '高优先级' }[task.priority] }}
        </a-tag>
        <a-tag>{{ { todo: '待处理', doing: '进行中', done: '已完成' }[task.status] }}</a-tag>
      </div>

      <dl>
        <div><dt>负责人</dt><dd>{{ assigneeName }}</dd></div>
        <div><dt>截止日期</dt><dd>{{ task.dueDate || '未设置' }}</dd></div>
        <div><dt>任务 ID</dt><dd>#{{ task.id }}</dd></div>
      </dl>

      <section class="description-section">
        <h3>任务说明</h3>
        <p>{{ task.description || '暂时没有详细说明。' }}</p>
      </section>

      <a-divider />
      <section class="comments-section">
        <h3>讨论 <span>{{ comments.length }}</span></h3>
        <a-spin :spinning="loadingComments">
          <div v-if="comments.length" class="comment-list">
            <article v-for="comment in comments" :key="comment.id" class="comment-item">
              <a-avatar size="small">{{ comment.authorName.slice(0, 1) }}</a-avatar>
              <div>
                <header>
                  <strong>{{ comment.authorName }}</strong>
                  <time>{{ new Date(comment.createdAt).toLocaleString() }}</time>
                  <a-popconfirm
                    v-if="isOwner || comment.authorId === auth.user?.id"
                    title="确定删除这条评论吗？"
                    @confirm="deleteComment(comment)"
                  >
                    <a-button type="text" size="small" danger>删除</a-button>
                  </a-popconfirm>
                </header>
                <p>{{ comment.content }}</p>
              </div>
            </article>
          </div>
          <!-- 不传 image 时使用 Ant Design 的合法默认空状态；null 会导致组件内部解构失败。 -->
          <a-empty v-else description="还没有评论" />
        </a-spin>

        <div class="comment-composer">
          <a-textarea v-model:value="commentText" :rows="3" placeholder="写下讨论内容……" @keydown.ctrl.enter="addComment" />
          <a-button type="primary" :loading="sending" :disabled="!commentText.trim()" @click="addComment">
            <SendOutlined /> 发送
          </a-button>
        </div>
      </section>
    </div>
  </a-drawer>
</template>

<style scoped>
.detail-tags { margin-bottom: 24px; }
dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0 0 28px; }
dl div { padding: 12px; background: #f3f6f4; border-radius: 9px; }
dt { color: #889798; font-size: 12px; }
dd { margin: 4px 0 0; color: #284448; font-weight: 700; }
h3 { color: #294549; font-size: 14px; }
.description-section p { color: #657779; line-height: 1.75; white-space: pre-wrap; }
.comments-section h3 span { color: #91a0a0; font-weight: 400; }
.comment-list { display: flex; flex-direction: column; gap: 18px; }
.comment-item { display: grid; grid-template-columns: 28px 1fr; gap: 10px; }
.comment-item header { display: flex; align-items: center; gap: 8px; }
.comment-item header strong { color: #2d494d; }
.comment-item time { color: #9aa6a7; font-size: 11px; }
.comment-item p { margin: 5px 0 0; color: #5e7173; line-height: 1.6; }
.comment-composer { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; margin-top: 24px; }
@media (max-width: 560px) { dl { grid-template-columns: 1fr; } }
</style>
