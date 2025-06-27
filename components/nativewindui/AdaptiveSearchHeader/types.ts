import type { Stack } from "expo-router"
import type { NativeSyntheticEvent, TextInputSubmitEditingEventData } from "react-native"
import type { SearchBarCommands } from "react-native-screens"

export type NativeStackNavigationOptions = Exclude<
	NonNullable<React.ComponentPropsWithoutRef<typeof Stack.Screen>["options"]>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(props: any) => any
>

export type ScreenOptions = Pick<
	NativeStackNavigationOptions,
	// @ts-expect-error NWUI declares wrong types?
	| "animation"
	| "animationDuration"
	| "contentStyle"
	| "navigationBarColor"
	| "animationTypeForReplace"
	| "autoHideHomeIndicator"
	| "customAnimationOnGesture"
	| "gestureEnabled"
	| "freezeOnBlur"
	| "fullScreenGestureEnabled"
	| "gestureDirection"
	| "navigationBarHidden"
	| "orientation"
	| "presentation"
	| "statusBarTranslucent"
	| "statusBarStyle"
	| "statusBarHidden"
	| "statusBarColor"
	| "statusBarAnimation"
	| "title"
>

export type HeaderOptions = Omit<NativeStackNavigationOptions, keyof ScreenOptions>

export type NativeStackNavigationSearchBarOptions = NonNullable<HeaderOptions["headerSearchBarOptions"]>

export type AdaptiveSearchBarRef = Omit<SearchBarCommands, "blur" | "toggleCancelButton">

export type AdaptiveSearchHeaderProps = {
	/**
	 * Default is false
	 */
	iosIsLargeTitle?: boolean
	iosBackButtonMenuEnabled?: boolean
	iosBackButtonTitle?: string
	iosBackButtonTitleVisible?: boolean
	iosBackVisible?: boolean
	/**
	 * Default is 'systemMaterial'
	 */
	iosBlurEffect?: HeaderOptions["headerBlurEffect"] | "none"
	iosTitle?: string
	/**
	 * Default is true
	 */
	materialUseSafeAreaTop?: boolean
	/**
	 * iOS - iosBlurEffect must be set to 'none' for this to work
	 * @default iOS: true | Material: false
	 */
	shadowVisible?: boolean
	leftView?: HeaderOptions["headerLeft"]
	rightView?: HeaderOptions["headerRight"]
	shown?: boolean
	backgroundColor?: string
	screen?: ScreenOptions
	backVisible?: boolean
	searchBar?: {
		iosCancelButtonText?: string
		iosHideWhenScrolling?: boolean
		iosTintColor?: string
		materialRightView?: HeaderOptions["headerRight"]
		materialBlurOnSubmit?: boolean
		materialOnSubmitEditing?: ((e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void) | undefined
		autoCapitalize?: NativeStackNavigationSearchBarOptions["autoCapitalize"]
		inputType?: NativeStackNavigationSearchBarOptions["inputType"]
		onBlur?: () => void
		onCancelButtonPress?: () => void
		onChangeText?: (text: string) => void
		onFocus?: () => void
		onSearchButtonPress?: () => void
		placeholder?: string
		ref?: React.RefObject<AdaptiveSearchBarRef>
		textColor?: string
		content?: React.ReactNode
		contentTransparent?: boolean
		persistBlur?: boolean
	}
}
