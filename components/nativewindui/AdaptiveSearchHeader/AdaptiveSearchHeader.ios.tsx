import useHeaderHeight from "@/hooks/useHeaderHeight"
import { Portal } from "@rn-primitives/portal"
import { Stack } from "expo-router"
import { memo, useMemo, useState, useId, Fragment, useEffect, useRef } from "react"
import { View, type ViewStyle, type StyleProp } from "react-native"
import Animated, { FadeIn, type AnimatedStyle } from "react-native-reanimated"
import {
	type AdaptiveSearchHeaderProps,
	type NativeStackNavigationOptions,
	type NativeStackNavigationSearchBarOptions,
	type AdaptiveSearchBarRef
} from "./types"
import { useColorScheme } from "~/lib/useColorScheme"
import { useKeyboardState } from "react-native-keyboard-controller"
import events from "@/lib/events"

export const AdaptiveSearchHeader = memo((props: AdaptiveSearchHeaderProps) => {
	const id = useId()
	const { colors } = useColorScheme()
	const headerHeight = useHeaderHeight()
	const [isFocused, setIsFocused] = useState<boolean>(false)
	const keyboardState = useKeyboardState()
	const ref = useRef<AdaptiveSearchBarRef | null>(props.searchBar?.ref?.current ?? null)

	const options = useMemo(() => {
		return {
			headerLargeTitle: props.iosIsLargeTitle,
			headerBackButtonMenuEnabled: props.iosBackButtonMenuEnabled,
			headerBackTitle: props.iosBackButtonTitle,
			headerBackVisible: props.iosBackVisible,
			headerLargeTitleShadowVisible: props.shadowVisible,
			headerBlurEffect: props.iosBlurEffect === "none" ? undefined : props.iosBlurEffect ?? "systemChromeMaterial",
			headerShadowVisible: props.shadowVisible,
			headerLeft: isFocused
				? undefined
				: props.leftView
				? headerProps => <View className="flex-row justify-center gap-4">{props.leftView?.(headerProps)}</View>
				: undefined,
			headerRight: isFocused
				? undefined
				: props.rightView
				? headerProps => <View className="flex-row justify-center gap-4">{props.rightView?.(headerProps)}</View>
				: undefined,
			headerShown: props.shown,
			headerTitle: props.iosTitle,
			headerTransparent: props.iosBlurEffect !== "none",
			headerLargeStyle: {
				backgroundColor: props.backgroundColor ?? colors.background
			},
			headerStyle:
				props.iosBlurEffect === "none"
					? {
							backgroundColor: props.backgroundColor ?? colors.background
					  }
					: undefined,
			headerSearchBarOptions: props.searchBar
				? {
						autoCapitalize: props.searchBar?.autoCapitalize,
						cancelButtonText: props.searchBar?.iosCancelButtonText,
						hideWhenScrolling: props.searchBar?.iosHideWhenScrolling ?? false,
						inputType: props.searchBar?.inputType,
						tintColor: props.searchBar?.iosTintColor,
						onCancelButtonPress: () => {
							setIsFocused(false)

							props.searchBar?.onCancelButtonPress?.()
						},
						onChangeText: props.searchBar?.onChangeText
							? event => props.searchBar?.onChangeText?.(event.nativeEvent.text)
							: undefined,
						onFocus: () => {
							setIsFocused(true)

							props.searchBar?.onFocus?.()
						},
						onSearchButtonPress: props.searchBar?.onSearchButtonPress,
						placeholder: props.searchBar?.placeholder ?? "Search...",
						ref: (ref as NativeStackNavigationSearchBarOptions["ref"]) ?? undefined,
						textColor: props.searchBar?.textColor
				  }
				: undefined,
			...props.screen
		} satisfies NativeStackNavigationOptions
	}, [props, isFocused, colors.background])

	const viewStyle = useMemo(() => {
		return {
			top: headerHeight,
			paddingBottom: keyboardState.isVisible ? keyboardState.height : 0
		} satisfies StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>
	}, [keyboardState.isVisible, keyboardState.height, headerHeight])

	useEffect(() => {
		const hideSearchBarListener = events.subscribe("hideSearchBar", ({ clearText }) => {
			setIsFocused(false)

			if (clearText) {
				ref?.current?.cancelSearch?.()
				ref?.current?.clearText?.()
				props.searchBar?.onChangeText?.("")
			}
		})

		return () => {
			hideSearchBarListener.remove()
		}
	}, [props.searchBar])

	return (
		<Fragment>
			<Stack.Screen options={options} />
			{props.searchBar?.content && isFocused && (
				<Portal name={`large-title:${id}`}>
					<Animated.View
						entering={FadeIn.delay(100)}
						style={viewStyle}
						className="absolute bottom-0 left-0 right-0"
					>
						{props.searchBar?.content}
					</Animated.View>
				</Portal>
			)}
		</Fragment>
	)
})

AdaptiveSearchHeader.displayName = "AdaptiveSearchHeader"

export default AdaptiveSearchHeader
