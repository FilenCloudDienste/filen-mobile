export type SettingsItem =
	| {
			id: string
			testID: string
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
	listFooter?: React.ReactNode
	listHeader?: React.ReactNode
}

export * from "./settings"
