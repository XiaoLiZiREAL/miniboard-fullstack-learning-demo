<script setup lang="ts">
import {
  BookOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons-vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { MenuProps } from 'ant-design-vue'
import { systemApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

// 小屏幕首次进入时默认折叠。否则 248px 的侧栏会占据手机的一半宽度。
const mobileQuery = window.matchMedia('(max-width: 760px)')
const isMobile = ref(mobileQuery.matches)
const collapsed = ref(mobileQuery.matches)
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const databaseDriver = ref<'memory' | 'mysql' | 'offline'>('offline')

const selectedKeys = computed(() => [route.path.startsWith('/learn') ? '/learn' : '/projects'])

function logout() {
  auth.logout()
  void router.push('/login')
}

const navigateFromMenu: MenuProps['onClick'] = ({ key }) => {
  void router.push(String(key))
}

function syncViewport(event: MediaQueryListEvent) {
  isMobile.value = event.matches
  // 布局跨越断点时恢复最合适的默认状态，避免侧栏意外挡住内容。
  collapsed.value = event.matches
}

onMounted(async () => {
  mobileQuery.addEventListener('change', syncViewport)
  try {
    databaseDriver.value = (await systemApi.health()).databaseDriver
  } catch {
    databaseDriver.value = 'offline'
  }
})

onBeforeUnmount(() => mobileQuery.removeEventListener('change', syncViewport))
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-sider v-model:collapsed="collapsed" :width="248" :collapsed-width="76" class="app-sidebar">
      <div class="brand" :class="{ collapsed }">
        <div class="brand-mark">M</div>
        <div v-if="!collapsed" class="brand-copy">
          <strong>MiniBoard</strong>
          <span>全栈学习实验室</span>
        </div>
      </div>

      <a-menu
        theme="dark"
        mode="inline"
        :selected-keys="selectedKeys"
        class="side-menu"
        @click="navigateFromMenu"
      >
        <a-menu-item key="/projects">
          <template #icon><FolderOpenOutlined /></template>
          项目工作台
        </a-menu-item>
        <a-menu-item key="/learn">
          <template #icon><BookOutlined /></template>
          学习路线
        </a-menu-item>
      </a-menu>

      <div class="sidebar-footer" :class="{ collapsed }">
        <a-avatar :size="36">{{ auth.user?.name.slice(0, 1) }}</a-avatar>
        <div v-if="!collapsed" class="user-copy">
          <strong>{{ auth.user?.name }}</strong>
          <span>{{ auth.user?.email }}</span>
        </div>
        <a-button v-if="!collapsed" type="text" class="logout-button" aria-label="退出登录" @click="logout">
          <LogoutOutlined />
        </a-button>
      </div>
    </a-layout-sider>

    <!-- 移动端展开侧栏时提供遮罩；点击内容区域即可安全收起。 -->
    <button
      v-if="isMobile && !collapsed"
      class="sidebar-scrim"
      type="button"
      aria-label="关闭侧栏遮罩"
      @click="collapsed = true"
    />

    <!-- 放在根布局层级，才能真正覆盖移动端固定侧栏，而不受右侧布局的层叠上下文限制。 -->
    <a-button
      type="text"
      class="collapse-button"
      :class="{
        'sidebar-collapsed': collapsed,
        'sidebar-expanded': isMobile && !collapsed,
      }"
      :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
      @click="collapsed = !collapsed"
    >
      <MenuUnfoldOutlined v-if="collapsed" />
      <MenuFoldOutlined v-else />
    </a-button>

    <a-layout>
      <a-layout-header class="app-header">
        <div class="header-note">
          <span class="status-dot" :class="{ offline: databaseDriver === 'offline' }" />
          <template v-if="databaseDriver === 'memory'">当前使用后端内存模式，无需 MySQL</template>
          <template v-else-if="databaseDriver === 'mysql'">当前使用 MySQL 持久化模式</template>
          <template v-else>后端连接中</template>
        </div>
      </a-layout-header>
      <a-layout-content class="app-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>
