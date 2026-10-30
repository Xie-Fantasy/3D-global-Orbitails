<script setup lang="ts">
defineProps({
  message: {
    type: String,
    default: "3D 地球初始化失败",
  },
})

defineEmits(["retry"])
</script>

<template>
  <div class="globe-error" role="alert">
    <p class="globe-error__eyebrow">RUNTIME ERROR</p>
    <h2>无法启动 3D 地球</h2>
    <p>{{ message }}</p>
    <button type="button" @click="$emit('retry')">重新初始化</button>
  </div>
</template>
