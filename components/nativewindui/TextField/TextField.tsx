import { useAugmentedRef, useControllableState } from "@rn-primitives/hooks"
import { Icon } from "@roninoss/icons"
import { cva } from "class-variance-authority"
import { memo, forwardRef, useState, useMemo, useCallback, Fragment } from "react"
import { Pressable, TextInput, View, ViewProps, ViewStyle, type NativeSyntheticEvent, type TextInputFocusEventData } from "react-native"
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated"
import { type TextFieldProps, type TextFieldRef } from "./types"
import { cn } from "~/lib/cn"
import { useColorScheme } from "~/lib/useColorScheme"

export const TextField = memo(
	forwardRef<TextFieldRef, TextFieldProps>(
		(
			{
				value: valueProp,
				defaultValue: defaultValueProp,
				onChangeText: onChangeTextProp,
				onFocus: onFocusProp,
				onBlur: onBlurProp,
				placeholder,
				editable,
				className,
				children,
				leftView,
				rightView,
				label,
				labelClassName,
				containerClassName,
				accessibilityHint,
				errorMessage,
				materialVariant = "outlined",
				materialRingColor,
				materialHideActionIcons,
				...props
			},
			ref
		) => {
			const [value = "", onChangeText] = useControllableState({
				prop: valueProp,
				defaultProp: defaultValueProp ?? valueProp ?? "",
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

			const [isFocused, setIsFocused] = useState(false)

			const onFocus = useCallback(
				(e: NativeSyntheticEvent<TextInputFocusEventData>) => {
					setIsFocused(true)
					onFocusProp?.(e)
				},
				[onFocusProp]
			)

			const onBlur = useCallback(
				(e: NativeSyntheticEvent<TextInputFocusEventData>) => {
					setIsFocused(false)
					onBlurProp?.(e)
				},
				[onBlurProp]
			)

			const InputWrapper = useMemo(() => {
				return materialVariant === "filled" ? FilledWrapper : FilledWrapper
			}, [materialVariant])

			return (
				<Pressable
					className={rootVariants({
						variant: materialVariant,
						state: getInputState({
							isFocused,
							hasError: !!errorMessage,
							editable
						}),
						className: containerClassName
					})}
					style={
						materialRingColor
							? {
									borderColor: materialRingColor
							  }
							: undefined
					}
					disabled={editable === false}
					onPress={focus}
				>
					<View
						className={innerRootVariants({
							variant: materialVariant,
							state: getInputState({
								isFocused,
								hasError: !!errorMessage,
								editable
							})
						})}
						style={
							materialRingColor && isFocused
								? {
										borderColor: materialRingColor
								  }
								: undefined
						}
					>
						{leftView}
						<InputWrapper>
							{!!label && (
								<MaterialLabel
									materialVariant={materialVariant}
									isFocused={isFocused}
									value={value}
									materialLabel={label}
									hasLeftView={!!leftView}
									className={labelClassName}
									hasError={!!errorMessage}
								/>
							)}
							<TextInput
								ref={inputRef}
								editable={editable}
								className={cn(
									"text-foreground flex-1 rounded py-3 pl-2.5 text-[17px] dark:placeholder:text-white/30",
									materialVariant === "filled" && !!label && "pb-2 pt-5",
									className
								)}
								placeholder={isFocused || !label ? placeholder : ""}
								onFocus={onFocus}
								onBlur={onBlur}
								onChangeText={onChangeText}
								value={value}
								accessibilityHint={accessibilityHint ?? errorMessage}
								{...props}
							/>
						</InputWrapper>
						{!materialHideActionIcons && (
							<Fragment>
								{errorMessage ? (
									<MaterialErrorIcon />
								) : (
									!!value &&
									isFocused && (
										<MaterialClearIcon
											clearText={clear}
											editable={editable}
										/>
									)
								)}
							</Fragment>
						)}
						{rightView}
					</View>
				</Pressable>
			)
		}
	)
)

TextField.displayName = "TextField"

export type InputState = "idle" | "focused" | "error" | "errorAndFocused" | "disabled"

export type GetInputArgs = {
	isFocused: boolean
	hasError?: boolean
	editable?: boolean
}

export function getInputState(args: GetInputArgs): InputState {
	if (args.editable === false) {
		return "disabled"
	}

	if (args.hasError && args.isFocused) {
		return "errorAndFocused"
	}

	if (args.isFocused) {
		return "focused"
	}

	if (args.hasError) {
		return "error"
	}

	return "idle"
}

export const rootVariants = cva("relative rounded-[5px]", {
	variants: {
		variant: {
			outlined: "border",
			filled: "border-b rounded-b-none"
		},
		state: {
			idle: "border-transparent",
			error: "border-transparent",
			focused: "border-primary",
			errorAndFocused: "border-destructive",
			disabled: "opacity-50"
		}
	},
	defaultVariants: {
		variant: "outlined",
		state: "idle"
	}
})

export const innerRootVariants = cva("flex-row rounded", {
	variants: {
		variant: {
			outlined: "border border-border",
			filled: "border-b bg-border/70 rounded-b-none "
		},
		state: {
			idle: "border-foreground/30",
			error: "border-destructive",
			focused: "border-primary",
			errorAndFocused: "border-destructive",
			disabled: "border-foreground/30"
		}
	},
	defaultVariants: {
		variant: "outlined",
		state: "idle"
	}
})

export const FilledWrapper = memo((props: ViewProps) => {
	return (
		<View
			className="relative flex-1 flex-row"
			{...props}
		/>
	)
})

FilledWrapper.displayName = "FilledWrapper"

export type MaterialLabelProps = {
	isFocused: boolean
	value: string
	materialLabel: string
	hasLeftView: boolean
	hasError?: boolean
	className?: string
	materialVariant: "outlined" | "filled"
}

export const DEFAULT_TEXT_FIELD_HEIGHT = 56

export const MaterialLabel = memo((props: MaterialLabelProps) => {
	const isLifted = useMemo(() => props.isFocused || !!props.value, [props.isFocused, props.value])
	const isLiftedDerived = useDerivedValue(() => isLifted)
	const hasLeftViewDerived = useDerivedValue(() => props.hasLeftView)
	const variantDerived = useDerivedValue(() => props.materialVariant)

	const animatedRootStyle = useAnimatedStyle(() => {
		const style: ViewStyle = {
			position: "absolute",
			alignSelf: "center"
		}

		if (variantDerived.value === "outlined") {
			style.paddingLeft = withTiming(hasLeftViewDerived.value && isLiftedDerived.value ? 0 : 12, {
				duration: 200
			})
			style.transform = [
				{
					translateY: withTiming(isLiftedDerived.value ? -DEFAULT_TEXT_FIELD_HEIGHT / 2 : 0, {
						duration: 200
					})
				},
				{
					translateX: withTiming(hasLeftViewDerived.value && isLiftedDerived.value ? -12 : 0, {
						duration: 200
					})
				}
			]
		}

		if (variantDerived.value === "filled") {
			style.paddingLeft = 8
			style.transform = [
				{
					translateY: withTiming(isLiftedDerived.value ? -DEFAULT_TEXT_FIELD_HEIGHT / 4 : 0, {
						duration: 200
					})
				},
				{
					translateX: 0
				}
			]
		}
		return style
	})

	const animatedTextStyle = useAnimatedStyle(() => {
		return {
			fontSize: withTiming(isLiftedDerived.value ? 10 : 17, { duration: 200 })
		}
	})

	return (
		<Animated.View
			style={animatedRootStyle}
			pointerEvents="none"
		>
			<Animated.Text
				className={cn(
					"bg-card/0 text-foreground/70 rounded",
					isLifted && "px-0.5",
					isLifted && props.materialVariant === "outlined" && "bg-background",
					props.isFocused && "text-primary/60 dark:text-primary",
					props.hasError && "text-destructive dark:text-destructive",
					props.className
				)}
				style={animatedTextStyle}
			>
				{props.materialLabel}
			</Animated.Text>
		</Animated.View>
	)
})

MaterialLabel.displayName = "MaterialLabel"

export type MaterialClearIconProps = {
	editable?: boolean
	clearText: () => void
}

export const MaterialClearIcon = memo((props: MaterialClearIconProps) => {
	const { colors } = useColorScheme()

	return (
		<Animated.View
			entering={FadeIn.duration(200)}
			exiting={FadeOut.duration(200)}
		>
			<Pressable
				disabled={props.editable === false}
				className="flex-1 justify-center px-2 active:opacity-65"
				onPress={props.clearText}
			>
				<Icon
					color={colors.grey2}
					name="close-circle-outline"
					size={24}
				/>
			</Pressable>
		</Animated.View>
	)
})

MaterialClearIcon.displayName = "MaterialClearIcon"

export const MaterialErrorIcon = memo(() => {
	const { colors } = useColorScheme()

	return (
		<Animated.View
			pointerEvents="none"
			entering={FadeIn.duration(200)}
			exiting={FadeOut.duration(200)}
			className="justify-center pr-2"
		>
			<Icon
				color={colors.destructive}
				name="close-circle-outline"
				materialIcon={{
					name: "alert-circle",
					type: "MaterialCommunityIcons"
				}}
				size={24}
			/>
		</Animated.View>
	)
})

MaterialErrorIcon.displayName = "MaterialErrorIcon"
