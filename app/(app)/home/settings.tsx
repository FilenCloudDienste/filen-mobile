import { memo, Fragment } from "react"
import { Settings as SettingsComponent, IconView } from "@/components/settings"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/nativewindui/Avatar"
import { Text } from "@/components/nativewindui/Text"

export const Settings = memo(() => {
	return (
		<SettingsComponent
			title="Settings"
			showSearchBar={false}
			items={[
				{
					id: "1",
					title: "NativeWind UI",
					subTitle: "Apple ID, iCloud+ & Purchases",
					leftView: (
						<Avatar alt="NativeWindUI's avatar">
							<AvatarImage
								source={{
									uri: "https://pbs.twimg.com/profile_images/1782428433898708992/1voyv4_A_400x400.jpg"
								}}
							/>
							<AvatarFallback>
								<Text>NU</Text>
							</AvatarFallback>
						</Avatar>
					)
				},
				{
					id: "2",
					title: "Team members",
					leftView: (
						<Fragment>
							<Avatar
								alt="Zach Nugent's avatar"
								className="h-6 w-6"
							>
								<AvatarImage
									source={{
										uri: "https://avatars.githubusercontent.com/u/63797719?v=4"
									}}
								/>
								<AvatarFallback>
									<Text>ZN</Text>
								</AvatarFallback>
							</Avatar>
							<Avatar
								alt="Dan Stepanov's avatar"
								className="-ml-2 h-6 w-6"
							>
								<AvatarImage
									source={{
										uri: "https://avatars.githubusercontent.com/u/5482800?v=4"
									}}
								/>
								<AvatarFallback>
									<Text>DS</Text>
								</AvatarFallback>
							</Avatar>
						</Fragment>
					)
				},
				{
					id: "3",
					title: "Memberships & Subscriptions",
					badge: 3
				},
				"gap 2",
				{
					id: "4",
					title: "Wi-Fi",
					rightText: "NU's iPhone",
					leftView: (
						<IconView
							name="wifi"
							className="bg-blue-500"
						/>
					)
				},
				{
					id: "5",
					title: "Play Station",
					leftView: (
						<IconView
							name="sony-playstation"
							className="bg-blue-600"
						/>
					)
				},
				{
					id: "6",
					title: "Gift Cards",
					leftView: (
						<IconView
							name="card-giftcard"
							className="bg-green-500"
						/>
					)
				},
				"gap 3",
				{
					id: "7",
					title: "Locations",
					leftView: (
						<IconView
							name="map-outline"
							className="bg-red-500"
						/>
					)
				},
				{
					id: "8",
					title: "Notifications",
					leftView: (
						<IconView
							name="bell-outline"
							className="bg-destructive"
						/>
					)
				},
				{
					id: "9",
					title: "Focus",
					leftView: (
						<IconView
							name="weather-night"
							className="bg-violet-500"
						/>
					)
				},
				{
					id: "10",
					title: "Screen Time",
					leftView: (
						<IconView
							name="timer-outline"
							className="bg-violet-600"
						/>
					)
				},
				"gap 4",
				{
					id: "11",
					title: "General",
					leftView: (
						<IconView
							name="cog-outline"
							className="bg-gray-500"
						/>
					)
				},
				{
					id: "12",
					title: "Game Center",
					leftView: (
						<IconView
							name="controller-classic-outline"
							className="bg-gray-600"
						/>
					)
				},
				{
					id: "13",
					title: "Accessibility",
					leftView: (
						<IconView
							name="accessibility"
							className="bg-sky-500"
						/>
					)
				},
				{
					id: "14",
					title: "Artificial Intelligence",
					leftView: (
						<IconView
							name="star-four-points"
							className="bg-sky-400"
						/>
					)
				}
			]}
		/>
	)
})

Settings.displayName = "Settings"

export default Settings
