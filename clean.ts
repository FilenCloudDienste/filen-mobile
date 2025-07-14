import fs from "fs"
import path from "path"

export function main() {
	const expoDataPath = path.join(__dirname, ".expo")

	if (fs.existsSync(expoDataPath)) {
		console.log("Cleaning Expo data at:", expoDataPath)

		fs.rmSync(expoDataPath, {
			recursive: true,
			force: true
		})

		console.log("Expo data cleaned successfully.")
	}
}

main()
