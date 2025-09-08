import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu"
import { useAugmentedRef } from "@rn-primitives/hooks"
import { Icon } from "@roninoss/icons"
import { Image, LayoutChangeEvent, StyleSheet, View, ScrollView } from "react-native"
import Animated, { FadeIn, FadeInLeft, FadeOut, FadeOutLeft, LayoutAnimationConfig, LinearTransition } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import useDimensions from "@/hooks/useDimensions"
import { DropdownItem, DropdownMenuProps, DropdownMenuRef, DropdownSubMenu } from "./types"
import { createContext, forwardRef, memo, useState, useRef, useContext, useId, useCallback } from "react"
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"

export const DropdownContext = createContext<{
	onItemPress: DropdownMenuProps["onItemPress"]
	dismissMenu?: () => void
	materialLoadingText: string
	materialSubMenuTitlePlaceholder: string
	subMenuRefs: React.MutableRefObject<DropdownMenuRef[]>
	closeSubMenus: () => void
} | null>(null)

export const DropdownMenu = memo(
	forwardRef<DropdownMenuRef, DropdownMenuProps>(
		(
			{
				items,
				title,
				iOSItemSize: _iOSItemSize,
				onItemPress: onItemPressProp,
				enabled = true,
				children,
				materialPortalHost,
				materialSideOffset = 2,
				materialAlignOffset,
				materialAlign = "center",
				materialWidth,
				materialMinWidth = 200,
				materialLoadingText = "Loading...",
				materialSubMenuTitlePlaceholder = "More ...",
				materialOverlayClassName,
				// @ts-expect-error internal prop
				materialIsSubMenu,
				...props
			},
			ref
		) => {
			const triggerRef = useRef<DropdownMenuPrimitive.TriggerRef>(null)
			const subMenuRefs = useRef<DropdownMenuRef[]>([])
			const insets = useSafeAreaInsets()

			const dismissMenu = useCallback(() => {
				triggerRef.current?.close()
			}, [triggerRef])

			const rootRef = useAugmentedRef({
				ref,
				methods: {
					presentMenu: () => {
						triggerRef.current?.open()
					},
					dismissMenu
				},
				deps: [triggerRef.current]
			})

			const closeSubMenus = useCallback(() => {
				for (const subMenuRef of subMenuRefs.current) {
					subMenuRef.dismissMenu?.()
				}
			}, [subMenuRefs])

			const onItemPress = useCallback(
				(item: Omit<DropdownItem, "icon">) => {
					closeSubMenus()
					onItemPressProp?.(item)
				},
				[closeSubMenus, onItemPressProp]
			)

			return (
				<DropdownMenuPrimitive.Root
					ref={rootRef}
					{...props}
				>
					<DropdownMenuPrimitive.Trigger
						ref={triggerRef}
						asChild={true}
					>
						{children}
					</DropdownMenuPrimitive.Trigger>
					<DropdownMenuPrimitive.Portal hostName={materialPortalHost}>
						<DropdownContext.Provider
							value={{
								onItemPress,
								dismissMenu,
								materialLoadingText,
								materialSubMenuTitlePlaceholder,
								subMenuRefs,
								closeSubMenus
							}}
						>
							<DropdownMenuPrimitive.Overlay
								style={StyleSheet.absoluteFill}
								pointerEvents={materialIsSubMenu ? "box-none" : undefined}
							>
								<Animated.View
									style={StyleSheet.absoluteFill}
									entering={FadeIn}
									exiting={FadeOut}
									pointerEvents={materialIsSubMenu ? "box-none" : undefined}
									className={cn(!materialIsSubMenu && "bg-black/20", !materialIsSubMenu && materialOverlayClassName)}
								>
									<DropdownMenuPrimitive.Content
										insets={{
											top: insets.top,
											right: 8,
											bottom: insets.bottom,
											left: 8
										}}
										sideOffset={materialSideOffset}
										alignOffset={materialAlignOffset}
										align={materialAlign}
									>
										<Animated.View
											entering={FadeIn}
											exiting={materialIsSubMenu ? undefined : FadeOut}
											style={{
												minWidth: materialMinWidth,
												width: materialWidth
											}}
											className="border-border/20 bg-card z-50 rounded-md border py-2 shadow-xl"
										>
											{!!title && <DropdownMenuLabel>{title}</DropdownMenuLabel>}
											<DropdownMenuInnerContent items={items} />
										</Animated.View>
									</DropdownMenuPrimitive.Content>
								</Animated.View>
							</DropdownMenuPrimitive.Overlay>
						</DropdownContext.Provider>
					</DropdownMenuPrimitive.Portal>
				</DropdownMenuPrimitive.Root>
			)
		}
	)
)

DropdownMenu.displayName = "DropdownMenu"

export function useDropdownContext() {
	const context = useContext(DropdownContext)

	if (!context) {
		throw new Error("DropdownMenu compound components cannot be rendered outside the DropdownMenu component")
	}

	return context
}

export const DropdownMenuInnerContent = memo(({ items }: { items: (DropdownItem | DropdownSubMenu)[] }) => {
	const { materialLoadingText } = useDropdownContext()
	const id = useId()
	const { screen, insets } = useDimensions()

	return (
		<ScrollView
			style={{
				maxHeight: screen.height - insets.top - insets.bottom
			}}
			showsHorizontalScrollIndicator={false}
			directionalLockEnabled={true}
			contentInsetAdjustmentBehavior="automatic"
		>
			{items.map((item, index) => {
				if (item.loading) {
					return (
						<DropdownMenuPrimitive.Item
							key={`loading:${id}-${item.title}-${index}`}
							asChild={true}
						>
							<Button
								disabled={true}
								variant="plain"
								className="h-12 justify-between gap-10 rounded-none px-3"
								androidRootClassName="rounded-none "
							>
								<Text className="font-normal opacity-60">{materialLoadingText}</Text>
								<ActivityIndicator size="small" />
							</Button>
						</DropdownMenuPrimitive.Item>
					)
				}
				if ((item as Partial<DropdownSubMenu>)?.items) {
					const subMenu = item as DropdownSubMenu

					if (subMenu.items.length === 0) {
						return null
					}

					return (
						<DropdownMenuSubMenu
							title={subMenu.title}
							subTitle={subMenu.subTitle}
							items={subMenu.items}
							key={`${id}-${subMenu.title}-${index}`}
						/>
					)
				}

				const dropdownItem = item as DropdownItem

				return (
					<DropdownMenuItem
						key={dropdownItem.actionKey}
						{...dropdownItem}
					/>
				)
			})}
		</ScrollView>
	)
})

DropdownMenuInnerContent.displayName = "DropdownMenuInnerContent"

export const DropdownMenuLabel = memo((props: { children: React.ReactNode }) => {
	return (
		<DropdownMenuPrimitive.Label className="text-muted-foreground/80 border-border/25 dark:border-border/80 dark:text-muted-foreground border-b px-3 pb-2 text-sm">
			{props.children}
		</DropdownMenuPrimitive.Label>
	)
})

DropdownMenuLabel.displayName = "DropdownMenuLabel"

export const DropdownMenuItem = memo((props: Omit<DropdownItem, "loading">) => {
	const { colors } = useColorScheme()
	const { onItemPress } = useDropdownContext()

	const onPress = useCallback(() => {
		onItemPress?.(props)
	}, [onItemPress, props])

	if (props.hidden) {
		return null
	}

	return (
		<LayoutAnimationConfig
			skipEntering={true}
			skipExiting={true}
		>
			<DropdownMenuPrimitive.Item
				asChild
				closeOnPress={!props.keepOpenOnPress}
				role="checkbox"
				accessibilityState={{
					disabled: !!props.disabled,
					checked: props.state?.checked
				}}
			>
				<Button
					variant={props.state?.checked ? "tonal" : "plain"}
					className={cn("h-12 justify-between gap-10 rounded-none px-3", !props.state && !props.title && "justify-center px-4")}
					androidRootClassName="rounded-none"
					accessibilityHint={props.subTitle}
					onPress={onPress}
				>
					{!props.state && !props.title ? null : (
						<View className="flex-row items-center gap-3 py-0.5">
							{props.state?.checked && (
								<Animated.View
									entering={FadeInLeft}
									exiting={FadeOutLeft}
								>
									<Icon
										name="check"
										size={21}
										color={colors.foreground}
									/>
								</Animated.View>
							)}
							<Animated.View layout={LinearTransition}>
								<Text
									numberOfLines={1}
									className={cn(
										"font-normal",
										props.destructive && "text-destructive font-medium",
										props.disabled && "opacity-60"
									)}
								>
									{props.title}
								</Text>
							</Animated.View>
							{props.state && !props.state?.checked && (
								<Icon
									name="check"
									size={21}
									color="#00000000"
								/>
							)}
						</View>
					)}
					{props.image ? (
						<Image
							source={{
								uri: props.image.url
							}}
							style={{
								width: 22,
								height: 22,
								borderRadius:
									typeof props.image.cornerRadius === "number" && props.image.cornerRadius > 0
										? props.image.cornerRadius / 4
										: 0
							}}
						/>
					) : props.icon ? (
						<Icon
							color={colors.foreground}
							{...props.icon}
							size={22}
						/>
					) : null}
				</Button>
			</DropdownMenuPrimitive.Item>
		</LayoutAnimationConfig>
	)
})

DropdownMenuItem.displayName = "DropdownMenuItem"

export const DEFAULT_LAYOUT = {
	width: 0,
	height: 0
}

export const DropdownMenuSubMenu = memo(({ title, subTitle, items }: Omit<DropdownSubMenu, "loading">) => {
	const { colors } = useColorScheme()
	const {
		onItemPress: onDropdownItemPress,
		dismissMenu,
		materialSubMenuTitlePlaceholder,
		subMenuRefs,
		closeSubMenus
	} = useDropdownContext()
	const [triggerLayout, setTriggerLayout] = useState<typeof DEFAULT_LAYOUT>(DEFAULT_LAYOUT)

	const onItemPress = useCallback(
		(item: Omit<DropdownItem, "icon">) => {
			dismissMenu?.()
			onDropdownItemPress?.(item)
		},
		[dismissMenu, onDropdownItemPress]
	)

	const onLayout = useCallback((ev: LayoutChangeEvent) => {
		setTriggerLayout(ev.nativeEvent.layout)
	}, [])

	const addSubMenuRef = useCallback(
		(ref: DropdownMenuRef | null) => {
			if (!ref) {
				return
			}

			subMenuRefs.current.push(ref)
		},
		[subMenuRefs]
	)

	return (
		<DropdownMenu
			items={items}
			materialAlign="start"
			materialSideOffset={-triggerLayout.height}
			materialAlignOffset={triggerLayout.width}
			onItemPress={onItemPress}
			materialMinWidth={48}
			// @ts-expect-error internal prop
			materialIsSubMenu={true}
			ref={addSubMenuRef}
		>
			<Button
				variant="plain"
				className=" justify-between gap-10 rounded-none px-3"
				androidRootClassName="rounded-none"
				onLayout={onLayout}
				accessibilityHint={subTitle}
				onPress={closeSubMenus}
			>
				<Text
					numberOfLines={1}
					className="py-0.5 font-normal"
				>
					{title || materialSubMenuTitlePlaceholder}
				</Text>
				<Icon
					name="chevron-right"
					size={21}
					color={colors.grey}
				/>
			</Button>
		</DropdownMenu>
	)
})

DropdownMenuSubMenu.displayName = "DropdownMenuSubMenu"
