import { Icon } from "@roninoss/icons"
import { Pressable, View, type PressableProps, type ViewProps, type ViewStyle } from "react-native"
import { memo } from "react"
import { cn } from "~/lib/cn"
import { useColorScheme } from "~/lib/useColorScheme"

// Add as class when possible: https://github.com/marklawlor/nativewind/issues/522
export const BORDER_CURVE: ViewStyle = {
	borderCurve: "continuous"
}

export type withoutChildren<T> = Omit<T, "children">

export type StepperProps = withoutChildren<ViewProps> & {
	subtractButton?: withoutChildren<PressableProps>
	addButton?: withoutChildren<PressableProps>
}

export const Stepper = memo(({ className, subtractButton, addButton, ...props }: StepperProps) => {
	const { colors } = useColorScheme()

	return (
		<View
			style={BORDER_CURVE}
			className={cn(
				"ios:bg-card ios:rounded-md ios:border-0 border-border flex-row items-center overflow-hidden rounded-full border",
				className
			)}
			{...props}
		>
			<Pressable
				{...subtractButton}
				className={cn(
					"ios:active:bg-border/30 active:bg-primary/10 dark:active:bg-primary/15 dark:ios:active:bg-border/30 ios:px-3 ios:h-[30px] h-[38px] justify-center px-5",
					subtractButton?.disabled && "bg-border/20 opacity-70 dark:opacity-50",
					subtractButton?.className
				)}
			>
				<Icon
					name="minus"
					size={21}
					color={colors.foreground}
					materialIcon={{
						style: {
							opacity: 0.6
						}
					}}
				/>
			</Pressable>
			<View className="ios:h-5 ios:bg-border bg-border h-[38px] w-px rounded-full" />
			<Pressable
				{...addButton}
				className={cn(
					"ios:active:bg-border/30 active:bg-primary/10 dark:active:bg-primary/15 dark:ios:active:bg-border/30 ios:px-3 ios:h-[30px] h-[38px] justify-center px-5",
					addButton?.disabled && "bg-border/20 opacity-70 dark:opacity-50",
					addButton?.className
				)}
			>
				<Icon
					name="plus"
					size={21}
					color={colors.foreground}
					materialIcon={{
						style: {
							opacity: 0.6
						}
					}}
				/>
			</Pressable>
		</View>
	)
})

Stepper.displayName = "Stepper"
