import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify("1.5.6"),
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("hls.js")) return "vendor-hls";
            if (id.includes("@google/generative-ai")) return "vendor-ai";
            if (id.includes("firebase")) return "vendor-firebase";
            if (id.includes("@capacitor")) return "vendor-capacitor";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("react") || id.includes("react-dom") || id.includes("zustand")) {
              return "vendor-react";
            }
            return "vendor-common";
          }
        },
      },
    },
  },
});
