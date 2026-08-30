import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    // 编译模板时自动导入真正出现的 a-* 组件；页面动态导入后，组件也会随页面拆包。
    Components({
      // Ant Design Vue 4 的组件样式入口是 CSS-in-JS；旧版 style/css 路径已不存在。
      resolvers: [AntDesignVueResolver({ importStyle: 'css-in-js' })],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // 浏览器只访问 5173；Vite 把 /api 转发到 Express，避免本地开发跨域。
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
