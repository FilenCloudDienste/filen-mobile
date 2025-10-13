import { VariantProps, cva } from "class-variance-authority"
import { cssInterop } from "nativewind"
import { useContext, createContext, memo } from "react"
import { cn } from "@/lib/cn"
import { NativeText as RNText } from "react-native-boost/runtime"

cssInterop(RNText, {
	className: "style"
})

export const textVariants = cva("text-foreground", {
	variants: {
		variant: {
			largeTitle: "text-4xl",
			title1: "text-2xl",
			title2: "text-[22px] leading-7",
			title3: "text-xl",
			heading: "text-[17px] leading-6 font-semibold",
			body: "text-[17px] leading-6",
			callout: "text-base",
			subhead: "text-[15px] leading-6",
			footnote: "text-[13px] leading-5",
			caption1: "text-xs",
			caption2: "text-[11px] leading-4"
		},
		color: {
			primary: "",
			secondary: "text-secondary-foreground/90",
			tertiary: "text-muted-foreground/90",
			quarternary: "text-muted-foreground/50"
		}
	},
	defaultVariants: {
		variant: "body",
		color: "primary"
	}
})

export const TextClassContext = createContext<string | undefined>(undefined)

export const Text = memo(
	({ className, variant, color, ...props }: React.ComponentPropsWithoutRef<typeof RNText> & VariantProps<typeof textVariants>) => {
		const textClassName = useContext(TextClassContext)

		return (
			<RNText
				className={cn(
					textVariants({
						variant,
						color
					}),
					textClassName,
					className
				)}
				{...props}
			/>
		)
	}
)

Text.displayName = "Text"
