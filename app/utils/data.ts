import openAlexTopicsJson from "@/assets/data/openalexTopics.json";

export const openAlexTopics = openAlexTopicsJson
  .map((topic) => ({
    label: topic.subfield_name,
    value: topic.subfield_id,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));
