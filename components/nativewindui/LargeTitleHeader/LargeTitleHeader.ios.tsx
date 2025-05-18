import useHeaderHeight from "@/hooks/useHeaderHeight"
import { Portal } from "@rn-primitives/portal"
import { Stack } from "expo-router"
import { memo, useState, useId, useMemo, Fragment } from "react"
import { View } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { type LargeTitleHeaderProps, type NativeStackNavigationOptions, type NativeStackNavigationSearchBarOptions } from "./types"
import { useColorScheme } from "~/lib/useColorScheme"

export const LargeTitleHeader = memo((props: LargeTitleHeaderProps) => {
	const id = useId()
	const { colors } = useColorScheme()
	const headerHeight = useHeaderHeight()
	const [isFocused, setIsFocused] = useState<boolean>(false)

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
						onBlur: () => {
							setIsFocused(false)

							props.searchBar?.onBlur?.()
						},
						onCancelButtonPress: props.searchBar?.onCancelButtonPress,
						onChangeText: props.searchBar?.onChangeText
							? event => props.searchBar?.onChangeText!(event.nativeEvent.text)
							: undefined,
						onFocus: () => {
							setIsFocused(true)

							props.searchBar?.onFocus?.()
						},
						onSearchButtonPress: props.searchBar?.onSearchButtonPress,
						placeholder: props.searchBar?.placeholder ?? "Search...",
						ref: props.searchBar?.ref as NativeStackNavigationSearchBarOptions["ref"],
						textColor: props.searchBar?.textColor
				  }
				: undefined,
			...props.screen
		} satisfies NativeStackNavigationOptions
	}, [props, isFocused, colors.background])

	return (
		<Fragment>
			<Stack.Screen options={options} />
			{props.searchBar?.content && isFocused && (
				<Portal name={`large-title:${id}`}>
					<Animated.View
						entering={FadeIn.delay(100)}
						style={{
							top: headerHeight + 6
						}}
						className="absolute bottom-0 left-0 right-0"
					>
						{props.searchBar?.content}
					</Animated.View>
				</Portal>
			)}
		</Fragment>
	)
})

LargeTitleHeader.displayName = "LargeTitleHeader"

export default LargeTitleHeader
