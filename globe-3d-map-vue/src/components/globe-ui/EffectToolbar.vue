<script setup lang="ts">
import { t, type GlobeLocale } from "../../i18n/globe"
interface LayerItem {
  id: string
  label: string
  visible: boolean
  status: string
  error?: string | null
  tone?: string
}

defineProps<{
  baseLayers: LayerItem[]
  dataLayers: LayerItem[]
  locale: GlobeLocale
}>()

defineEmits(["toggle"])

function getStatusLabel(item: LayerItem, locale: GlobeLocale) {
  if (item.status === "ready") {
    return item.visible ? t(locale, "on") : t(locale, "off")
  }
  if (item.status === "empty") {
    return t(locale, "empty")
  }
  if (item.status === "error") {
    return t(locale, "error")
  }
  return t(locale, "wait")
}

function getStatusTitle(item: LayerItem, locale: GlobeLocale) {
  if (item.status === "empty") {
    return `${item.label}: ${t(locale, "noData")}`
  }
  if (item.status === "error") {
    return `${item.label}: ${t(locale, "loadFailed")}`
  }
  return undefined
}
</script>

<template>
  <aside class="effect-toolbar" :aria-label="t(locale, 'sceneLayers')">
    <div class="effect-toolbar__section">
      <p class="effect-toolbar__eyebrow">{{ t(locale, "sceneLayers") }}</p>
      <button
        v-for="item in baseLayers"
        :key="item.id"
        class="effect-toolbar__button"
        :class="{
          'is-active': item.visible,
          'is-degraded': item.status === 'empty' || item.status === 'error',
        }"
        type="button"
        :aria-pressed="item.visible"
        :disabled="item.status !== 'ready'"
        :title="getStatusTitle(item, locale)"
        @click="$emit('toggle', item.id, !item.visible)"
      >
        <span class="effect-toolbar__indicator" aria-hidden="true"></span>
        <span>{{ item.label }}</span>
        <span class="effect-toolbar__state">{{ getStatusLabel(item, locale) }}</span>
      </button>
    </div>

    <div class="effect-toolbar__section effect-toolbar__section--data">
      <p class="effect-toolbar__eyebrow">{{ t(locale, "dataLayers") }}</p>
      <button
        v-for="item in dataLayers"
        :key="item.id"
        class="effect-toolbar__button"
        :class="{
          'is-active': item.visible,
          'is-degraded': item.status === 'empty' || item.status === 'error',
        }"
        type="button"
        :data-tone="item.tone"
        :aria-pressed="item.status === 'ready' ? item.visible : undefined"
        :disabled="item.status !== 'ready'"
        :title="getStatusTitle(item, locale)"
        @click="$emit('toggle', item.id, !item.visible)"
      >
        <span class="effect-toolbar__indicator" aria-hidden="true"></span>
        <span>{{ item.label }}</span>
        <span class="effect-toolbar__state">
          {{ getStatusLabel(item, locale) }}
        </span>
      </button>
    </div>
  </aside>
</template>
