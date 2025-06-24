import PDFPreviewComponent from "@/components/pdfPreview"
import RequireInternet from "@/components/requireInternet"

export default function PDFPreview() {
	return (
		<RequireInternet>
			<PDFPreviewComponent />
		</RequireInternet>
	)
}
