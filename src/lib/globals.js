import { Semaphore } from "./helpers"

global.generateThumbnailSemaphore = new Semaphore(3)
global.cachedThumbnailPaths = {}
global.items = undefined
global.setItems = undefined
global.fetchItemList = undefined
global.backgroundTimerStarted = false
global.currentReceiverId = undefined
global.visibleItems = {}