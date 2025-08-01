import { type MaterialIconName, type SfSymbolIconName } from "@roninoss/icons"
import { type View, type ViewProps } from "react-native"

export type MaterialIcon = {
	name: MaterialIconName
	namingScheme?: "material" | undefined
	color?: string
}

export type SfSymbolIcon = {
	name: SfSymbolIconName
	namingScheme: "sfSymbol"
	color?: string
}

export type DropdownIcon = SfSymbolIcon | MaterialIcon

export type DropdownItem = {
	actionKey: string
	title?: string
	subTitle?: string
	state?: { checked: boolean }
	keepOpenOnPress?: boolean
	// iOS 14 and above
	loading?: boolean
	destructive?: boolean
	disabled?: boolean
	hidden?: boolean
	// icon or image, not both image has higher priority
	icon?: DropdownIcon
	// icon or image, not both image has higher priority
	image?: {
		url?: string
		cornerRadius?: number
		tint?: string
	}
}

export type DropdownSubMenuDropdown = {
	iOSType?: "dropdown"
	// preferred item size
	iOSItemSize?: "large"
	destructive?: boolean
}

export type DropdownSubMenuInline = {
	iOSType: "inline"
	// preferred item size
	iOSItemSize?: "small" | "medium"
}

export type DropdownSubMenu = (DropdownSubMenuDropdown | DropdownSubMenuInline) & {
	title: string
	// Displayed on iOS 15 and above only, used as accessibility hint otherwise
	subTitle?: string
	// iOS 14 and above only
	loading?: boolean
	// No items shows nothing
	items: (DropdownItem | DropdownSubMenu)[]
}

export type DropdownMenuConfig = {
	title?: string
	items: (DropdownItem | DropdownSubMenu)[]
	// preferred item size
	iOSItemSize?: "small" | "medium" | "large"
}

export type DropdownMenuProps = DropdownMenuConfig &
	ViewProps & {
		children: React.ReactNode
		onItemPress?: (item: Omit<DropdownItem, "icon">, isUsingActionSheetFallback?: boolean) => void
		enabled?: boolean
		materialPortalHost?: string
		// defaults to 2
		materialSideOffset?: number
		materialAlignOffset?: number
		materialAlign?: "start" | "center" | "end"
		materialWidth?: number
		materialMinWidth?: number
		materialLoadingText?: string
		materialSubMenuTitlePlaceholder?: string
		materialOverlayClassName?: string
	}

export type DropdownMenuRef = React.ElementRef<typeof View> & {
	presentMenu?: () => void
	dismissMenu?: () => void
}
