import useHeaderHeight from "@/hooks/useHeaderHeight"
import { Portal } from "@rn-primitives/portal"
import { Stack } from "expo-router"
import { memo, useState, useId, useMemo, Fragment, useEffect, useRef } from "react"
import { View, type ViewStyle, type StyleProp } from "react-native"
import Animated, { FadeIn, type AnimatedStyle } from "react-native-reanimated"
import {
	type LargeTitleHeaderProps,
	type NativeStackNavigationOptions,
	type NativeStackNavigationSearchBarOptions,
	type LargeTitleSearchBarRef
} from "./types"
import { useColorScheme } from "~/lib/useColorScheme"
import { useKeyboardState } from "react-native-keyboard-controller"
import events from "@/lib/events"
import { useTranslation } from "react-i18next"

export const LargeTitleHeader = memo((props: LargeTitleHeaderProps) => {
	const id = useId()
	const { colors } = useColorScheme()
	const headerHeight = useHeaderHeight()
	const [isFocused, setIsFocused] = useState<boolean>(false)
	const keyboardState = useKeyboardState()
	const ref = useRef<LargeTitleSearchBarRef | null>(props.searchBar?.ref?.current ?? null)
	const { t } = useTranslation()

	const options = useMemo(() => {
		return {
			headerLargeTitle: true,
			headerBackButtonMenuEnabled: props.iosBackButtonMenuEnabled,
			headerBackTitle: props.iosBackButtonTitle,
			headerBackVisible: props.backVisible,
			headerLargeTitleShadowVisible: props.shadowVisible,
			headerBlurEffect: props.iosBlurEffect === "none" ? undefined : props.iosBlurEffect ?? "systemChromeMaterial",
			headerShadowVisible: props.shadowVisible,
			headerLeft: isFocused
				? undefined
				: props.leftView
				? headerProps => <View className="flex-row justify-center gap-4">{props.leftView!(headerProps)}</View>
				: undefined,
			headerRight: isFocused
				? undefined
				: props.rightView
				? headerProps => <View className="flex-row justify-center gap-4">{props.rightView!(headerProps)}</View>
				: undefined,
			headerShown: props.shown,
			headerTitle: props.title,
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
							? event => props.searchBar?.onChangeText!(event.nativeEvent.text)
							: undefined,
						onFocus: () => {
							setIsFocused(true)

							props.searchBar?.onFocus?.()
						},
						onSearchButtonPress: props.searchBar?.onSearchButtonPress,
						placeholder: props.searchBar?.placeholder ?? t("nwui.search.placeholder"),
						ref: (ref as NativeStackNavigationSearchBarOptions["ref"]) ?? undefined,
						textColor: props.searchBar?.textColor
				  }
				: undefined,
			...props.screen
		} satisfies NativeStackNavigationOptions
	}, [props, isFocused, colors.background, t])

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
			<Portal name={`large-title:${id}`}>
				<Animated.View
					entering={FadeIn.delay(100)}
					style={[
						viewStyle,
						{
							display: props.searchBar?.content && isFocused ? "flex" : "none"
						}
					]}
					className="absolute bottom-0 left-0 right-0"
				>
					{props.searchBar?.content}
				</Animated.View>
			</Portal>
		</Fragment>
	)
})

LargeTitleHeader.displayName = "LargeTitleHeader"

export default LargeTitleHeader
