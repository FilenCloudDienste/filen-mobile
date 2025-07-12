import { ConfigPlugin } from "@expo/config-plugins"
import { withGradleProperties } from "@expo/config-plugins/build/plugins/android-plugins"

export type GradleMemoryOptions = {
	heapSize?: string
	metaspaceSize?: string
}

export const withGradleMemory: ConfigPlugin<GradleMemoryOptions> = (config, options = {}) => {
	const { heapSize = "6g", metaspaceSize = "1g" } = options

	return withGradleProperties(config, config => {
		const { modResults } = config

		// Memory settings
		modResults.push({
			type: "property",
			key: "org.gradle.jvmargs",
			value: `-Xmx${heapSize} -XX:MaxMetaspaceSize=${metaspaceSize} -XX:+HeapDumpOnOutOfMemoryError`
		})

		return config
	})
}

export default withGradleMemory
