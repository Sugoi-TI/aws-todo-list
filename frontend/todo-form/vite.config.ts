import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "todo_form_app",
      filename: "remoteEntry.js",
      exposes: {
        "./TodoForm": "./src/TodoForm",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  build: {
    target: "esnext", // important for top-level await
  },
});
