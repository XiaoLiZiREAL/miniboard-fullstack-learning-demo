<script setup lang="ts">
import { ApiOutlined, DatabaseOutlined, LockOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const mode = ref<'login' | 'register'>('login')
const submitting = ref(false)
const form = reactive({
  name: '',
  email: 'student@example.com',
  password: 'Fullstack123!',
})

async function submit() {
  submitting.value = true
  try {
    if (mode.value === 'login') {
      await auth.login({ email: form.email, password: form.password })
    } else {
      await auth.register({ name: form.name, email: form.email, password: form.password })
    }
    message.success(mode.value === 'login' ? '登录成功' : '注册成功')
    await router.push(String(route.query.redirect || '/projects'))
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '请求失败，请确认后端已经启动')
  } finally {
    submitting.value = false
  }
}

function useDemoAccount() {
  mode.value = 'login'
  form.email = 'student@example.com'
  form.password = 'Fullstack123!'
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-story">
      <div class="auth-brand"><span>M</span> MiniBoard</div>
      <div class="story-copy">
        <p class="eyebrow light">Learning by building</p>
        <h1>让每一次请求<br />都成为一节后端课。</h1>
        <p>
          从你熟悉的 Vue 界面出发，沿着 HTTP、Controller、Service、Repository 一直走到数据库。
        </p>
      </div>
      <div class="story-steps">
        <div><ApiOutlined /><span><b>01</b> 观察 REST API 请求</span></div>
        <div><LockOutlined /><span><b>02</b> 理解认证与权限</span></div>
        <div><DatabaseOutlined /><span><b>03</b> 切换到 MySQL 持久化</span></div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <div class="mode-switch">
          <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
          <button :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
        </div>
        <div class="auth-card-heading">
          <h2>{{ mode === 'login' ? '欢迎回来' : '创建学习账号' }}</h2>
          <p>{{ mode === 'login' ? '使用演示账号立即体验完整流程。' : '内存模式重启后会清空注册数据。' }}</p>
        </div>

        <a-form layout="vertical" :model="form" @finish="submit">
          <a-form-item v-if="mode === 'register'" label="昵称" name="name" :rules="[{ required: true, min: 2 }]">
            <a-input v-model:value="form.name" size="large" placeholder="你的昵称" />
          </a-form-item>
          <a-form-item label="邮箱" name="email" :rules="[{ required: true, type: 'email' }]">
            <a-input v-model:value="form.email" size="large" placeholder="you@example.com" />
          </a-form-item>
          <a-form-item label="密码" name="password" :rules="[{ required: true, min: 8 }]">
            <a-input-password v-model:value="form.password" size="large" placeholder="至少 8 位，包含字母和数字" />
          </a-form-item>
          <a-button block type="primary" html-type="submit" size="large" :loading="submitting">
            {{ mode === 'login' ? '进入学习工作台' : '注册并登录' }}
          </a-button>
        </a-form>

        <button class="demo-account" type="button" @click="useDemoAccount">
          <span>演示账号</span>
          <code>student@example.com / Fullstack123!</code>
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(420px, 1.08fr) minmax(400px, 0.92fr);
  background: #f5f7f5;
}

.auth-story {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: 48px clamp(42px, 7vw, 100px);
  color: white;
  background:
    radial-gradient(circle at 84% 15%, rgba(108, 225, 210, 0.28), transparent 24rem),
    linear-gradient(150deg, #102c31 0%, #153c41 54%, #0b2529 100%);
}

.auth-story::after {
  position: absolute;
  right: -160px;
  bottom: -180px;
  width: 520px;
  height: 520px;
  border: 1px solid rgba(152, 231, 220, 0.18);
  border-radius: 50%;
  box-shadow: 0 0 0 70px rgba(152, 231, 220, 0.035), 0 0 0 140px rgba(152, 231, 220, 0.025);
  content: '';
}

.auth-brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 800;
}

.auth-brand span {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: #14363a;
  background: #a8e8de;
  border-radius: 10px;
}

.story-copy {
  position: relative;
  z-index: 1;
  max-width: 650px;
}

.eyebrow.light {
  color: #91d9d1;
}

.story-copy h1 {
  margin: 0 0 24px;
  font-size: clamp(42px, 5vw, 72px);
  line-height: 1.06;
  letter-spacing: -0.055em;
}

.story-copy > p:last-child {
  max-width: 570px;
  margin: 0;
  color: #aac3c5;
  font-size: 17px;
  line-height: 1.8;
}

.story-steps {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
}

.story-steps > div {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #bdd0d2;
}

.story-steps b {
  margin-right: 5px;
  color: #71cfc4;
  font-size: 11px;
}

.auth-panel {
  display: grid;
  place-items: center;
  padding: 40px;
}

.auth-card {
  width: min(430px, 100%);
}

.mode-switch {
  width: fit-content;
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 44px;
  background: #e7ece9;
  border-radius: 10px;
}

.mode-switch button {
  padding: 8px 22px;
  color: #718083;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

.mode-switch button.active {
  color: #19373b;
  background: white;
  box-shadow: 0 3px 10px rgba(30, 55, 58, 0.08);
  font-weight: 700;
}

.auth-card-heading h2 {
  margin: 0;
  color: #183236;
  font-size: 32px;
}

.auth-card-heading p {
  margin: 8px 0 30px;
  color: #78888a;
}

.demo-account {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
  padding: 13px 14px;
  color: #5f7476;
  background: #edf2ef;
  border: 1px dashed #cbd9d4;
  border-radius: 9px;
  cursor: pointer;
  font-size: 12px;
}

.demo-account code {
  color: #167f87;
}

@media (max-width: 900px) {
  .auth-page { grid-template-columns: 1fr; }
  .auth-story { min-height: 380px; padding: 36px 28px; }
  .story-copy h1 { font-size: 42px; }
  .story-steps { display: none; }
  .auth-panel { padding: 48px 24px; }
}
</style>

