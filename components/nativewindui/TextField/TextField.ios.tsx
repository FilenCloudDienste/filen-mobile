import { useAugmentedRef, useControllableState } from "@rn-primitives/hooks"
import { forwardRef, memo, useCallback } from "react"
import { Pressable, TextInput, View } from "react-native"
import { type TextFieldProps, type TextFieldRef } from "./types"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"

export const TextField = memo(
	forwardRef<TextFieldRef, TextFieldProps>(
		(
			{
				value: valueProp,
				onChangeText: onChangeTextProp,
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
				materialVariant: _materialVariant,
				materialRingColor: _materialRingColor,
				materialHideActionIcons: _materialHideActionIcons,
				...props
			},
			ref
		) => {
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
				<Pressable
					className={cn(editable === false && "opacity-50", containerClassName)}
					disabled={editable === false}
					onPress={focus}
				>
					{!!label && (
						<View className={cn("flex-row pt-2", !leftView ? "pl-1.5" : "pl-2")}>
							{leftView}
							<Text className={cn("text-muted-foreground", !leftView ? "pl-1" : "pl-2", labelClassName)}>{label}</Text>
						</View>
					)}
					<View className="flex-row">
						{!!leftView && !label && leftView}
						<TextInput
							ref={inputRef}
							editable={editable}
							className={cn("text-foreground flex-1 px-2.5 py-3 text-[17px]", className)}
							onChangeText={onChangeText}
							value={value}
							clearButtonMode="while-editing"
							accessibilityHint={accessibilityHint ?? errorMessage}
							{...props}
						/>
						{rightView}
					</View>
				</Pressable>
			)
		}
	)
)

TextField.displayName = "iOSTextField"
