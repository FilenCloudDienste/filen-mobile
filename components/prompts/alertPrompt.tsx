import { Alert } from "../nativewindui/Alert"
import { memo, useRef, useEffect, useState, useMemo } from "react"
import type { AlertRef, AlertProps, AlertInputValue } from "../nativewindui/Alert/types"
import type { AlertButton } from "react-native"
import events from "@/lib/events"
import { randomUUID } from "expo-crypto"
import { translateMemoized } from "@/lib/i18n"

export type AlertPromptParams = DistributiveOmit<AlertProps, "buttons" | "children"> & {
	id: string
	cancelText?: string
	okText?: string
}

export type AlertPromptResponse =
	| {
			cancelled: false
	  }
	| {
			cancelled: true
	  }

export type AlertPromptEvent =
	| {
			type: "request"
			data: AlertPromptParams
	  }
	| {
			type: "response"
			data: {
				id: string
			} & AlertPromptResponse
	  }

export function alertPrompt(params: DistributiveOmit<AlertPromptParams, "id">): Promise<AlertPromptResponse> {
	return new Promise<AlertPromptResponse>(resolve => {
		const id = randomUUID()

		const sub = events.subscribe("alertPrompt", e => {
			if (e.type === "response" && e.data.id === id) {
				sub.remove()

				resolve(e.data)
			}
		})

		events.emit("alertPrompt", {
			type: "request",
			data: {
				...params,
				id
			}
		})
	})
}

export const AlertPrompt = memo(() => {
	const alertRef = useRef<AlertRef>(null)
	const [state, setState] = useState<AlertPromptParams>({
		id: "none",
		title: translateMemoized("alertPrompt.defaults.title"),
		okText: translateMemoized("alertPrompt.defaults.okText"),
		cancelText: translateMemoized("alertPrompt.defaults.cancelText")
	})

	const buttons = useMemo((): (Omit<AlertButton, "onPress"> & {
		onPress?: (text: AlertInputValue) => void
	})[] => {
		return [
			{
				text: state.cancelText ?? translateMemoized("alertPrompt.defaults.cancelText"),
				style: "cancel",
				onPress: () => {
					events.emit("alertPrompt", {
						type: "response",
						data: {
							id: state.id,
							cancelled: true
						}
					})
				}
			},
			{
				text: state.okText ?? translateMemoized("alertPrompt.defaults.okText"),
				onPress: () => {
					events.emit("alertPrompt", {
						type: "response",
						data: {
							id: state.id,
							cancelled: false
						}
					})
				}
			}
		]
	}, [state.id, state.cancelText, state.okText])

	useEffect(() => {
		const sub = events.subscribe("alertPrompt", e => {
			if (e.type === "request") {
				setState(e.data)

				setTimeout(() => alertRef?.current?.show(), 100)
			}
		})

		return () => {
			sub.remove()
		}
	}, [])

	return (
		<Alert
			key={state.id}
			ref={alertRef}
			title={state.title}
			message={state.message}
			materialIcon={state.materialIcon}
			materialWidth={state.materialWidth ?? 370}
			materialPortalHost={state.materialPortalHost}
			buttons={buttons}
		/>
	)
})

AlertPrompt.displayName = "AlertPrompt"

export default AlertPrompt
