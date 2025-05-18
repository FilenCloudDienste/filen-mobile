import { getShareExtensionKey } from "expo-share-intent"

export function redirectSystemPath({ path }: { path: string; initial: string }) {
	try {
		if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
			return "/shareIntent"
		}

		return path
	} catch {
		return "/"
	}
}
