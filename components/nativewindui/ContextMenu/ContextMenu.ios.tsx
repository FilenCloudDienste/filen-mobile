import { ICON_MAPPING, type MaterialIconName } from "@roninoss/icons"
import { cssInterop } from "nativewind"
import { memo, forwardRef } from "react"
import { View } from "react-native"
// @ts-expect-error Types exported wrong
// eslint-disable-next-line import/no-unresolved
import { ContextMenuView, MenuAttributes, MenuConfig, MenuElementConfig, OnPressMenuItemEvent } from "react-native-ios-context-menu"
import type { ContextItem, ContextMenuConfig, ContextMenuProps, ContextMenuRef, ContextSubMenu } from "./types"

cssInterop(ContextMenuView, {
	className: "style"
})

export const PREVIEW_CONFIG = {
	previewSize: "INHERIT",
	preferredCommitStyle: "dismiss",
	isResizeAnimated: true,
	previewType: "CUSTOM"
} as const

export function getAuxiliaryPreviewPosition(position: "start" | "center" | "end") {
	switch (position) {
		case "start":
			return "targetLeading"
		case "center":
			return "targetCenter"
		case "end":
			return "targetTrailing"
	}
}

export function getAuxiliaryPreviewConfig(position: "start" | "center" | "end") {
	return {
		verticalAnchorPosition: "automatic",
		horizontalAlignment: getAuxiliaryPreviewPosition(position),
		transitionConfigEntrance: {
			mode: "syncedToMenuEntranceTransition",
			shouldAnimateSize: false
		},
		transitionExitPreset: {
			mode: "zoomAndSlide"
		}
	} as const
}

export const ContextMenu = memo(
	forwardRef<ContextMenuRef, ContextMenuProps>(
		(
			{
				items,
				title,
				iOSItemSize = "large",
				onItemPress,
				enabled = true,
				iosRenderPreview,
				iosOnPressMenuPreview,
				renderAuxiliaryPreview,
				auxiliaryPreviewPosition = "start",
				materialPortalHost: _materialPortalHost,
				materialSideOffset: _materialSideOffset,
				materialAlignOffset: _materialAlignOffset,
				materialAlign: _materialAlign,
				materialWidth: _materialWidth,
				materialMinWidth: _materialMinWidth,
				materialLoadingText: _materialLoadingText,
				materialSubMenuTitlePlaceholder: _materialSubMenuTitlePlaceholder,
				materialOverlayClassName: _materialOverlayClassName,
				...props
			},
			ref
		) => {
			return (
				<View>
					<ContextMenuView
						ref={ref as React.LegacyRef<ContextMenuView>}
						isContextMenuEnabled={enabled}
						menuConfig={toConfigMenu(items, iOSItemSize, title)}
						onPressMenuItem={toOnPressMenuItem(onItemPress)}
						onPressMenuPreview={iosOnPressMenuPreview}
						shouldCleanupOnComponentWillUnmountForAuxPreviews={true}
						previewConfig={!iosRenderPreview ? undefined : PREVIEW_CONFIG}
						renderPreview={iosRenderPreview}
						shouldPreventLongPressGestureFromPropagating={true}
						lazyPreview={!!iosRenderPreview}
						auxiliaryPreviewConfig={!renderAuxiliaryPreview ? undefined : getAuxiliaryPreviewConfig(auxiliaryPreviewPosition)}
						isAuxiliaryPreviewEnabled={!!renderAuxiliaryPreview}
						renderAuxiliaryPreview={renderAuxiliaryPreview}
						{...props}
					/>
				</View>
			)
		}
	)
)

ContextMenu.displayName = "ContextMenu"

export function toOnPressMenuItem(onItemPress: ContextMenuProps["onItemPress"]): OnPressMenuItemEvent {
	// @ts-expect-error NativeEvent is not typed correctly
	return ({ nativeEvent }) => {
		onItemPress?.({
			actionKey: nativeEvent.actionKey,
			title: nativeEvent.actionTitle,
			subTitle: nativeEvent.actionSubtitle,
			state: nativeEvent.menuState
				? {
						checked: nativeEvent.menuState === "on"
				  }
				: undefined,
			destructive: nativeEvent.menuAttributes?.includes("destructive"),
			disabled: nativeEvent.menuAttributes?.includes("disabled"),
			hidden: nativeEvent.menuAttributes?.includes("hidden"),
			keepOpenOnPress: nativeEvent.menuAttributes?.includes("keepsMenuPresented"),
			loading: false
		})
	}
}

export function toConfigMenu(
	items: ContextMenuConfig["items"],
	iOSItemSize: ContextMenuConfig["iOSItemSize"],
	title: ContextMenuConfig["title"]
): MenuConfig {
	return {
		menuTitle: title ?? "",
		menuPreferredElementSize: iOSItemSize,
		menuItems: items.map(item => {
			if ("items" in item) {
				return toConfigSubMenu(item)
			}

			return toConfigItem(item)
		})
	}
}

export function toConfigSubMenu(subMenu: ContextSubMenu): MenuElementConfig {
	if (subMenu.loading) {
		return {
			type: "deferred",
			deferredID: `${subMenu.title ?? ""}-${Date.now()}`
		}
	}

	return {
		menuOptions: subMenu.iOSType === "inline" ? ["displayInline"] : undefined,
		menuTitle: subMenu.title ?? "",
		menuSubtitle: subMenu.subTitle,
		menuPreferredElementSize: subMenu.iOSItemSize,
		menuItems: subMenu.items.map(item => {
			if ("items" in item) {
				return toConfigSubMenu(item)
			}

			return toConfigItem(item)
		})
	}
}

export function toConfigItem(item: ContextItem): MenuElementConfig {
	if (item.loading) {
		return {
			type: "deferred",
			deferredID: `${item.actionKey}-deferred}`
		}
	}

	const menuAttributes: MenuAttributes[] = []

	if (item.destructive) {
		menuAttributes.push("destructive")
	}

	if (item.disabled) {
		menuAttributes.push("disabled")
	}

	if (item.hidden) {
		menuAttributes.push("hidden")
	}

	if (item.keepOpenOnPress) {
		menuAttributes.push("keepsMenuPresented")
	}

	return {
		actionKey: item.actionKey,
		actionTitle: item.title ?? "",
		actionSubtitle: item.subTitle,
		menuState: item.state?.checked ? "on" : "off",
		menuAttributes,
		discoverabilityTitle: item.subTitle,
		icon: item?.image?.url
			? {
					type: "IMAGE_REMOTE_URL",
					imageValue: {
						url: item.image.url
					},
					imageOptions: {
						cornerRadius: item.image.cornerRadius,
						tint: item.image.tint
					}
			  }
			: item.icon
			? {
					iconType: "SYSTEM",
					iconValue:
						item.icon?.namingScheme === "sfSymbol"
							? item.icon.name ?? "questionmark"
							: item.icon.name && item.icon.name in ICON_MAPPING
							? ICON_MAPPING[item.icon.name as MaterialIconName].sfSymbol
							: "questionmark",
					iconTint: item.icon?.color
			  }
			: undefined
	}
}
