import openAlexTopicsJson from "@/assets/data/openalexTopics.json";

export const openAlexTopics = openAlexTopicsJson.map((topic) => ({
  label: topic.topic_name,
  value: topic.topic_id,
}));
