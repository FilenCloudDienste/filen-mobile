import * as Burnt from "burnt"

export class Alerts {
	public error(title: string): void {
		Burnt.toast({
			title,
			duration: 3,
			preset: "error",
			shouldDismissByDrag: true,
			from: "bottom",
			haptic: "error"
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
