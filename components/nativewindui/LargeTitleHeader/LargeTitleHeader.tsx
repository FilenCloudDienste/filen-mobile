import { useRoute } from "@react-navigation/native"
import { useAugmentedRef } from "@rn-primitives/hooks"
import { Portal } from "@rn-primitives/portal"
import { Icon } from "@roninoss/icons"
import { Stack, useNavigation } from "expo-router"
import { memo, useRef, useId, useState, useEffect, useCallback, useMemo, useLayoutEffect, Fragment } from "react"
import { BackHandler, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { LargeTitleHeaderProps, LargeTitleSearchBarRef, NativeStackNavigationSearchBarOptions } from "./types"
import { Button } from "@/components/nativewindui/Button"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"
import { useHeaderStore } from "@/stores/header.store"
import useViewLayout from "@/hooks/useViewLayout"
import { useShallow } from "zustand/shallow"
import { useKeyboardState } from "react-native-keyboard-controller"
import { events } from "@/lib/events"
import { useTranslation } from "react-i18next"

export const SCREEN_OPTIONS = {
	headerShown: false
}

export const LargeTitleHeader = memo((props: LargeTitleHeaderProps) => {
	const insets = useSafeAreaInsets()
	const { colors } = useColorScheme()
	const navigation = useNavigation()
	const route = useRoute()
	const id = useId()
	const fallbackSearchBarRef = useRef<LargeTitleSearchBarRef>(null)
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

	const isInlined = useMemo(() => {
		return props.materialPreset === "inline"
	}, [props.materialPreset])

	const canGoBack = useMemo(() => {
		return props.backVisible ?? navigation.canGoBack()
	}, [props.backVisible, navigation])

	const searchBarVisible = useMemo(() => {
		return !!props.searchBar && showSearchBar
	}, [props.searchBar, showSearchBar])

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

			setTimeout(() => {
				events.emit("searchBarHidden", true)
			}, 100)
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
					paddingTop: insets.top + 14,
					backgroundColor: props.backgroundColor ?? colors.background
				}}
				className={cn("px-1 z-10 shadow-none", props.shadowVisible && "shadow-xl", isInlined ? "pb-4" : "pb-5")}
			>
				<View className="flex-row justify-between px-0.5">
					<View className="flex-1 flex-row items-center">
						{props.leftView ? (
							<View className="flex-row justify-center gap-4 pl-0.5">
								{props.leftView({ canGoBack, tintColor: colors.foreground })}
							</View>
						) : (
							props.backVisible !== false &&
							canGoBack && (
								<Button
									size="icon"
									variant="plain"
									onPress={() => {
										navigation.goBack()
									}}
								>
									<Icon
										name="arrow-left"
										size={24}
										color={colors.foreground}
									/>
								</Button>
							)
						)}
						{isInlined && (
							<View className={cn("flex-1", canGoBack ? "pl-4" : "pl-3")}>
								<Text
									variant="title1"
									numberOfLines={1}
									className={props.materialTitleClassName}
								>
									{props.title ?? route.name}
								</Text>
							</View>
						)}
					</View>
					<View className="flex-row justify-center gap-3 pr-2">
						{!!props.searchBar && (
							<Button
								onPress={() => {
									setShowSearchBar(true)

									props.searchBar?.onSearchButtonPress?.()
								}}
								size="icon"
								variant="plain"
							>
								<Icon
									name="magnify"
									size={24}
									color={colors.foreground}
								/>
							</Button>
						)}
						{!!props.rightView && (
							<Fragment>
								{props.rightView({
									canGoBack,
									tintColor: colors.foreground
								})}
							</Fragment>
						)}
					</View>
				</View>
				{!isInlined && (
					<View className="px-3 pt-6">
						<Text
							numberOfLines={1}
							className={cn("text-3xl", props.materialTitleClassName)}
						>
							{props.title ?? route.name}
						</Text>
					</View>
				)}
			</View>
			<Portal name={`large-title:${id}`}>
				<View
					className={cn("absolute left-0 right-0 top-0", !props.searchBar?.contentTransparent && "bottom-0")}
					style={{
						display: searchBarVisible ? "flex" : "none",
						height: searchBarVisible ? "100%" : 0,
						width: searchBarVisible ? "100%" : 0
					}}
				>
					<Fragment>
						<View
							style={{
								paddingTop: insets.top + 6
							}}
							className="bg-background relative z-50 overflow-hidden"
						>
							<View className="bg-muted/25 dark:bg-card absolute bottom-2.5 left-4 right-4 h-14 rounded-full" />
							<View className="pb-2.5">
								<View className="h-14 flex-row items-center pl-3.5 pr-5">
									<View className="pl-1">
										<Button
											variant="plain"
											size="icon"
											onPress={onSearchBackPress}
										>
											<Icon
												color={colors.grey}
												name={"arrow-left"}
												size={24}
											/>
										</Button>
									</View>
									<View className="flex-1">
										{searchBarVisible && (
											<TextInput
												autoFocus={true}
												placeholder={props.searchBar?.placeholder ?? t("nwui.search.placeholder")}
												className="rounded-r-full flex-1 p-2 text-[17px]"
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
										)}
									</View>
									<View className="flex-row items-center gap-3 pr-0.5">
										{!!searchValue && (
											<View>
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
											</View>
										)}
										{!!props.searchBar?.materialRightView && (
											<Fragment>
												{props.searchBar.materialRightView({
													canGoBack,
													tintColor: colors.foreground
												})}
											</Fragment>
										)}
									</View>
								</View>
							</View>
						</View>
						{!props.searchBar?.contentTransparent && props.searchBar?.content && (
							<View className="bg-background flex-1">
								<View
									className="flex-1"
									style={{
										paddingBottom: keyboardState.isVisible ? keyboardState.height : 0
									}}
								>
									{props.searchBar.content}
								</View>
							</View>
						)}
					</Fragment>
				</View>
			</Portal>
		</Fragment>
	)
})

LargeTitleHeader.displayName = "LargeTitleHeader"

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
