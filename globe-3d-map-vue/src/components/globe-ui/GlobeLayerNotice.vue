<script setup lang="ts">
import { t, type GlobeLocale } from "../../i18n/globe"
interface LayerIssue {
  id: string
  label: string
  status: "empty" | "error" | string
}

defineProps<{ issues: LayerIssue[]; locale: GlobeLocale }>()
</script>

<template>
  <aside
    v-if="issues.length"
    class="globe-layer-notice"
    role="status"
    aria-live="polite"
  >
    <strong>{{ t(locale, "layerDegraded") }}</strong>
    <ul>
      <li v-for="issue in issues" :key="issue.id">
        <span>{{ issue.label }}</span>
        <small>{{ issue.status === "empty" ? "EMPTY" : "ERROR" }}</small>
      </li>
    </ul>
  </aside>
</template>
