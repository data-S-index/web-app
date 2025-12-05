// With npm:
// npm install meilisearch

// Or with yarn:
// yarn add meilisearch

// In your .js file:
// With the `require` syntax:
// With the `import` syntax:
import { MeiliSearch } from "meilisearch";
import movies from "./movies.json";

const client = new MeiliSearch({
  host: "http://100.123.135.12:42341",
  apiKey: "K8xP2mN9vQ5rT7wY3zA6bC1dE4fG8hJ0kL2mN5pQ8sT1vW4xZ7aB0cD3eF6gH9",
});
client
  .index("movies")
  .addDocuments(movies)
  .then((res) => console.log(res));
