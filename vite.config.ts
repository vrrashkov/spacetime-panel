import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/generated": resolve(__dirname, "./src/generated"),
    },
    dedupe: ["react", "react-dom"],
  },
  define: {
    global: "globalThis",
    "process.env": process.env,
  },
  server: {
    port: 3001,
  },
});
