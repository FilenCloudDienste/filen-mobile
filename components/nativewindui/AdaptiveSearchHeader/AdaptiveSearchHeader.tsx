import { useAugmentedRef } from "@rn-primitives/hooks"
import { Portal } from "@rn-primitives/portal"
import { Icon } from "@roninoss/icons"
import { Stack, useNavigation } from "expo-router"
import { memo, useRef, useId, useState, useEffect, useCallback, useMemo, Fragment, useLayoutEffect } from "react"
import { BackHandler, TextInput, View } from "react-native"
import Animated, { FadeIn, FadeInRight, FadeInUp, FadeOut, FadeOutRight, ZoomIn, withTiming } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { type AdaptiveSearchBarRef, type AdaptiveSearchHeaderProps, type NativeStackNavigationSearchBarOptions } from "./types"
import { Button } from "@/components/nativewindui/Button"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"
import { useHeaderStore } from "@/stores/header.store"
import useViewLayout from "@/hooks/useViewLayout"
import { useShallow } from "zustand/shallow"
import { useKeyboardState } from "react-native-keyboard-controller"
import events from "@/lib/events"
import { useTranslation } from "react-i18next"

export const SCREEN_OPTIONS = {
	headerShown: false
}

export const AdaptiveSearchHeader = memo((props: AdaptiveSearchHeaderProps) => {
	const insets = useSafeAreaInsets()
	const { colors } = useColorScheme()
	const navigation = useNavigation()
	const id = useId()
	const fallbackSearchBarRef = useRef<AdaptiveSearchBarRef>(null)
	const [searchValue, setSearchValue] = useState<string>("")
	const [showSearchBar, setShowSearchBar] = useState<boolean>(false)
	const setHeaderHeight = useHeaderStore(useShallow(state => state.setHeight))
	const viewRef = useRef<View>(null)
	const {
		layout: { height: headerHeight },
		onLayout
	} = useViewLayout(viewRef)
	const keyboardState = useKeyboardState()
	const { t } = useTranslation()

	const augmentedRef = useAugmentedRef({
		ref: props.searchBar?.ref ?? fallbackSearchBarRef,
		methods: {
			focus: () => {
				setShowSearchBar(true)
			},
			blur: () => {
				setShowSearchBar(false)
			},
			setText: text => {
				setSearchValue(text)

				props.searchBar?.onChangeText?.(text)
			},
			clearText: () => {
				setSearchValue("")

				props.searchBar?.onChangeText?.("")
			},
			cancelSearch: () => {
				setShowSearchBar(false)
				setSearchValue("")

				props.searchBar?.onChangeText?.("")
			}
		}
	})

	const onSearchButtonPress = useCallback(() => {
		setShowSearchBar(true)

		props.searchBar?.onSearchButtonPress?.()
	}, [props.searchBar])

	const onChangeText = useCallback(
		(text: string) => {
			setSearchValue(text)

			props.searchBar?.onChangeText?.(text)
		},
		[props.searchBar]
	)

	const onSearchBackPress = useCallback(() => {
		setShowSearchBar(false)
		setSearchValue("")

		props.searchBar?.onChangeText?.("")
	}, [props.searchBar])

	const onClearText = useCallback(() => {
		setSearchValue("")

		props.searchBar?.onChangeText?.("")
		props.searchBar?.onCancelButtonPress?.()
	}, [props.searchBar])

	const canGoBack = useMemo(() => {
		return props.backVisible ?? props.iosBackVisible ?? navigation.canGoBack()
	}, [props.backVisible, props.iosBackVisible, navigation])

	useLayoutEffect(() => {
		if (headerHeight) {
			setHeaderHeight(headerHeight)
		}
	}, [headerHeight, setHeaderHeight])

	useEffect(() => {
		const hideSearchBarListener = events.subscribe("hideSearchBar", ({ clearText }) => {
			setShowSearchBar(false)

			if (clearText) {
				setSearchValue("")

				props.searchBar?.onChangeText?.("")
			}
		})

		return () => {
			hideSearchBarListener.remove()
		}
	}, [props.searchBar])

	useEffect(() => {
		const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
			if (showSearchBar) {
				setShowSearchBar(false)
				setSearchValue("")

				props.searchBar?.onChangeText?.("")

				return true
			}

			return false
		})

		return () => {
			backHandler.remove()
		}
	}, [showSearchBar, props.searchBar])

	if (props.shown === false) {
		return null
	}

	return (
		<Fragment>
			<Stack.Screen options={Object.assign(props.screen ?? {}, SCREEN_OPTIONS)} />
			{/* Ref is set in View so we can call its methods before the input is mounted */}
			<View ref={augmentedRef as unknown as React.RefObject<View>} />
			<View
				ref={viewRef}
				onLayout={onLayout}
				style={{
					paddingTop: (props.materialUseSafeAreaTop === false ? 0 : insets.top) + 6,
					backgroundColor: props.backgroundColor ?? colors.background
				}}
				className={cn("px-4 z-10 pb-3 shadow-none", props.shadowVisible && "shadow-xl")}
			>
				<Button
					variant="plain"
					className="bg-muted/25 android:gap-0 dark:bg-card h-14 flex-row items-center rounded-full px-2.5"
					onPress={onSearchButtonPress}
				>
					{props.leftView ? (
						<View className="flex-row justify-center gap-4 pl-0.5">
							{props.leftView({
								canGoBack,
								tintColor: colors.foreground
							})}
						</View>
					) : (
						<Button
							variant="plain"
							size="sm"
							className="p-2"
							pointerEvents="none"
						>
							<Icon
								color={colors.grey2}
								name="magnifyingglass"
								namingScheme="sfSymbol"
								size={24}
							/>
						</Button>
					)}
					<View className="flex-1 px-2">
						<Text
							numberOfLines={1}
							variant="callout"
							className="android:text-muted-foreground font-normal"
						>
							{props.searchBar?.placeholder ?? t("nwui.search.placeholder")}
						</Text>
					</View>
					<View className="flex-row items-center gap-2">
						{!!props.rightView && (
							<Fragment>
								{props.rightView({
									canGoBack,
									tintColor: colors.foreground
								})}
							</Fragment>
						)}
					</View>
				</Button>
			</View>
			{showSearchBar && (
				<Portal name={`large-title:${id}`}>
					<Animated.View
						exiting={FadeOut}
						className={cn("absolute left-0 right-0 top-0", !props.searchBar?.contentTransparent && "bottom-0")}
					>
						<View
							style={{
								paddingTop: insets.top + 6
							}}
							className="bg-background relative z-50 overflow-hidden"
						>
							<Animated.View
								entering={customEntering}
								exiting={customExiting}
								className="bg-muted/25 dark:bg-card absolute bottom-2.5 left-4 right-4 h-14 rounded-full"
							/>
							<View className="pb-2.5">
								<Animated.View
									entering={FadeIn}
									exiting={FadeOut}
									className="h-14 flex-row items-center pl-3.5 pr-5"
								>
									<Animated.View
										entering={FadeInRight}
										exiting={FadeOutRight}
									>
										<Animated.View
											entering={FadeIn}
											exiting={FadeOut}
										>
											<Button
												variant="plain"
												size="icon"
												onPress={onSearchBackPress}
											>
												<Icon
													color={colors.grey}
													name="arrow-left"
													size={24}
												/>
											</Button>
										</Animated.View>
									</Animated.View>
									<Animated.View
										entering={FadeInRight}
										exiting={FadeOutRight}
										className="flex-1"
									>
										<TextInput
											autoFocus={true}
											placeholder={props.searchBar?.placeholder ?? t("nwui.search.placeholder")}
											className="flex-1 rounded-r-full p-2 text-[17px]"
											style={{
												color: props.searchBar?.textColor ?? colors.foreground
											}}
											placeholderTextColor={colors.grey2}
											onFocus={props.searchBar?.onFocus}
											value={searchValue}
											onChangeText={onChangeText}
											autoCapitalize={props.searchBar?.autoCapitalize}
											keyboardType={searchBarInputTypeToKeyboardType(props.searchBar?.inputType)}
											returnKeyType="search"
											blurOnSubmit={props.searchBar?.materialBlurOnSubmit}
											onSubmitEditing={props.searchBar?.materialOnSubmitEditing}
										/>
									</Animated.View>
									<View className="flex-row items-center gap-3 pr-1.5">
										{!!searchValue && (
											<Animated.View
												entering={FadeIn}
												exiting={FadeOut}
											>
												<Button
													size="icon"
													variant="plain"
													onPress={onClearText}
												>
													<Icon
														color={colors.grey2}
														name="close"
														size={24}
													/>
												</Button>
											</Animated.View>
										)}
										{!!props.searchBar?.materialRightView && (
											<Fragment>
												{props.searchBar?.materialRightView({
													canGoBack,
													tintColor: colors.foreground
												})}
											</Fragment>
										)}
									</View>
								</Animated.View>
							</View>
							<Animated.View
								entering={ZoomIn}
								className="bg-border h-px"
							/>
						</View>
						{!props.searchBar?.contentTransparent && props.searchBar?.content && (
							<Animated.View
								entering={FadeInUp}
								className="bg-background flex-1"
							>
								<View
									className="flex-1"
									style={{
										paddingBottom: keyboardState.isVisible ? keyboardState.height : 0
									}}
								>
									{props.searchBar?.content}
								</View>
							</Animated.View>
						)}
					</Animated.View>
				</Portal>
			)}
		</Fragment>
	)
})

AdaptiveSearchHeader.displayName = "AdaptiveSearchHeader"

export function searchBarInputTypeToKeyboardType(inputType: NativeStackNavigationSearchBarOptions["inputType"]) {
	switch (inputType) {
		case "email": {
			return "email-address"
		}

		case "number": {
			return "numeric"
		}

		case "phone": {
			return "phone-pad"
		}

		default: {
			return "default"
		}
	}
}

export const customEntering = () => {
	"worklet"

	const animations = {
		transform: [
			{
				scale: withTiming(3, {
					duration: 400
				})
			}
		]
	}

	const initialValues = {
		transform: [
			{
				scale: 1
			}
		]
	}

	return {
		initialValues,
		animations
	}
}

export const customExiting = () => {
	"worklet"

	const animations = {
		transform: [
			{
				scale: withTiming(1)
			}
		],
		opacity: withTiming(0)
	}

	const initialValues = {
		transform: [
			{
				scale: 3
			}
		],
		opacity: 1
	}

	return {
		initialValues,
		animations
	}
}
