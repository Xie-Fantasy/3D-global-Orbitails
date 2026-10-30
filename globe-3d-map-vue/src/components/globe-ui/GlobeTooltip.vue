<script setup lang="ts">
import { computed } from "vue"
import { t, type GlobeLocale } from "../../i18n/globe"

const props = defineProps<{ location?: any; locale: GlobeLocale }>()
const typeLabel = computed(() => t(props.locale, props.location?.type ?? "connectionNode"))
const coordinateLabel = computed(() => {
  if (!props.location?.coordinate) return ""
  const [longitude, latitude] = props.location.coordinate
  return `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? "N" : "S"} / ${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? "E" : "W"}`
})
</script>

<template>
  <Transition name="globe-tooltip">
    <aside v-if="location" class="globe-tooltip" :class="{ 'is-selected': location.interaction === 'selected' }" aria-live="polite">
      <div class="globe-tooltip__header"><span>{{ location.interaction === "selected" ? t(locale, "nodeLocked") : t(locale, "nodeSignal") }}</span><i aria-hidden="true"></i></div>
      <strong>{{ locale === "zh" ? location.nameZh : location.name }}</strong>
      <small>{{ locale === "zh" ? location.countryZh : location.country }} · {{ typeLabel }}</small>
      <dl>
        <div><dt>{{ t(locale, "connectionIndex") }}</dt><dd>{{ location.value }}</dd></div>
        <div><dt>{{ t(locale, "coordinates") }}</dt><dd>{{ coordinateLabel }}</dd></div>
      </dl>
      <p v-if="location.interaction === 'selected'">{{ t(locale, "selectedHint") }}</p>
    </aside>
  </Transition>
</template>
