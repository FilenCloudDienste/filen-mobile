import React, { memo } from "react"
import { View, Text } from "react-native"
import { getColor } from "../../../style"
import useDarkMode from "../../../lib/hooks/useDarkMode"

const NormalToast = memo(({ message }: { message?: string | undefined }) => {
	const darkMode = useDarkMode()

	return (
		<View
			pointerEvents="box-none"
			style={{
				zIndex: 99999
			}}
		>
			<Text
				style={{
					color: getColor(darkMode, "textPrimary"),
					fontSize: 15,
					fontWeight: "400"
				}}
			>
				{message}
			</Text>
		</View>
	)
})

export default NormalToast
