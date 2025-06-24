import TextEditorComponent from "@/components/textEditor"
import RequireInternet from "@/components/requireInternet"

export default function TextEditor() {
	return (
		<RequireInternet>
			<TextEditorComponent />
		</RequireInternet>
	)
}
