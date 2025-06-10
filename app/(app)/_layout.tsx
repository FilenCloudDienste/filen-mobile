import useIsAuthed from "@/hooks/useIsAuthed"
import { Redirect, Tabs } from "expo-router"
import { type BottomTabBarProps, type BottomTabNavigationOptions } from "@react-navigation/bottom-tabs"
import { Icon, IconProps } from "@roninoss/icons"
import { memo, useCallback, useMemo, useRef, useLayoutEffect } from "react"
import { Platform, Pressable, PressableProps, View, StyleSheet } from "react-native"
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Badge } from "@/components/nativewindui/Badge"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"
import { BlurView } from "expo-blur"
import useChatUnreadQuery from "@/queries/useChatUnreadQuery"
import { useShallow } from "zustand/shallow"
import { useBottomTabsStore } from "@/stores/bottomTabs.store"
import useViewLayout from "@/hooks/useViewLayout"

export default function TabsLayout() {
	const [isAuthed] = useIsAuthed()
	const { colors } = useColorScheme()

	const chatUnreadQuery = useChatUnreadQuery({
		refetchInterval: 15000
	})

	const chatUnread = useMemo(() => {
		if (chatUnreadQuery.status !== "success") {
			return 0
		}

		return chatUnreadQuery.data
	}, [chatUnreadQuery.data, chatUnreadQuery.status])

	const tabBarLabel = useCallback((routeName: string): string => {
		if (routeName === "drive") {
			return "Drive"
		} else if (routeName === "photos") {
			return "Photos"
		} else if (routeName === "notes") {
			return "Notes"
		} else if (routeName === "chats") {
			return "Chats"
		} else {
			return "Home"
		}
	}, [])

	const tabBarIcon = useCallback(
		(
			routeName: string,
			props: {
				focused: boolean
				color: string
				size: number
			}
		): React.ReactNode => {
			if (routeName === "drive") {
				if (Platform.OS === "android") {
					return (
						<Icon
							name={props.focused ? "folder" : "folder-open"}
							namingScheme="material"
							size={props.size}
							color={props.color}
						/>
					)
				}

				return (
					<Icon
						name={props.focused ? "folder.fill" : "folder"}
						namingScheme="sfSymbol"
						size={props.size}
						color={props.color}
					/>
				)
			} else if (routeName === "photos") {
				return (
					<Icon
						name={props.focused ? "image" : "image-outline"}
						size={props.size}
						color={props.color}
					/>
				)
			} else if (routeName === "notes") {
				return (
					<Icon
						name={props.focused ? "book-open" : "book-open-outline"}
						size={props.size}
						color={props.color}
					/>
				)
			} else if (routeName === "chats") {
				return (
					<Icon
						name={props.focused ? "message" : "message-outline"}
						size={props.size}
						color={props.color}
					/>
				)
			} else {
				return (
					<Icon
						name={props.focused ? "home" : "home-outline"}
						size={props.size}
						color={props.color}
					/>
				)
			}
		},
		[]
	)

	if (!isAuthed) {
		return <Redirect href="/(auth)" />
	}

	return (
		<Tabs
			tabBar={TAB_BAR}
			initialRouteName="home"
			screenOptions={({ route }) => {
				return {
					headerShown: false,
					tabBarActiveTintColor: colors.primary,
					tabBarStyle: {
						position: "absolute",
						zIndex: 10
					},
					lazy: false,
					tabBarIcon: props => tabBarIcon(route.name, props),
					tabBarLabel: tabBarLabel(route.name),
					tabBarBadge: route.name === "chats" && chatUnread > 0 ? chatUnread : undefined,
					tabBarBackground() {
						if (Platform.OS === "android") {
							return undefined
						}

						return (
							<BlurView
								intensity={100}
								tint="systemChromeMaterial"
								style={[
									StyleSheet.absoluteFillObject,
									{
										backgroundColor: "transparent",
										overflow: "hidden",
										zIndex: 40
									}
								]}
							/>
						)
					}
				} satisfies BottomTabNavigationOptions
			}}
		>
			<Tabs.Screen name="home" />
			<Tabs.Screen name="drive" />
			<Tabs.Screen name="photos" />
			<Tabs.Screen name="notes" />
			<Tabs.Screen name="chats" />
		</Tabs>
	)
}

export const TAB_BAR = Platform.select({
	ios: undefined,
	android: (props: BottomTabBarProps) => <MaterialTabBar {...props} />
})

export const TAB_ICON: Record<string, IconProps<"material">["name"]> = {
	home: "home-outline",
	drive: "folder",
	photos: "image-outline",
	notes: "book-open-outline",
	chats: "message-outline"
} as const

export const TAB_ICON_ACTIVE: Record<string, IconProps<"material">["name"]> = {
	home: "home",
	drive: "folder",
	photos: "image",
	notes: "book-open",
	chats: "message"
} as const

export const MaterialTabBar = memo(({ state, descriptors, navigation }: BottomTabBarProps) => {
	const { colors } = useColorScheme()
	const insets = useSafeAreaInsets()
	const viewRef = useRef<View>(null)
	const { onLayout, layout } = useViewLayout(viewRef)
	const setHeight = useBottomTabsStore(useShallow(state => state.setHeight))

	useLayoutEffect(() => {
		setHeight(layout.height)
	}, [layout.height, setHeight])

	return (
		<View
			ref={viewRef}
			onLayout={onLayout}
			style={{
				paddingBottom: insets.bottom + 12
			}}
			className="border-t-border/25 bg-card flex-row border-t pb-4 pt-3 dark:border-t-0"
		>
			{state.routes.map((route, index) => {
				const { options } = descriptors[route.key]!
				const label =
					options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name
				const isFocused = state.index === index

				const onPress = () => {
					const event = navigation.emit({
						type: "tabPress",
						target: route.key,
						canPreventDefault: true
					})

					if (!isFocused && !event.defaultPrevented) {
						navigation.navigate(route.name, route.params)
					}
				}

				const onLongPress = () => {
					navigation.emit({
						type: "tabLongPress",
						target: route.key
					})
				}

				return (
					<MaterialTabItem
						key={route.name}
						accessibilityRole="button"
						accessibilityState={
							isFocused
								? {
										selected: true
								  }
								: {}
						}
						accessibilityLabel={options.tabBarAccessibilityLabel}
						onPress={onPress}
						onLongPress={onLongPress}
						name={
							isFocused
								? TAB_ICON_ACTIVE[route.name as keyof typeof TAB_ICON_ACTIVE]
								: TAB_ICON[route.name as keyof typeof TAB_ICON]
						}
						isFocused={isFocused}
						badge={options.tabBarBadge}
						label={
							typeof label === "function"
								? label({
										focused: isFocused,
										color: isFocused ? colors.foreground : colors.grey2,
										children: options.title ?? route.name ?? "",
										position: options.tabBarLabelPosition ?? "below-icon"
								  })
								: label
						}
					/>
				)
			})}
		</View>
	)
})

MaterialTabBar.displayName = "MaterialTabBar"

export const MaterialTabItem = memo(
	({
		isFocused,
		name = "star",
		badge,
		className,
		label,
		...pressableProps
	}: {
		isFocused: boolean
		name: IconProps<"material">["name"]
		label: string | React.ReactNode
		badge?: number | string
	} & Omit<PressableProps, "children">) => {
		const { colors } = useColorScheme()
		const isFocusedDerived = useDerivedValue(() => isFocused)

		const animatedStyle = useAnimatedStyle(() => {
			return {
				position: "absolute",
				transform: [
					{
						scaleX: withTiming(isFocusedDerived.value ? 1 : 0, {
							duration: 200
						})
					}
				],
				opacity: withTiming(isFocusedDerived.value ? 1 : 0, {
					duration: 200
				}),
				bottom: 0,
				top: 0,
				left: 0,
				right: 0,
				borderRadius: 100
			}
		})

		return (
			<Pressable
				className={cn("flex-1 items-center", className)}
				{...pressableProps}
			>
				<View className="h-8 w-16 items-center justify-center overflow-hidden rounded-full ">
					<Animated.View
						style={animatedStyle}
						className="bg-secondary/70 dark:bg-secondary"
					/>
					<View>
						<Icon
							ios={{
								useMaterialIcon: true
							}}
							size={24}
							name={name}
							color={isFocused ? colors.foreground : colors.grey2}
						/>
						{!!badge && <Badge>{badge}</Badge>}
					</View>
				</View>
				<Text
					variant="caption2"
					className={cn("pt-1", !isFocused && "text-muted-foreground")}
				>
					{label}
				</Text>
			</Pressable>
		)
	}
)

MaterialTabItem.displayName = "MaterialTabItem"
