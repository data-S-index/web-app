<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
import sanitizeHtml from "sanitize-html";
import { parse, marked } from "marked";

marked.use({
  pedantic: false,
  gfm: true,
  breaks: false,
});

const renderedMarkdown = ref("");

const props = defineProps({
  content: {
    default: "",
    type: String,
  },
  truncate: {
    default: false,
    type: Boolean,
  },
});

const sanitize = (html: string) => sanitizeHtml(html);

const convertMarkdownToHtml = async (
  markdown: string = "No content provided",
) => {
  return sanitize(await parse(markdown));
};

if (props.content) {
  renderedMarkdown.value = await convertMarkdownToHtml(props.content);
}
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="prose prose-md prose-li:text-base max-w-none pt-2 text-gray-900 dark:text-gray-100"
    :class="{ 'line-clamp-3': truncate }"
    v-html="renderedMarkdown"
  />
</template>
