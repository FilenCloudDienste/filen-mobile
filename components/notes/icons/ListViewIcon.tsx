import { memo } from "react"
import Svg, { Path } from "react-native-svg"

export type ListViewIconProps = {
	size?: number
	color?: string
}

export const ListViewIcon = memo(({ size = 24, color = "#000000" }: ListViewIconProps) => {
	return (
		<Svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={color}
		>
			<Path d="M23.077 7.154H0.923A0.923 0.923 0 0 1 0 6.231V0.923A0.923 0.923 0 0 1 0.923 0H23.077A0.923 0.923 0 0 1 24 0.923V6.231A0.923 0.923 0 0 1 23.077 7.154Zm-21.231-1.846H22.154V1.846H1.846Z" />
			<Path d="M23.077 15.538H0.923A0.923 0.923 0 0 1 0 14.615V9.308A0.923 0.923 0 0 1 0.923 8.385H23.077A0.923 0.923 0 0 1 24 9.308V14.615A0.923 0.923 0 0 1 23.077 15.538Zm-21.231-1.846H22.154V10.231H1.846Z" />
			<Path d="M23.077 24H0.923A0.923 0.923 0 0 1 0 23.077V17.769A0.923 0.923 0 0 1 0.923 16.846H23.077A0.923 0.923 0 0 1 24 17.769V23.077A0.923 0.923 0 0 1 23.077 24ZM1.846 22.154H22.154V18.692H1.846Z" />
		</Svg>
	)
})

ListViewIcon.displayName = "ListViewIcon"

export default ListViewIcon
