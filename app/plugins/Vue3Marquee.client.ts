import { Vue3Marquee } from "vue3-marquee";
import { defineNuxtPlugin } from "#app";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component("Vue3Marquee", Vue3Marquee);
});
