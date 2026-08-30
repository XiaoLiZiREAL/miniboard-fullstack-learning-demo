<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'

const theme = {
  token: {
    colorPrimary: '#167f87',
    colorInfo: '#167f87',
    colorSuccess: '#3f8f66',
    colorWarning: '#c6832b',
    colorError: '#c75050',
    borderRadius: 10,
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
}
</script>

<template>
  <a-config-provider :locale="zhCN" :theme="theme">
    <router-view />
  </a-config-provider>
</template>

