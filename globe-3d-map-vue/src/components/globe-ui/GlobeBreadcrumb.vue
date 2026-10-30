<script setup lang="ts">
interface PresetItem {
  id: string
  label: string
  caption: string
}

withDefaults(
  defineProps<{
    presets: PresetItem[]
    current?: string
  }>(),
  { current: "global" }
)

defineEmits(["select"])
</script>

<template>
  <nav class="globe-presets" aria-label="地球视角预设">
    <button
      v-for="preset in presets"
      :key="preset.id"
      class="globe-presets__button"
      :class="{ 'is-active': preset.id === current }"
      type="button"
      :aria-current="preset.id === current ? 'true' : undefined"
      @click="$emit('select', preset.id)"
    >
      <span>{{ preset.label }}</span>
      <small>{{ preset.caption }}</small>
    </button>
  </nav>
</template>
