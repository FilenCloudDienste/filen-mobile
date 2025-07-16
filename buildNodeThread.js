// eslint-disable-next-line @typescript-eslint/no-require-imports
const esbuild = require("esbuild")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs")

if (fs.existsSync("./nodejs-assets/nodejs-project/bundle.js")) {
	fs.rmSync("./nodejs-assets/nodejs-project/bundle.js", {
		force: true
	})
}

esbuild
	.build({
		entryPoints: ["./nodejs-assets/nodejs-project/src/index.ts"],
		bundle: true,
		outfile: "./nodejs-assets/nodejs-project/bundle.js",
		platform: "node",
		target: ["node18"],
		format: "cjs",
		sourcemap: false,
		minify: true,
		tsconfig: "./nodejs-assets/nodejs-project/tsconfig.json"
	})
	.then(result => {
		console.log(result)

		console.log("Build success!")
	})
	.catch(() => process.exit(1))
