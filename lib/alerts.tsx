import * as Burnt from "burnt"
import { Notifier, NotifierComponents } from "react-native-notifier"
import { View } from "react-native"
import useDimensions from "@/hooks/useDimensions"
import { memo } from "react"

export const NotifierErrorContainer = memo(({ children }: { children: React.ReactNode }) => {
	const { insets } = useDimensions()

	return (
		<View
			style={{
				paddingTop: insets.top,
				backgroundColor: "rgb(255, 59, 48)",
				zIndex: 1000,
				position: "absolute",
				top: 0,
				left: 0,
				right: 0
			}}
		>
			{children}
		</View>
	)
})

NotifierErrorContainer.displayName = "NotifierErrorContainer"

export class Alerts {
	public error(title: string): void {
		Notifier.showNotification({
			title: "Error",
			description: title,
			duration: 3000,
			Component: NotifierComponents.Alert,
			componentProps: {
				alertType: "error",
				ContainerComponent: NotifierErrorContainer,
				maxDescriptionLines: 10,
				maxTitleLines: 1
			},
			containerStyle: {
				zIndex: 1000
			}
		})
	}

	public nativeError(title: string): void {
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
