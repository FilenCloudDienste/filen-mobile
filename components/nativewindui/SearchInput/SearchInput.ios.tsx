import { useAugmentedRef, useControllableState } from "@rn-primitives/hooks"
import { Icon } from "@roninoss/icons"
import { memo, forwardRef, useState, useCallback, useMemo } from "react"
import { Pressable, TextInput, View, ViewStyle, type NativeSyntheticEvent, type TextInputFocusEventData } from "react-native"
import Animated, { measure, useAnimatedRef, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated"
import { type SearchInputProps } from "./types"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"
import { useTranslation } from "react-i18next"

// Add as class when possible: https://github.com/marklawlor/nativewind/issues/522
export const BORDER_CURVE: ViewStyle = {
	borderCurve: "continuous"
}

export const SearchInput = memo(
	forwardRef<React.ElementRef<typeof TextInput>, SearchInputProps>(
		(
			{
				value: valueProp,
				onChangeText: onChangeTextProp,
				onFocus: onFocusProp,
				placeholder,
				cancelText,
				containerClassName,
				iconContainerClassName,
				className,
				iconColor,
				...props
			},
			ref
		) => {
			const { colors } = useColorScheme()
			const { t } = useTranslation()

			const inputRef = useAugmentedRef({
				ref,
				methods: {
					focus: () => {
						inputRef?.current?.focus()
					},
					blur: () => {
						inputRef?.current?.blur()
					},
					clear: () => onChangeText?.("")
				}
			})

			const [showCancel, setShowCancel] = useState(false)
			const showCancelDerivedValue = useDerivedValue(() => showCancel, [showCancel])
			const animatedRef = useAnimatedRef()

			const [value = "", onChangeText] = useControllableState({
				prop: valueProp,
				defaultProp: valueProp ?? "",
				onChange: onChangeTextProp
			})

			const cancelString = useMemo(() => cancelText ?? t("nwui.search.cancel"), [cancelText, t])

			const rootStyle = useAnimatedStyle(() => {
				if (_WORKLET) {
					// safely use measure
					const measurement = measure(animatedRef)

					return {
						paddingRight: showCancelDerivedValue.value
							? withTiming(measurement?.width ?? cancelString.length * 11.2)
							: withTiming(0)
					}
				}

				return {
					paddingRight: showCancelDerivedValue.value ? withTiming(cancelString.length * 11.2) : withTiming(0)
				}
			})

			const buttonStyle3 = useAnimatedStyle(() => {
				if (_WORKLET) {
					// safely use measure
					const measurement = measure(animatedRef)

					return {
						position: "absolute",
						right: 0,
						opacity: showCancelDerivedValue.value ? withTiming(1) : withTiming(0),
						transform: [
							{
								translateX: showCancelDerivedValue.value
									? withTiming(0)
									: measurement?.width
									? withTiming(measurement.width)
									: cancelString.length * 11.2
							}
						]
					}
				}

				return {
					position: "absolute",
					right: 0,
					opacity: showCancelDerivedValue.value ? withTiming(1) : withTiming(0),
					transform: [
						{
							translateX: showCancelDerivedValue.value ? withTiming(0) : withTiming(cancelString.length * 11.2)
						}
					]
				}
			})

			const onFocus = useCallback(
				(e: NativeSyntheticEvent<TextInputFocusEventData>) => {
					setShowCancel(true)
					onFocusProp?.(e)
				},
				[onFocusProp, setShowCancel]
			)

			const onPress = useCallback(() => {
				onChangeText?.("")

				inputRef.current?.blur()

				setShowCancel(false)
			}, [onChangeText, inputRef, setShowCancel])

			return (
				<Animated.View
					className="flex-row items-center"
					style={rootStyle}
				>
					<Animated.View
						style={BORDER_CURVE}
						className={cn("bg-card flex-1 flex-row rounded-lg", containerClassName)}
					>
						<View className={cn("absolute bottom-0 left-0 top-0 z-50 justify-center pl-1.5", iconContainerClassName)}>
							<Icon
								color={iconColor ?? colors.grey3}
								name="magnify"
								size={22}
							/>
						</View>
						<TextInput
							ref={inputRef}
							placeholder={placeholder ?? t("nwui.search.placeholder")}
							className={cn(
								!showCancel && "active:bg-muted/5 dark:active:bg-muted/20",
								"text-foreground flex-1 rounded-lg py-2 pl-8  pr-1 text-[17px]",
								className
							)}
							value={value}
							onChangeText={onChangeText}
							onFocus={onFocus}
							clearButtonMode="while-editing"
							role="searchbox"
							{...props}
						/>
					</Animated.View>
					<Animated.View
						ref={animatedRef}
						style={buttonStyle3}
						pointerEvents={!showCancel ? "none" : "auto"}
					>
						<Pressable
							onPress={onPress}
							disabled={!showCancel}
							pointerEvents={!showCancel ? "none" : "auto"}
							className="flex-1 justify-center active:opacity-50"
						>
							<Text className="text-primary px-2">{cancelString}</Text>
						</Pressable>
					</Animated.View>
				</Animated.View>
			)
		}
	)
)

SearchInput.displayName = "SearchInput"
