import * as Slot from "@rn-primitives/slot"
import { cva, type VariantProps } from "class-variance-authority"
import { memo, forwardRef, useRef, useMemo, useCallback } from "react"
import { Platform, Pressable, PressableProps, View, ViewStyle, type GestureResponderEvent } from "react-native"
import { TextClassContext } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"
import { COLORS } from "@/theme/colors"

export const buttonVariants = cva("flex-row items-center justify-center gap-2", {
	variants: {
		variant: {
			primary: "ios:active:opacity-80 bg-primary",
			secondary: "ios:border-primary ios:active:bg-primary/5 border border-foreground/40",
			tonal: "ios:bg-primary/10 dark:ios:bg-primary/10 ios:active:bg-primary/15 bg-primary/15 dark:bg-primary/30",
			plain: "ios:active:opacity-70"
		},
		size: {
			none: "",
			sm: "py-1 px-2.5 rounded-full",
			md: "ios:rounded-lg py-2 ios:py-1.5 ios:px-3.5 px-5 rounded-full",
			lg: "py-2.5 px-5 ios:py-2 rounded-xl gap-2",
			icon: "ios:rounded-lg h-10 w-10 rounded-full"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
})

export const androidRootVariants = cva("overflow-hidden", {
	variants: {
		size: {
			none: "",
			icon: "rounded-full",
			sm: "rounded-full",
			md: "rounded-full",
			lg: "rounded-xl"
		}
	},
	defaultVariants: {
		size: "md"
	}
})

export const buttonTextVariants = cva("font-medium", {
	variants: {
		variant: {
			primary: "text-white",
			secondary: "ios:text-primary text-foreground",
			tonal: "ios:text-primary text-foreground",
			plain: "text-foreground"
		},
		size: {
			none: "",
			icon: "",
			sm: "text-[15px] leading-5",
			md: "text-[17px] leading-7",
			lg: "text-[17px] leading-7"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
})

export function convertToRGBA(rgb: string, opacity: number): string {
	const rgbValues = rgb.match(/\d+/g)

	if (!rgbValues || rgbValues.length !== 3 || !rgbValues[0] || !rgbValues[1] || !rgbValues[2]) {
		//throw new Error("Invalid RGB color format")

		return "rgba(0,0,0,0)" // Fallback to black with 0 opacity
	}

	const red = parseInt(rgbValues[0], 10)
	const green = parseInt(rgbValues[1], 10)
	const blue = parseInt(rgbValues[2], 10)

	if (opacity < 0 || opacity > 1) {
		//throw new Error("Opacity must be a number between 0 and 1")

		return "rgba(0,0,0,0)" // Fallback to black with 0 opacity
	}

	return `rgba(${red},${green},${blue},${opacity})`
}

export const ANDROID_RIPPLE = {
	dark: {
		primary: {
			color: convertToRGBA(COLORS.dark.grey3, 0.4),
			borderless: false
		},
		secondary: {
			color: convertToRGBA(COLORS.dark.grey5, 0.8),
			borderless: false
		},
		plain: {
			color: convertToRGBA(COLORS.dark.grey5, 0.8),
			borderless: false
		},
		tonal: {
			color: convertToRGBA(COLORS.dark.grey5, 0.8),
			borderless: false
		}
	},
	light: {
		primary: {
			color: convertToRGBA(COLORS.light.grey4, 0.4),
			borderless: false
		},
		secondary: {
			color: convertToRGBA(COLORS.light.grey5, 0.4),
			borderless: false
		},
		plain: {
			color: convertToRGBA(COLORS.light.grey5, 0.4),
			borderless: false
		},
		tonal: {
			color: convertToRGBA(COLORS.light.grey6, 0.4),
			borderless: false
		}
	}
}

// Add as class when possible: https://github.com/marklawlor/nativewind/issues/522
export const BORDER_CURVE: ViewStyle = {
	borderCurve: "continuous"
}

export type ButtonVariantProps = Omit<VariantProps<typeof buttonVariants>, "variant"> & {
	variant?: Exclude<VariantProps<typeof buttonVariants>["variant"], null>
}

export type AndroidOnlyButtonProps = {
	/**
	 * ANDROID ONLY: The class name of root responsible for hidding the ripple overflow.
	 */
	androidRootClassName?: string
}

export type ButtonProps = PressableProps & ButtonVariantProps & AndroidOnlyButtonProps

export const Root = Platform.OS === "android" ? View : Slot.Pressable

export const Button = memo(
	forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
		({ className, variant = "primary", size, style = BORDER_CURVE, androidRootClassName, ...props }, ref) => {
			const { colorScheme } = useColorScheme()
			const clickTimeoutRef = useRef<number>(0)

			const value = useMemo(() => {
				return buttonTextVariants({
					variant,
					size
				})
			}, [variant, size])

			const rootClassName = useMemo(() => {
				return Platform.select({
					ios: undefined,
					default: androidRootVariants({
						size,
						className: androidRootClassName
					})
				})
			}, [androidRootClassName, size])

			const onPress = useCallback(
				(e: GestureResponderEvent) => {
					if (props?.disabled) {
						return
					}

					const now = Date.now()

					if (clickTimeoutRef.current > now) {
						return
					}

					clickTimeoutRef.current = now + 500 // 500ms cooldown to prevent double clicks

					props?.onPress?.(e)
				},
				[props]
			)

			const noop = useCallback(() => {}, [])

			return (
				<TextClassContext.Provider value={value}>
					<Root className={rootClassName}>
						<Pressable
							className={cn(
								props.disabled && "opacity-50",
								buttonVariants({
									variant,
									size,
									className
								})
							)}
							ref={ref}
							style={style}
							android_ripple={ANDROID_RIPPLE[colorScheme][variant]}
							delayLongPress={200}
							onLongPress={noop}
							unstable_pressDelay={100}
							{...props}
							onPress={onPress}
						/>
					</Root>
				</TextClassContext.Provider>
			)
		}
	)
)

Button.displayName = "Button"
