<script setup lang="ts">
import { t, type GlobeLocale } from "../../i18n/globe"
interface TextureMode { id: string; label: string; caption: string }
withDefaults(defineProps<{ modes: TextureMode[]; current: string; locale: GlobeLocale; disabled?: boolean }>(), { disabled: false })
defineEmits(["select"])
</script>

<template>
  <aside class="texture-switcher" :aria-label="t(locale, 'earthSurface')">
    <span class="texture-switcher__label">{{ t(locale, "earthSurface") }}</span>
    <div class="texture-switcher__options">
      <button v-for="mode in modes" :key="mode.id" type="button" :class="{ 'is-active': current === mode.id }" :aria-pressed="current === mode.id" :disabled="disabled" @click="$emit('select', mode.id)"><span>{{ mode.label }}</span><small>{{ mode.caption }}</small></button>
    </div>
  </aside>
</template>
