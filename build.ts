import tailwind from "bun-plugin-tailwind";

await Bun.$`rm -rf dist-renderer`;
const result = await Bun.build({
  entrypoints: ["src/renderer/index.html"],
  outdir: "dist-renderer",
  minify: true,
  plugins: [tailwind],
});
if (!result.success) {
  console.error(...result.logs);
  process.exit(1);
}
