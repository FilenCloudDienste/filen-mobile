import { useAugmentedRef } from "@rn-primitives/hooks"
import * as Slot from "@rn-primitives/slot"
import { memo, forwardRef, useCallback, useMemo } from "react"
import { AlertButton, Pressable, Alert as RNAlert } from "react-native"
import { AlertProps, AlertRef } from "./types"

export const Alert = memo(
	forwardRef<AlertRef, AlertProps>(({ children, title, buttons, message, prompt }, ref) => {
		const promptAlert = useCallback((args: AlertProps & { prompt: Required<AlertProps["prompt"]> }) => {
			RNAlert.prompt(
				args.title,
				args.message,
				args.buttons as AlertButton[],
				args.prompt?.type,
				args.prompt?.defaultValue,
				args.prompt?.keyboardType
			)
		}, [])

		const alert = useCallback((args: AlertProps) => {
			RNAlert.alert(args.title, args.message, args.buttons as AlertButton[])
		}, [])

		const augmentedRef = useAugmentedRef({
			ref,
			methods: {
				show: () => onPress?.(),
				alert,
				prompt: promptAlert
			},
			deps: [prompt]
		})

		const onPress = useCallback(() => {
			if (prompt) {
				promptAlert({
					title,
					message,
					buttons,
					prompt: prompt as Required<AlertProps["prompt"]>
				})

				return
			}

			alert({
				title,
				message,
				buttons
			})
		}, [prompt, title, message, buttons, promptAlert, alert])

		const Component = useMemo(() => {
			return !children ? Pressable : Slot.Pressable
		}, [children])

		return (
			<Component
				ref={augmentedRef}
				onPress={onPress}
			>
				{children}
			</Component>
		)
	})
)

Alert.displayName = "Alert"

export const AlertAnchor = memo(
	forwardRef<AlertRef>((_, ref) => {
		return (
			<Alert
				ref={ref}
				title=""
				buttons={[]}
			/>
		)
	})
)

AlertAnchor.displayName = "AlertAnchor"
