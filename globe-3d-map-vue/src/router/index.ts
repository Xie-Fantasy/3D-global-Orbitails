import { createRouter, createWebHistory } from "vue-router"

const GlobeView = () => import("../views/globe/GlobeView.vue")

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "globe",
      component: GlobeView,
      alias: "/three-3d-globe",
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
})

export default router
