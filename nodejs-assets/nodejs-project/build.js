const esbuild = require("esbuild")

// Define build options
esbuild
	.build({
		entryPoints: ["./src/index.ts"], // Replace with your entry point
		bundle: true,
		outfile: "./bundle.js", // Output file
		platform: "node", // Target platform is Node.js
		target: ["node18"], // Specify the Node.js version you're targeting
		format: "cjs", // CommonJS format for Node.js
		sourcemap: false, // Enable source maps
		minify: true, // Optional: minify the output
		tsconfig: "./tsconfig.json", // Path to your TypeScript config file (if using TypeScript),
		external: ["react-native-fs"]
	})
	.then(() => {
		console.log("Build success!")
	})
	.catch(() => process.exit(1))
