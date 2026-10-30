<script setup lang="ts">
import type { GlobeLocale } from "../../i18n/globe"

defineProps<{ current: GlobeLocale }>()
defineEmits(["select"])
</script>

<template>
  <aside class="language-switcher" aria-label="LANGUAGE">
    <span class="language-switcher__label">LANGUAGE</span>
    <div>
      <button type="button" :class="{ 'is-active': current === 'en' }" :aria-pressed="current === 'en'" @click="$emit('select', 'en')">EN</button>
      <button type="button" :class="{ 'is-active': current === 'zh' }" :aria-pressed="current === 'zh'" @click="$emit('select', 'zh')">中文</button>
    </div>
  </aside>
</template>
