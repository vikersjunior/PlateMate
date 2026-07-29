import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/",
  publicDir: "public",

  build: {
    outDir: "../dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        mealPlanner: resolve(__dirname, "src/meal-planner/index.html"),
        favorites: resolve(__dirname, "src/favorites/index.html"),
      },
    },
  },
});
