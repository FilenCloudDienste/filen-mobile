import fs from "fs"
import path from "path"

function argon2() {
	const argon2PrebuildsPath = path.join(__dirname, "prebuilds", "argon2")

	if (!fs.existsSync(argon2PrebuildsPath)) {
		console.error("Prebuilds directory does not exist:", argon2PrebuildsPath)

		process.exit(1)
	}

	const prebuilds = fs.readdirSync(argon2PrebuildsPath)

	if (prebuilds.length === 0) {
		console.error("No prebuilds found in directory:", argon2PrebuildsPath)

		process.exit(1)
	}

	console.log(`Found ${prebuilds.length} prebuilds in ${argon2PrebuildsPath}`)

	const destinationPath = path.join(__dirname, "nodejs-assets", "nodejs-project", "node_modules", "argon2", "prebuilds")

	if (!fs.existsSync(destinationPath)) {
		console.error("Destination directory does not exist:", destinationPath, "forgot to run npm install?")

		process.exit(1)
	}

	fs.rmSync(destinationPath, {
		recursive: true,
		force: true
	})

	fs.mkdirSync(destinationPath, {
		recursive: true
	})

	prebuilds.forEach(prebuild => {
		const source = path.join(argon2PrebuildsPath, prebuild)

		if (!fs.statSync(source).isDirectory()) {
			return
		}

		const dest = path.join(destinationPath, prebuild)

		if (fs.existsSync(dest)) {
			fs.rmSync(dest, {
				recursive: true,
				force: true
			})

			console.log(`Removed existing prebuild directory: ${dest}`)
		}

		fs.cpSync(source, dest, {
			recursive: true
		})

		console.log(`Copied ${prebuild} to ${destinationPath}`)
	})
}

function main() {
	console.log("Installing prebuilds...")

	argon2()

	console.log("Prebuilds installation completed successfully.")
}

main()
