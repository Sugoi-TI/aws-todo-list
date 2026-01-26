import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

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
      } as never,
    }),
  ],
  resolve: {
    alias: {
      "@my-app/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  build: {
    target: "esnext",
  },
});
