import { defineConfig, loadEnv } from "vite";
import mkcert from "vite-plugin-mkcert";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const port = Number(env.VITE_DEV_SERVER_PORT) || 5173;
  const infinityTarget = env.VITE_INFINITY_TARGET;

  const manifestContent = {
    images: {},
    translations: {},
    plugins: [
      {
        src: `https://localhost:${port}`,
        sandboxValues: ["allow-same-origin", "allow-downloads", "allow-popups"],
        id: "recording-rtmp"
      },
    ],
  };
  const manifest = JSON.stringify(manifestContent);

  if (mode === "development") {
    if (!infinityTarget) {
      console.error(
        "\n❌ Configuration Error: Missing Pexip Infinity URL ❌\n",
      );
      console.error(
        "To run the dev server, create a .env file in the project root with:\n",
      );
      console.error(
        "VITE_INFINITY_TARGET=https://your-pexip-infinity-server.com\n",
      );
      console.error(
        "See .env.example for reference or README.md for details.\n",
      );
      throw new Error("VITE_INFINITY_TARGET is not defined in .env file");
    }
  }

  return {
    base: "./",
    build: {
      target: "esnext",
      assetsInlineLimit: 0,
      rollupOptions: {
        input: ["./index.html"],
        output: {
          entryFileNames: `assets/[name].js`,
          assetFileNames: (assetInfo) => {
            // Rename .mjs worker files to .js to avoid MIME type issues
            if (assetInfo.name && assetInfo.name.endsWith(".mjs")) {
              return "assets/[name]-[hash].js";
            }
            return "assets/[name]-[hash][extname]";
          },
        },
      },
    },
    plugins: [
      mkcert(),
      // Inline manifest.json: serve in dev
      {
        name: "inline-manifest",
        apply: "serve", // only during dev
        configureServer(server) {
          server.middlewares.use(
            "/webapp3/branding/manifest.json",
            (req, res) => {
              res.setHeader("Content-Type", "application/json");
              res.end(manifest);
            },
          );
          server.middlewares.use(
            "/jens-recording/branding/manifest.json",
            (req, res) => {
              res.setHeader("Content-Type", "application/json");
              res.end(manifest);
            },
          );
          // Set correct MIME type for .mjs files
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.endsWith(".mjs")) {
              res.setHeader("Content-Type", "application/javascript");
            }
            next();
          });
        },
      },
    ],

    server: {
      open: "/webapp3/",
      allowedHosts: ["localhost"],
      host: "localhost",
      strictPort: true,
      port: port,
      hmr: {
        host: new URL(infinityTarget).hostname,
        protocol: "wss",
        port: port,
        clientPort: port,
      },
      proxy: {
        "/api": {
          target: infinityTarget,
          changeOrigin: true,
          secure: false,
        },
        "/webapp3": {
          target: infinityTarget,
          changeOrigin: true,
          secure: false,
        }
      },
    },
  };
});

