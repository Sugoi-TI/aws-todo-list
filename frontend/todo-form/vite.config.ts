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
