import * as Burnt from "burnt"
import { Notifier } from "react-native-notifier"

export class Alerts {
	public error(title: string): void {
		/*Burnt.toast({
			title,
			duration: 3,
			preset: "error",
			shouldDismissByDrag: true,
			from: "bottom",
			haptic: "error"
		})*/

		Notifier.showNotification({
			title: "Error",
			description: title,
			duration: 3000
		})
	}

	public normal(title: string): void {
		Burnt.toast({
			title,
			duration: 3,
			preset: "done",
			shouldDismissByDrag: true,
			from: "bottom",
			haptic: "none"
		})
	}
}

export const alerts = new Alerts()

export default alerts
