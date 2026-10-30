<script setup lang="ts">
import { t, type GlobeLocale } from "../../i18n/globe"

defineProps<{ autoRotate: boolean; interacting?: boolean; locale: GlobeLocale }>()
defineEmits(["toggle-rotate", "reset"])
</script>

<template>
  <aside class="globe-controls" :aria-label="t(locale, 'resetView')">
    <button class="globe-controls__button" :class="{ 'is-active': autoRotate }" type="button" :aria-pressed="autoRotate" @click="$emit('toggle-rotate', !autoRotate)">
      <span class="globe-controls__icon" aria-hidden="true">↻</span>
      <span>{{ autoRotate ? t(locale, "autoRotating") : t(locale, "autoRotate") }}</span>
      <small>{{ interacting ? t(locale, "manualControl") : autoRotate ? "ON" : "OFF" }}</small>
    </button>
    <button class="globe-controls__button" type="button" :title="t(locale, 'resetView')" @click="$emit('reset')">
      <span class="globe-controls__icon" aria-hidden="true">↺</span>
      <span>{{ t(locale, "resetView") }}</span>
      <small>{{ locale === "zh" ? "重置" : "RESET" }}</small>
    </button>
  </aside>
</template>
