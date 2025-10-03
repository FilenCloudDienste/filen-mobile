import { Alert } from "../nativewindui/Alert"
import { memo, useRef, useEffect, useState, useMemo } from "react"
import type { AlertRef, AlertProps, AlertInputValue } from "../nativewindui/Alert/types"
import type { AlertButton } from "react-native"
import events from "@/lib/events"
import { randomUUID } from "expo-crypto"
import { useTranslation } from "react-i18next"

export type InputPromptParams = DistributiveOmit<AlertProps, "buttons" | "children"> & {
	id: string
}

export type InputPromptResponseFields =
	| {
			type: "login"
			login: string
			password: string
	  }
	| {
			type: "text"
			text: string
	  }

export type InputPromptResponse =
	| ({
			cancelled: false
	  } & InputPromptResponseFields)
	| {
			cancelled: true
	  }

export type InputPromptEvent =
	| {
			type: "request"
			data: InputPromptParams
	  }
	| {
			type: "response"
			data: {
				id: string
			} & InputPromptResponse
	  }

export function inputPrompt(params: DistributiveOmit<InputPromptParams, "id">): Promise<InputPromptResponse> {
	return new Promise<InputPromptResponse>(resolve => {
		const id = randomUUID()

		const sub = events.subscribe("inputPrompt", e => {
			if (e.type === "response" && e.data.id === id) {
				sub.remove()

				resolve(e.data)
			}
		})

		events.emit("inputPrompt", {
			type: "request",
			data: {
				...params,
				id
			}
		})
	})
}

export const InputPrompt = memo(() => {
	const alertRef = useRef<AlertRef>(null)
	const { t } = useTranslation()
	const [state, setState] = useState<InputPromptParams>({
		id: "none",
		title: t("inputPrompt.defaults.title")
	})

	const buttons = useMemo((): (Omit<AlertButton, "onPress"> & {
		onPress?: (text: AlertInputValue) => void
	})[] => {
		return [
			{
				text: t("inputPrompt.defaults.cancelText"),
				style: "cancel",
				onPress: () => {
					events.emit("inputPrompt", {
						type: "response",
						data: {
							id: state.id,
							cancelled: true
						}
					})
				}
			},
			{
				text: t("inputPrompt.defaults.okText"),
				onPress: text => {
					events.emit("inputPrompt", {
						type: "response",
						data: {
							id: state.id,
							cancelled: false,
							...(typeof text !== "string"
								? {
										type: "login",
										login: text.login,
										password: text.password
								  }
								: {
										type: "text",
										text
								  })
						}
					})
				}
			}
		]
	}, [state.id, t])

	useEffect(() => {
		const sub = events.subscribe("inputPrompt", e => {
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
			prompt={state.prompt}
			buttons={buttons}
		/>
	)
})

InputPrompt.displayName = "InputPrompt"

export default InputPrompt
