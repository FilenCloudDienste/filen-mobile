import TransfersComponent from "@/components/transfers"
import RequireInternet from "@/components/requireInternet"

export default function Transfers() {
	return (
		<RequireInternet>
			<TransfersComponent />
		</RequireInternet>
	)
}
