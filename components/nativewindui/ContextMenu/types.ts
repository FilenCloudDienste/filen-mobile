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

export type ContextMenuIcon = SfSymbolIcon | MaterialIcon

export type ContextItem = {
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
	icon?: ContextMenuIcon
	// icon or image, not both image has higher priority
	image?: { url?: string; cornerRadius?: number; tint?: string }
}

export type ContextMenuSubMenuDropdown = {
	iOSType?: "dropdown"
	// preferred item size
	iOSItemSize?: "large"
	destructive?: boolean
}

export type ContextMenuSubMenuInline = {
	iOSType: "inline"
	// preferred item size
	iOSItemSize?: "small" | "medium"
}

export type ContextSubMenu = (ContextMenuSubMenuDropdown | ContextMenuSubMenuInline) & {
	title: string
	// Displayed on iOS 15 and above only, used as accessibility hint otherwise
	subTitle?: string
	// iOS 14 and above only
	loading?: boolean
	// No items shows nothing
	items: (ContextItem | ContextSubMenu)[]
}

export type ContextMenuConfig = {
	title?: string
	items: (ContextItem | ContextSubMenu)[]
	// preferred item size
	iOSItemSize?: "small" | "medium" | "large"
}

export type ContextMenuProps = ContextMenuConfig &
	ViewProps & {
		children: React.ReactNode
		onItemPress?: (item: Omit<ContextItem, "icon">, isUsingActionSheetFallback?: boolean) => void
		enabled?: boolean
		iosRenderPreview?: () => React.ReactElement
		iosOnPressMenuPreview?: () => void
		renderAuxiliaryPreview?: () => React.ReactElement
		auxiliaryPreviewPosition?: "start" | "center" | "end"
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

export type ContextMenuRef = React.ElementRef<typeof View> & {
	presentMenu?: () => void
	dismissMenu?: () => void
}
