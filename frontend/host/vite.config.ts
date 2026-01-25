import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      federation({
        name: "host_app",
        remotes: {
          // in production here we will have links to S3/CloudFront
          todoList: env.VITE_LIST_URL || "http://localhost:5001/assets/remoteEntry.js",
          todoForm: env.VITE_FORM_URL || "http://localhost:5002/assets/remoteEntry.js",
          API_URL: env.VITE_API_URL || "",
          USER_ID: env.VITE_USER_ID || "",
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
          "@aws-amplify/ui-react": {
            singleton: true,
            requiredVersion: false,
          },
        } as never,
      }),
    ],
    build: {
      target: "esnext",
    },
  };
});
