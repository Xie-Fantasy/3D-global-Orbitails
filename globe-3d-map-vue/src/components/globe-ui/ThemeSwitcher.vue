<script setup lang="ts">
import { t, type GlobeLocale } from "../../i18n/globe"

interface ThemeItem { id: string; label: string; swatch: string }
defineProps<{ themes: ThemeItem[]; current: string; accent: string; locale: GlobeLocale }>()
defineEmits(["select", "select-custom"])
function onCustomColorInput(event: Event) { return (event.target as HTMLInputElement).value }
</script>

<template>
  <aside class="theme-switcher" :aria-label="t(locale, 'colorSystem')">
    <span class="theme-switcher__label">{{ t(locale, "colorSystem") }}</span>
    <div class="theme-switcher__options">
      <button v-for="theme in themes" :key="theme.id" class="theme-switcher__button" :class="{ 'is-active': current === theme.id }" type="button" :style="{ '--theme-swatch': theme.swatch }" :aria-label="theme.label" :aria-pressed="current === theme.id" :title="theme.label" @click="$emit('select', theme.id)"><span aria-hidden="true"></span></button>
      <label class="theme-switcher__picker" :title="t(locale, 'customColor')">
        <input type="color" :value="accent" :aria-label="t(locale, 'customColor')" @input="$emit('select-custom', onCustomColorInput($event))" />
        <span aria-hidden="true">+</span>
      </label>
    </div>
  </aside>
</template>
