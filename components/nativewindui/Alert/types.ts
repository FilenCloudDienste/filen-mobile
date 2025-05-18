import { IconProps, MaterialIconName } from "@roninoss/icons"
import { AlertButton, AlertType, KeyboardType, View } from "react-native"

type AlertInputValue = { login: string; password: string } | string

type AlertProps = {
	title: string
	buttons: (Omit<AlertButton, "onPress"> & { onPress?: (text: AlertInputValue) => void })[]
	message?: string | undefined
	prompt?: {
		type?: Exclude<AlertType, "default"> | undefined
		defaultValue?: string | undefined
		keyboardType?: KeyboardType | undefined
		placeholder?: string
	}
	materialPortalHost?: string
	materialIcon?: Pick<IconProps<"material">, "color" | "size"> & { name: MaterialIconName }
	materialWidth?: number
	children?: React.ReactNode
}

type AlertRef = React.ElementRef<typeof View> & {
	show: () => void
	prompt: (args: AlertProps & { prompt: AlertProps["prompt"] }) => void
	alert: (args: AlertProps) => void
}

export type { AlertInputValue, AlertProps, AlertRef }
