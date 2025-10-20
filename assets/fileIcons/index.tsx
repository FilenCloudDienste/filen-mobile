import pathModule from "path"
import Other from "./svg/other.svg"
import Folder from "./svg/folder.svg"
import Txt from "./svg/txt.svg"
import Pdf from "./svg/pdf.svg"
import Image from "./svg/image.svg"
import Archive from "./svg/archive.svg"
import Audio from "./svg/audio.svg"
import Video from "./svg/video.svg"
import Code from "./svg/code.svg"
import Exe from "./svg/exe.svg"
import Doc from "./svg/doc.svg"
import Xls from "./svg/xls.svg"
import Ppt from "./svg/ppt.svg"
import Apple from "./svg/apple.svg"
import Android from "./svg/android.svg"
import Iso from "./svg/iso.svg"
import Psd from "./svg/psd.svg"
import Cad from "./svg/cad.svg"
import { memo, useMemo } from "react"
import type { DirColors } from "@filen/sdk/dist/types/api/v3/dir/color"
import { isValidHexColor } from "@/lib/utils"
import Svg, { Path } from "react-native-svg"

export const DEFAULT_DIRECTORY_COLOR: string = "#85BCFF"

export const FileNameToSVGIcon = memo(({ name, ...props }: { name: string; width?: number; height?: number; fill?: string }) => {
	const parsed = useMemo(() => {
		return pathModule.posix.parse(name.toLowerCase())
	}, [name])

	switch (parsed.ext) {
		case ".dmg":
		case ".iso": {
			return <Iso {...props} />
		}

		case ".cad": {
			return <Cad {...props} />
		}

		case ".psd": {
			return <Psd {...props} />
		}

		case ".apk": {
			return <Android {...props} />
		}

		case ".ipa": {
			return <Apple {...props} />
		}

		case ".txt": {
			return <Txt {...props} />
		}

		case ".pdf": {
			return <Pdf {...props} />
		}

		case ".gif":
		case ".png":
		case ".jpg":
		case ".jpeg":
		case ".heic":
		case ".webp":
		case ".svg": {
			return <Image {...props} />
		}

		case ".pkg":
		case ".rar":
		case ".tar":
		case ".zip":
		case ".7zip": {
			return <Archive {...props} />
		}

		case ".wmv":
		case ".mov":
		case ".avi":
		case ".mkv":
		case ".webm":
		case ".mp4": {
			return <Video {...props} />
		}

		case ".mp3": {
			return <Audio {...props} />
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
			return <Code {...props} />
		}

		case ".jar":
		case ".exe":
		case ".bin": {
			return <Exe {...props} />
		}

		case ".doc":
		case ".docx": {
			return <Doc {...props} />
		}

		case ".ppt":
		case ".pptx": {
			return <Ppt {...props} />
		}

		case ".xls":
		case ".xlsx": {
			return <Xls {...props} />
		}

		default: {
			return <Other {...props} />
		}
	}
})

FileNameToSVGIcon.displayName = "FileNameToSVGIcon"

/**
 * Shade a base color (make it lighter/darker).
 *
 * @export
 * @param {string} color
 * @param {number} decimal
 * @returns {string}
 */
export function shadeColor(color: string, decimal: number): string {
	const base = color.charCodeAt(0) === 35 ? 1 : 0 // 35 is '#'

	// Parse hex values directly with correct indices
	let r = parseInt(color.substring(base, base + 2), 16)
	let g = parseInt(color.substring(base + 2, base + 4), 16)
	let b = parseInt(color.substring(base + 4, base + 6), 16)

	// Apply shading and clamp in one step
	r = Math.min(255, (r / decimal + 0.5) | 0)
	g = Math.min(255, (g / decimal + 0.5) | 0)
	b = Math.min(255, (b / decimal + 0.5) | 0)

	// Convert to hex with manual padding (faster than toString + conditional)
	const rr = r < 16 ? "0" + r.toString(16) : r.toString(16)
	const gg = g < 16 ? "0" + g.toString(16) : g.toString(16)
	const bb = b < 16 ? "0" + b.toString(16) : b.toString(16)

	return "#" + rr + gg + bb
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
