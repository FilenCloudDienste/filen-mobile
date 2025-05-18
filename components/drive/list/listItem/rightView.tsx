import { View } from "react-native"
import { memo } from "react"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import DropdownMenu from "./menus/dropdownMenu"

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
				<DropdownMenu
					item={item}
					queryParams={queryParams}
					isAvailableOffline={isAvailableOffline}
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
				</DropdownMenu>
			</View>
		)
	}
)

RightView.displayName = "RightView"

export default RightView
