import { useAugmentedRef, useControllableState } from "@rn-primitives/hooks"
import { Icon } from "@roninoss/icons"
import { memo, forwardRef, useCallback } from "react"
import { Pressable, TextInput, View } from "react-native"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import type { SearchInputProps } from "./types"
import { Button } from "@/components/nativewindui/Button"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"
import { useTranslation } from "react-i18next"

export const SearchInput = memo(
	forwardRef<React.ElementRef<typeof TextInput>, SearchInputProps>(
		(
			{
				value: valueProp,
				onChangeText: onChangeTextProp,
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

			const [value = "", onChangeText] = useControllableState({
				prop: valueProp,
				defaultProp: valueProp ?? "",
				onChange: onChangeTextProp
			})

			const clear = useCallback(() => {
				onChangeText?.("")
			}, [onChangeText])

			const inputRef = useAugmentedRef({
				ref,
				methods: {
					focus: () => inputRef?.current?.focus(),
					blur: () => inputRef?.current?.blur(),
					clear
				}
			})

			const focus = useCallback(() => {
				inputRef?.current?.focus()
			}, [inputRef])

			return (
				<Button
					variant="plain"
					className={cn("android:gap-0 android:h-14 bg-card flex-row items-center rounded-full px-2", containerClassName)}
					onPress={focus}
				>
					<View
						className={cn("p-2", iconContainerClassName)}
						pointerEvents="none"
					>
						<Icon
							color={iconColor ?? colors.grey2}
							name="magnify"
							size={24}
						/>
					</View>
					<View
						className="flex-1"
						pointerEvents="none"
					>
						<TextInput
							ref={inputRef}
							placeholder={placeholder ?? t("nwui.search.placeholder")}
							className={cn("text-foreground flex-1 rounded-r-full p-2 text-[17px]", className)}
							placeholderTextColor={colors.grey2}
							value={value}
							onChangeText={onChangeText}
							role="searchbox"
							{...props}
						/>
					</View>
					{!!value && (
						<Animated.View
							entering={FadeIn}
							exiting={FadeOut.duration(150)}
						>
							<Pressable
								className="p-2"
								onPress={clear}
							>
								<Icon
									color={colors.grey2}
									name="close"
									size={24}
								/>
							</Pressable>
						</Animated.View>
					)}
				</Button>
			)
		}
	)
)

SearchInput.displayName = "SearchInput"
