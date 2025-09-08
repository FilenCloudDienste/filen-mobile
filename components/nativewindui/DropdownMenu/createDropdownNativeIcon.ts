import { Platform } from "react-native"
import { DropdownIcon } from "./types"
import { type MaterialIconName, ICON_MAPPING, SfSymbolIconName } from "@roninoss/icons"

type Props = {
	name: MaterialIconName
	sfName?: SfSymbolIconName
	color?: string
}

const isIOS = Platform.OS === "ios"

export const createDropdownNativeIcon = ({ name, sfName, color }: Props): DropdownIcon =>
	isIOS
		? {
				namingScheme: "sfSymbol",
				name: sfName ?? ICON_MAPPING[name]?.sfSymbol ?? "questionmark",
				color
			}
		: {
				namingScheme: "material",
				name,
				color
			}
