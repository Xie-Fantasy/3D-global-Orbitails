import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
  plugins: [vue()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "three",
              test: /node_modules[\\/]three[\\/]/,
              priority: 40,
              maxSize: 420_000,
            },
            {
              name: "motion",
              test: /node_modules[\\/]gsap[\\/]/,
              priority: 30,
            },
            {
              name: "geo",
              test: /node_modules[\\/](?:d3-geo|topojson-client|world-atlas)[\\/]/,
              priority: 30,
            },
            {
              name: "vue",
              test: /node_modules[\\/](?:@vue|vue|vue-router)[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
})
