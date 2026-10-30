<script setup lang="ts">
defineProps({
  message: {
    type: String,
    default: "正在准备地球资源",
  },
  progress: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <div class="globe-loading" role="status" aria-live="polite">
    <p class="globe-loading__eyebrow">GLOBAL ORBIT / INITIALIZING</p>
    <strong>{{ message }}</strong>
    <div
      class="globe-loading__progress"
      role="progressbar"
      aria-label="地球资源加载进度"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(progress * 100)"
    >
      <i :style="{ transform: `scaleX(${Math.max(0, Math.min(1, progress))})` }"></i>
    </div>
    <span class="globe-loading__value">
      {{ String(Math.round(progress * 100)).padStart(2, "0") }}%
    </span>
  </div>
</template>
