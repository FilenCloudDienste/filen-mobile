import { Semaphore, SemaphoreInterface } from "./helpers"
import Toast from "react-native-toast-notifications"

declare global {
	var generateThumbnailSemaphore: SemaphoreInterface
	var toast: Toast | null
	var currentReceiverId: number
	var visibleItems: Record<string, boolean>
	var isRequestingPermissions: boolean
}

;(global as any).generateThumbnailSemaphore = new Semaphore(3)
;(global as any).toast = null
;(global as any).currentReceiverId = 0
;(global as any).visibleItems = {}
;(global as any).isRequestingPermissions = false
