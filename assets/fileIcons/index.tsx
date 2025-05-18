import * as FileSystem from "expo-file-system/next"
import other from "./svg/other.svg"
import Folder from "./svg/folder.svg"
import txt from "./svg/txt.svg"
import pdf from "./svg/pdf.svg"
import image from "./svg/image.svg"
import archive from "./svg/archive.svg"
import audio from "./svg/audio.svg"
import video from "./svg/video.svg"
import code from "./svg/code.svg"
import exe from "./svg/exe.svg"
import doc from "./svg/doc.svg"
import xls from "./svg/xls.svg"
import ppt from "./svg/ppt.svg"
import apple from "./svg/apple.svg"
import android from "./svg/android.svg"
import iso from "./svg/iso.svg"
import psd from "./svg/psd.svg"
import cad from "./svg/cad.svg"
import { memo, useMemo } from "react"
import { type DirColors } from "@filen/sdk/dist/types/api/v3/dir/color"
import { isValidHexColor } from "@/lib/utils"
import Svg, { Path } from "react-native-svg"

export const DEFAULT_DIRECTORY_COLOR: string = "#85BCFF"

export const FileNameToSVGIcon = memo(({ name, width, height, fill }: { name: string; width?: number; height?: number; fill?: string }) => {
	const Component = useMemo(() => {
		return fileNameToSVGIcon(name)
	}, [name])

	return (
		<Component
			width={width}
			height={height}
			fill={fill}
			style={{
				flexShrink: 0
			}}
		/>
	)
})

FileNameToSVGIcon.displayName = "FileNameToSVGIcon"

/**
 * Convert file name to premade SVG icon.
 *
 * @export
 * @param {string} name
 * @returns {*}
 */
export function fileNameToSVGIcon(name: string) {
	const parsed = FileSystem.Paths.parse(name.toLowerCase())

	switch (parsed.ext) {
		case ".dmg":
		case ".iso": {
			return iso
		}

		case ".cad": {
			return cad
		}

		case ".psd": {
			return psd
		}

		case ".apk": {
			return android
		}

		case ".ipa": {
			return apple
		}

		case ".txt": {
			return txt
		}

		case ".pdf": {
			return pdf
		}

		case ".gif":
		case ".png":
		case ".jpg":
		case ".jpeg":
		case ".heic":
		case ".webp":
		case ".svg": {
			return image
		}

		case ".pkg":
		case ".rar":
		case ".tar":
		case ".zip":
		case ".7zip": {
			return archive
		}

		case ".wmv":
		case ".mov":
		case ".avi":
		case ".mkv":
		case ".webm":
		case ".mp4": {
			return video
		}

		case ".mp3": {
			return audio
		}

		case ".js":
		case ".cjs":
		case ".mjs":
		case ".jsx":
		case ".tsx":
		case ".ts":
		case ".cpp":
		case ".c":
		case ".php":
		case ".htm":
		case ".html5":
		case ".html":
		case ".css":
		case ".css3":
		case ".sass":
		case ".xml":
		case ".json":
		case ".sql":
		case ".java":
		case ".kt":
		case ".swift":
		case ".py3":
		case ".py":
		case ".cmake":
		case ".cs":
		case ".dart":
		case ".dockerfile":
		case ".go":
		case ".less":
		case ".yaml":
		case ".vue":
		case ".svelte":
		case ".vbs":
		case ".toml":
		case ".cobol":
		case ".h":
		case ".conf":
		case ".sh":
		case ".rs":
		case ".rb":
		case ".ps1":
		case ".bat":
		case ".ps":
		case ".protobuf":
		case ".ahk":
		case ".litcoffee":
		case ".coffee":
		case ".proto": {
			return code
		}

		case ".jar":
		case ".exe":
		case ".bin": {
			return exe
		}

		case ".doc":
		case ".docx": {
			return doc
		}

		case ".ppt":
		case ".pptx": {
			return ppt
		}

		case ".xls":
		case ".xlsx": {
			return xls
		}

		default: {
			return other
		}
	}
}

/**
 * Shade a base color (make it lighter/darker).
 *
 * @export
 * @param {string} color
 * @param {number} decimal
 * @returns {string}
 */
export function shadeColor(color: string, decimal: number): string {
	const base = color.startsWith("#") ? 1 : 0

	let r = parseInt(color.substring(base, 3), 16)
	let g = parseInt(color.substring(base + 2, 5), 16)
	let b = parseInt(color.substring(base + 4, 7), 16)

	r = Math.round(r / decimal)
	g = Math.round(g / decimal)
	b = Math.round(b / decimal)

	r = r < 255 ? r : 255
	g = g < 255 ? g : 255
	b = b < 255 ? b : 255

	const rr = r.toString(16).length === 1 ? `0${r.toString(16)}` : r.toString(16)
	const gg = g.toString(16).length === 1 ? `0${g.toString(16)}` : g.toString(16)
	const bb = b.toString(16).length === 1 ? `0${b.toString(16)}` : b.toString(16)

	return `#${rr}${gg}${bb}`
}

export function directoryColorToHex(color: DirColors | null): string {
	if (!color) {
		return DEFAULT_DIRECTORY_COLOR
	}

	const hexColor = (
		color === "blue"
			? "#037AFF"
			: color === "gray"
			? "#8F8E93"
			: color === "green"
			? "#33C759"
			: color === "purple"
			? "#AF52DE"
			: color === "red"
			? "#FF3B30"
			: color.includes("#")
			? color
			: DEFAULT_DIRECTORY_COLOR
	).toLowerCase()

	if (!isValidHexColor(hexColor)) {
		return DEFAULT_DIRECTORY_COLOR
	}

	return hexColor
}

export const ColoredFolderSVGIcon = memo(
	({ color, width, height }: { color?: DirColors | null; width?: string | number; height?: string | number }) => {
		const colors = useMemo(() => {
			if (!color || color === "default") {
				return {
					path1: "#5398DF",
					path2: DEFAULT_DIRECTORY_COLOR
				}
			}

			const stringToColor = directoryColorToHex(color)

			return {
				path1: shadeColor(stringToColor, 1.3),
				path2: stringToColor
			}
		}, [color])

		return (
			<Svg
				// @ts-expect-error Weird SVG typing
				style={{
					width: width ? width : "1.19921875em",
					height: height ? height : "1em",
					verticalAlign: "middle",
					fill: "currentColor",
					overflow: "hidden",
					flexShrink: 0
				}}
				className="dragselect-start-disallowed"
				viewBox="0 0 1228 1024"
				version="1.1"
				xmlns="http://www.w3.org/2000/svg"
			>
				<Path
					d="M1196.987733 212.5824v540.0576c0 39.594667-34.474667 71.3728-76.765866 71.3728H323.242667c-51.780267 0-88.746667-46.762667-73.250134-92.808533l126.737067-375.808H70.417067C31.675733 355.362133 0 326.4512 0 291.089067V98.372267C0 63.044267 31.675733 34.0992 70.417067 34.0992h378.811733c26.7264 0 51.029333 13.9264 63.010133 35.703467l39.048534 71.406933H1120.256c42.257067 0 76.8 32.119467 76.8 71.3728"
					fill={colors.path1}
				/>
				<Path
					d="M1128.721067 997.853867H68.266667a68.266667 68.266667 0 0 1-68.266667-68.266667V280.3712a68.266667 68.266667 0 0 1 68.266667-68.266667h1060.4544a68.266667 68.266667 0 0 1 68.266666 68.266667V929.5872a68.266667 68.266667 0 0 1-68.266666 68.266667"
					fill={colors.path2}
				/>
			</Svg>
		)
	}
)

ColoredFolderSVGIcon.displayName = "ColoredFolderSVGIcon"

export { Folder as folderIcon }
export { Folder as FolderIcon }
