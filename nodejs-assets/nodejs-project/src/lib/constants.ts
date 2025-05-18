export { ANONYMOUS_SDK_CONFIG } from "@filen/sdk"

export const FS_RM_OPTIONS = {
	force: true,
	maxRetries: 60 * 10,
	recursive: true,
	retryDelay: 100
} as const
