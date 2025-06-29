import { memo, useCallback, useMemo } from "react"
import { Settings as SettingsComponent } from "@/components/settings"
import useAccountQuery from "@/queries/useAccountQuery"
import { Platform } from "react-native"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import nodeWorker from "@/lib/nodeWorker"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem } from "@/components/nativewindui/DropdownMenu/utils"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { Text } from "@/components/nativewindui/Text"
import { useTranslation } from "react-i18next"

export const countries: string[] = [
	"Afghanistan",
	"Albania",
	"Algeria",
	"Andorra",
	"Angola",
	"Antigua and Barbuda",
	"Argentina",
	"Armenia",
	"Australia",
	"Austria",
	"Azerbaijan",
	"Bahamas",
	"Bahrain",
	"Bangladesh",
	"Barbados",
	"Belarus",
	"Belgium",
	"Belize",
	"Benin",
	"Bhutan",
	"Bolivia",
	"Bosnia and Herzegovina",
	"Botswana",
	"Brazil",
	"Brunei",
	"Bulgaria",
	"Burkina Faso",
	"Burundi",
	"Cabo Verde",
	"Cambodia",
	"Cameroon",
	"Canada",
	"Central African Republic",
	"Chad",
	"Chile",
	"China",
	"Colombia",
	"Comoros",
	"Democratic Republic of the Congo",
	"Republic of the Congo",
	"Costa Rica",
	"Cote d'Ivoire",
	"Croatia",
	"Cuba",
	"Cyprus",
	"Czech Republic",
	"Denmark",
	"Djibouti",
	"Dominica",
	"Dominican Republic",
	"Ecuador",
	"Egypt",
	"El Salvador",
	"Equatorial Guinea",
	"Eritrea",
	"Estonia",
	"Eswatini",
	"Ethiopia",
	"Fiji",
	"Finland",
	"France",
	"Gabon",
	"Gambia",
	"Georgia",
	"Germany",
	"Ghana",
	"Greece",
	"Grenada",
	"Guatemala",
	"Guinea",
	"Guinea-Bissau",
	"Guyana",
	"Haiti",
	"Honduras",
	"Hungary",
	"Iceland",
	"India",
	"Indonesia",
	"Iran",
	"Iraq",
	"Ireland",
	"Israel",
	"Italy",
	"Jamaica",
	"Japan",
	"Jordan",
	"Kazakhstan",
	"Kenya",
	"Kiribati",
	"North Korea",
	"South Korea",
	"Kosovo",
	"Kuwait",
	"Kyrgyzstan",
	"Laos",
	"Latvia",
	"Lebanon",
	"Lesotho",
	"Liberia",
	"Libya",
	"Liechtenstein",
	"Lithuania",
	"Luxembourg",
	"Madagascar",
	"Malawi",
	"Malaysia",
	"Maldives",
	"Mali",
	"Malta",
	"Marshall Islands",
	"Mauritania",
	"Mauritius",
	"Mexico",
	"Micronesia",
	"Moldova",
	"Monaco",
	"Mongolia",
	"Montenegro",
	"Morocco",
	"Mozambique",
	"Myanmar",
	"Namibia",
	"Nauru",
	"Nepal",
	"Netherlands",
	"New Zealand",
	"Nicaragua",
	"Niger",
	"Nigeria",
	"North Macedonia",
	"Norway",
	"Oman",
	"Pakistan",
	"Palau",
	"Palestine",
	"Panama",
	"Papua New Guinea",
	"Paraguay",
	"Peru",
	"Philippines",
	"Poland",
	"Portugal",
	"Qatar",
	"Romania",
	"Russia",
	"Rwanda",
	"Saint Kitts and Nevis",
	"Saint Lucia",
	"Saint Vincent and the Grenadines",
	"Samoa",
	"San Marino",
	"Sao Tome and Principe",
	"Saudi Arabia",
	"Senegal",
	"Serbia",
	"Seychelles",
	"Sierra Leone",
	"Singapore",
	"Slovakia",
	"Slovenia",
	"Solomon Islands",
	"Somalia",
	"South Africa",
	"South Sudan",
	"Spain",
	"Sri Lanka",
	"Sudan",
	"Suriname",
	"Sweden",
	"Switzerland",
	"Syria",
	"Taiwan",
	"Tajikistan",
	"Tanzania",
	"Thailand",
	"Timor-Leste",
	"Togo",
	"Tonga",
	"Trinidad and Tobago",
	"Tunisia",
	"Turkey",
	"Turkmenistan",
	"Tuvalu",
	"Uganda",
	"Ukraine",
	"United Arab Emirates",
	"United Kingdom",
	"United States",
	"Uruguay",
	"Uzbekistan",
	"Vanuatu",
	"Vatican City",
	"Venezuela",
	"Vietnam",
	"Yemen",
	"Zambia",
	"Zimbabwe"
]

export const countryDropdownItems = countries.map(country =>
	createDropdownItem({
		actionKey: country,
		title: country
	})
)

export const Personal = memo(() => {
	const { colors } = useColorScheme()
	const { t } = useTranslation()

	const account = useAccountQuery({
		enabled: false
	})

	const onPress = useCallback(
		async (type: "firstName" | "lastName" | "city" | "postalCode" | "street" | "streetNumber" | "companyName" | "vatId") => {
			const inputPromptResponse = await inputPrompt({
				title: t("settings.personal.prompts.edit.title"),
				materialIcon: {
					name: "pencil"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "default",
					defaultValue: account.data?.account.personal[type] ?? "",
					placeholder: ""
				}
			})

			if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
				return
			}

			const value = inputPromptResponse.text.trim()

			if (value.length === 0 || value === account.data?.account.personal[type]) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("updatePersonalInformation", {
					firstName: type === "firstName" ? value : account.data?.account.personal.firstName ?? undefined,
					lastName: type === "lastName" ? value : account.data?.account.personal.lastName ?? undefined,
					city: type === "city" ? value : account.data?.account.personal.city ?? undefined,
					postalCode: type === "postalCode" ? value : account.data?.account.personal.postalCode ?? undefined,
					street: type === "street" ? value : account.data?.account.personal.street ?? undefined,
					streetNumber: type === "streetNumber" ? value : account.data?.account.personal.streetNumber ?? undefined,
					companyName: type === "companyName" ? value : account.data?.account.personal.companyName ?? undefined,
					vatId: type === "vatId" ? value : account.data?.account.personal.vatId ?? undefined,
					country: account.data?.account.personal.country ?? undefined
				})

				await account.refetch()
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		},
		[account, t]
	)

	const changeCountry = useCallback(
		async (country: string) => {
			if (country === account.data?.account.personal.country) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("updatePersonalInformation", {
					firstName: account.data?.account.personal.firstName ?? undefined,
					lastName: account.data?.account.personal.lastName ?? undefined,
					city: account.data?.account.personal.city ?? undefined,
					postalCode: account.data?.account.personal.postalCode ?? undefined,
					street: account.data?.account.personal.street ?? undefined,
					streetNumber: account.data?.account.personal.streetNumber ?? undefined,
					companyName: account.data?.account.personal.companyName ?? undefined,
					vatId: account.data?.account.personal.vatId ?? undefined,
					country
				})

				await account.refetch()
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		},
		[account]
	)

	const items = useMemo(() => {
		return [
			{
				id: "0",
				title: t("settings.personal.items.firstName"),
				rightText: account.data?.account.personal.firstName ?? "",
				subTitle: Platform.OS === "android" ? account.data?.account.personal.firstName ?? "" : undefined,
				onPress: () => onPress("firstName")
			},
			{
				id: "1",
				title: t("settings.personal.items.lastName"),
				rightText: account.data?.account.personal.lastName ?? "",
				subTitle: Platform.OS === "android" ? account.data?.account.personal.lastName ?? "" : undefined,
				onPress: () => onPress("lastName")
			},
			{
				id: "2",
				title: t("settings.personal.items.companyName"),
				rightText: account.data?.account.personal.companyName ?? "",
				subTitle: Platform.OS === "android" ? account.data?.account.personal.companyName ?? "" : undefined,
				onPress: () => onPress("companyName")
			},
			{
				id: "3",
				title: t("settings.personal.items.vatId"),
				rightText: account.data?.account.personal.vatId ?? "",
				subTitle: Platform.OS === "android" ? account.data?.account.personal.vatId ?? "" : undefined,
				onPress: () => onPress("vatId")
			},
			{
				id: "4",
				title: t("settings.personal.items.street"),
				rightText: account.data?.account.personal.street ?? "",
				subTitle: Platform.OS === "android" ? account.data?.account.personal.street ?? "" : undefined,
				onPress: () => onPress("street")
			},
			{
				id: "5",
				title: t("settings.personal.items.streetNumber"),
				rightText: account.data?.account.personal.streetNumber ?? "",
				subTitle: Platform.OS === "android" ? account.data?.account.personal.streetNumber ?? "" : undefined,
				onPress: () => onPress("streetNumber")
			},
			{
				id: "6",
				title: t("settings.personal.items.city"),
				rightText: account.data?.account.personal.city ?? "",
				subTitle: Platform.OS === "android" ? account.data?.account.personal.city ?? "" : undefined,
				onPress: () => onPress("city")
			},
			{
				id: "7",
				title: t("settings.personal.items.postalCode"),
				rightText: account.data?.account.personal.postalCode ?? "",
				subTitle: Platform.OS === "android" ? account.data?.account.personal.postalCode ?? "" : undefined,
				onPress: () => onPress("postalCode")
			},
			{
				id: "8",
				title: t("settings.personal.items.country"),
				subTitle: Platform.OS === "android" ? account.data?.account.personal.country ?? "" : undefined,
				rightView: (
					<DropdownMenu
						items={countryDropdownItems}
						onItemPress={item => changeCountry(item.actionKey)}
					>
						<Button
							size={Platform.OS === "ios" ? "none" : "icon"}
							variant="plain"
							className="items-center justify-start"
						>
							{Platform.OS === "ios" && account.data?.account.personal.country && (
								<Text
									variant="callout"
									className="ios:px-0 text-muted-foreground px-2 font-normal"
									numberOfLines={1}
								>
									{account.data?.account.personal.country}
								</Text>
							)}
							<Icon
								name="pencil"
								size={24}
								color={colors.grey}
							/>
						</Button>
					</DropdownMenu>
				)
			}
		]
	}, [
		t,
		account.data?.account.personal.city,
		account.data?.account.personal.companyName,
		account.data?.account.personal.country,
		account.data?.account.personal.firstName,
		account.data?.account.personal.lastName,
		account.data?.account.personal.postalCode,
		account.data?.account.personal.street,
		account.data?.account.personal.streetNumber,
		account.data?.account.personal.vatId,
		changeCountry,
		onPress,
		colors.grey
	])

	return (
		<SettingsComponent
			title={t("settings.personal.title")}
			showSearchBar={false}
			loading={account.status !== "success"}
			items={items}
		/>
	)
})

Personal.displayName = "Personal"

export default Personal
