import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const wienOgd = {
  target: "https://data.wien.gv.at",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/ogd/u, ""),
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/ogd": wienOgd } },
  preview: { proxy: { "/ogd": wienOgd } },
});
