import { View } from "react-native"
import { memo } from "react"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import Menu from "./menu"

export const RightView = memo(
	({
		item,
		queryParams,
		isAvailableOffline
	}: {
		item: DriveCloudItem
		queryParams: FetchCloudItemsParams
		isAvailableOffline: boolean
	}) => {
		const { colors } = useColorScheme()

		return (
			<View className="flex-1 justify-center px-4">
				<Menu
					type="dropdown"
					item={item}
					queryParams={queryParams}
					isAvailableOffline={isAvailableOffline}
					insidePreview={false}
				>
					<Button
						variant="plain"
						size="icon"
					>
						<Icon
							namingScheme="sfSymbol"
							name="ellipsis"
							color={colors.foreground}
						/>
					</Button>
				</Menu>
			</View>
		)
	}
)

RightView.displayName = "RightView"

export default RightView
