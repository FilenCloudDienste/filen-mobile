import { Semaphore } from "./helpers"
import Toast from "react-native-toast-notifications"

declare global {
    var generateThumbnailSemaphore: any;
    var toast: Toast | null;
    var currentReceiverId: undefined | number;
    var visibleItems: any;
}

(global as any).generateThumbnailSemaphore = new Semaphore(3) as any
(global as any).toast = undefined as any
(global as any).currentReceiverId = undefined as any
(global as any).visibleItems = {} as any