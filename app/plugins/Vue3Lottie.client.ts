import { Vue3Lottie } from "vue3-lottie";
import { defineNuxtPlugin } from "#app";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component("Vue3Lottie", Vue3Lottie);
});
