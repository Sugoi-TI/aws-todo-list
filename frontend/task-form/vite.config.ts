import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "task_form_app",
      filename: "remoteEntry.js",
      exposes: {
        "./TaskForm": "./src/task-form.tsx",
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: false,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: false,
        },
        "aws-amplify": {
          singleton: true,
          requiredVersion: false,
        },
        "@my-app/frontend-shared": {
          singleton: true,
          import: false,
          requiredVersion: false,
        },
        zustand: {
          singleton: true,
        },
      } as never,
    }),
  ],
  build: {
    target: "esnext",
  },
});
