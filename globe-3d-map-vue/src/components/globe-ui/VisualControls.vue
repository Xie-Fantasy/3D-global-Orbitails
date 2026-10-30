<script setup lang="ts">
import { t, type GlobeLocale } from "../../i18n/globe"

defineProps<{ haloDensity: number; starDensity: number; locale: GlobeLocale }>()
defineEmits(["update:halo-density", "update:star-density"])

function rangeValue(event: Event) {
  return Number((event.target as HTMLInputElement).value)
}
</script>

<template>
  <aside class="visual-controls" :aria-label="t(locale, 'visualDensity')">
    <p class="visual-controls__eyebrow">{{ t(locale, "visualDensity") }}</p>
    <label class="visual-controls__row">
      <span>
        <strong>{{ t(locale, "particleHalo") }}</strong>
        <small>{{ haloDensity }}% · {{ t(locale, "quantitySpread") }}</small>
      </span>
      <input type="range" min="25" max="250" step="1" :value="haloDensity" :aria-label="t(locale, 'particleHalo')" @input="$emit('update:halo-density', rangeValue($event))" />
    </label>
    <label class="visual-controls__row">
      <span>
        <strong>{{ t(locale, "starfield") }}</strong>
        <small>{{ starDensity }}% · {{ t(locale, "quantitySpread") }}</small>
      </span>
      <input type="range" min="25" max="250" step="1" :value="starDensity" :aria-label="t(locale, 'starfield')" @input="$emit('update:star-density', rangeValue($event))" />
    </label>
  </aside>
</template>
