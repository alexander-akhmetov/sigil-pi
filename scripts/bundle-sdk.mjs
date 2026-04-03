#!/usr/bin/env node
// Bundles the Sigil SDK into a single file, stubbing out gRPC and
// provider/framework modules that sigil-pi doesn't use.
import { build } from "esbuild";

const stubPlugin = {
  name: "stub-unused",
  setup(build) {
    const stubs = [
      "@grpc/grpc-js",
      "@grpc/proto-loader",
      "@anthropic-ai/sdk",
      "openai",
      "@langchain/core",
      "@langchain/langgraph",
      "llamaindex",
      "@google/genai",
      "@google/adk",
      "@openai/agents",
    ];
    const filter = new RegExp(
      `^(${stubs.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    );
    build.onResolve({ filter }, (args) => ({
      path: args.path,
      namespace: "stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "export default {}; export {};",
      loader: "js",
    }));
  },
};

const sdkSrc = process.argv[2] || "../sigil-sdk/js/dist/index.js";
const outfile =
  process.argv[3] || "vendor/sigil-sdk-js/dist/index.js";

await build({
  entryPoints: [sdkSrc],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile,
  external: ["@opentelemetry/*"],
  plugins: [stubPlugin],
  treeShaking: true,
});

console.log(`Bundled SDK → ${outfile}`);
