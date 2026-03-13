import path from "path"
import react from "@vitejs/plugin-react"
import type { Plugin } from "vite"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import aiHandler from "./api/ai"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")
  Object.assign(process.env, env)

  const localAiApi: Plugin = {
    name: "local-ai-api",
    configureServer(server) {
      server.middlewares.use("/api/ai", (req, res, next) => {
        if (req.method !== "POST") {
          next()
          return
        }
        aiHandler(req, res)
      })
    },
  }

  return {
    base: './',
    plugins: [inspectAttr(), react(), localAiApi],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
