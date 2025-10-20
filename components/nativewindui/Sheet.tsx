import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal } from "@gorhom/bottom-sheet"
import { memo, forwardRef, useCallback, useRef } from "react"
import { useColorScheme } from "@/lib/useColorScheme"

export const Sheet = memo(
	forwardRef<BottomSheetModal, React.ComponentPropsWithoutRef<typeof BottomSheetModal>>(
		({ backgroundStyle, style, handleIndicatorStyle, ...props }, ref) => {
			const { colors } = useColorScheme()

			const renderBackdrop = useCallback(
				(props: BottomSheetBackdropProps) => (
					<BottomSheetBackdrop
						{...props}
						disappearsOnIndex={-1}
					/>
				),
				[]
			)

			return (
				<BottomSheetModal
					ref={ref}
					index={0}
					backgroundStyle={
						backgroundStyle ?? {
							backgroundColor: colors.card
						}
					}
					style={
						style ?? {
							borderWidth: 1,
							borderColor: colors.grey5,
							borderTopStartRadius: 16,
							borderTopEndRadius: 16
						}
					}
					handleIndicatorStyle={
						handleIndicatorStyle ?? {
							backgroundColor: colors.grey4
						}
					}
					backdropComponent={renderBackdrop}
					{...props}
				/>
			)
		}
	)
)

Sheet.displayName = "Sheet"

export function useSheetRef() {
	return useRef<BottomSheetModal>(null)
}
