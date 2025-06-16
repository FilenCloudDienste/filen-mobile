export type SettingsItem =
	| {
			id: string
			title: string
			subTitle?: string
			leftView?: React.ReactNode
			rightView?: React.ReactNode
			destructive?: boolean
			rightText?: string
			badge?: number
			onPress?: () => void
	  }
	| string

export type SettingsProps = {
	items: SettingsItem[]
	title: string
	showSearchBar: boolean
	hideHeader?: boolean
	disableAndroidRipple?: boolean
	loading?: boolean
}

export * from "./settings"
