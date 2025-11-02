<script setup lang="ts">
const route = useRoute();
const toast = useToast();

const { datasetid } = route.params as { datasetid: string };

const { data: datasetData, error } = await useFetch(
  `/api/datasets/${datasetid}`,
);

if (error.value) {
  toast.add({
    title: "Error fetching dataset",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

if (datasetData.value) {
  console.log(datasetData.value);
}
</script>

<template>
  <div>
    {{ datasetData }}
  </div>
</template>
