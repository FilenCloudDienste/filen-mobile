import fs from "fs"
import path from "path"

export function main() {
	const xcodeDerivedDataPath = path.join(process.env.HOME || "", "Library", "Developer", "Xcode", "DerivedData")
	const expoDataPath = path.join(__dirname, ".expo")
	const gradleCachePath = path.join(process.env.HOME || "", ".gradle")
	const rustPath = path.join(__dirname, "rust")

	if (fs.existsSync(xcodeDerivedDataPath)) {
		console.log("Cleaning Xcode Derived Data at:", xcodeDerivedDataPath)

		fs.rmSync(xcodeDerivedDataPath, {
			recursive: true,
			force: true
		})

		console.log("Xcode Derived Data cleaned successfully.")
	}

	if (fs.existsSync(expoDataPath)) {
		console.log("Cleaning Expo data at:", expoDataPath)

		fs.rmSync(expoDataPath, {
			recursive: true,
			force: true
		})

		console.log("Expo data cleaned successfully.")
	}

	if (fs.existsSync(gradleCachePath)) {
		console.log("Cleaning Gradle cache at:", gradleCachePath)

		fs.rmSync(gradleCachePath, {
			recursive: true,
			force: true
		})

		console.log("Gradle cache cleaned successfully.")
	}

	if (fs.existsSync(rustPath)) {
		console.log("Cleaning Rust build artifacts at:", rustPath)

		fs.rmSync(rustPath, {
			recursive: true,
			force: true
		})

		console.log("Rust build artifacts cleaned successfully.")
	}
}

main()
