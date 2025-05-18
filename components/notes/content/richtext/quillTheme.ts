import Quill from "quill"

export type QuillThemeOptions = {
	containerBorder?: string
	containerBackground?: string
	toolbarBorder?: string
	toolbarBackground?: string
	toolbarColor?: string
	toolbarActiveColor?: string
	toolbarHoverColor?: string
	toolbarBorderRadius?: string
	toolbarStrokeColor?: string
	toolbarFillColor?: string
	toolbarActiveStrokeColor?: string
	toolbarActiveFillColor?: string
	toolbarHoverStrokeColor?: string
	toolbarHoverFillColor?: string
	toolbarSticky?: boolean
	toolbarStickyOffset?: string
	toolbarShadow?: string
	editorFontFamily?: string
	editorFontSize?: string
	editorLineHeight?: string
	editorPadding?: string
	editorTextColor?: string
	editorBackground?: string
	editorMinHeight?: string
	placeholderColor?: string
	placeholderStyle?: string
	customClass?: string
	codeBackground?: string
	codeTextColor?: string
	readOnly?: boolean
}

export class QuillThemeCustomizer {
	private options: QuillThemeOptions
	private styleId: string = "quill-custom-styles"

	public constructor(options: QuillThemeOptions = {}) {
		this.options = {
			containerBorder: "none",
			containerBackground: "transparent",
			toolbarBorder: "none",
			toolbarBackground: "#f5f5f5",
			toolbarColor: "#444", // Match Snow theme default
			toolbarActiveColor: "#06c", // Match Snow theme default
			toolbarHoverColor: "#06c", // Match Snow theme default
			// Add specific toolbar SVG element coloring
			toolbarStrokeColor: "#444", // Default stroke color
			toolbarFillColor: "#444", // Default fill color
			toolbarActiveStrokeColor: "#06c", // Active/selected stroke
			toolbarActiveFillColor: "#06c", // Active/selected fill
			toolbarHoverStrokeColor: "#06c", // Hover stroke
			toolbarHoverFillColor: "#06c", // Hover fill
			toolbarBorderRadius: "4px",
			editorFontFamily: "Helvetica Neue, Arial, sans-serif",
			editorFontSize: "16px",
			editorLineHeight: "1.6",
			editorPadding: "20px",
			editorTextColor: "#333",
			editorBackground: "white",
			editorMinHeight: "100vh",
			placeholderColor: "#aaa",
			placeholderStyle: "italic",
			...options
		}
	}

	public apply(quillInstance: Quill, containerId?: string): void {
		this.removeExistingStyles()

		const css = this.generateCSS(containerId)
		const style = document.createElement("style")

		style.id = this.styleId
		style.textContent = css

		document.head.appendChild(style)

		if (this.options.customClass && quillInstance) {
			const container = quillInstance.container

			if (container) {
				container.classList.add(this.options.customClass)
			}
		}
	}

	public removeExistingStyles(): void {
		const existingStyle = document.getElementById(this.styleId)

		if (existingStyle && existingStyle.parentNode) {
			existingStyle.parentNode.removeChild(existingStyle)
		}
	}

	private generateCSS(containerId?: string): string {
		const selector = containerId ? `#${containerId} ` : ""

		const stickyToolbarStyles = this.options.toolbarSticky
			? `
				/* Sticky toolbar */
				${selector} .ql-toolbar {
				position: sticky !important;
				top: ${this.options.toolbarStickyOffset || "0px"} !important;
				z-index: 1000 !important;
				width: 100vw !important;
				${this.options.readOnly ? "display: none !important;" : ""}
				}
				
				/* Add padding to top of editor to prevent content from being hidden behind sticky toolbar */
				${selector} .ql-container {
				position: relative !important;
				}
  			`
			: ""

		return `
			/* Container styling */
			${selector} .ql-container {
				border: ${this.options.containerBorder} !important;
				background-color: ${this.options.containerBackground} !important;
				width: 100vw !important;
			}
		
			/* Toolbar styling */
			${selector} .ql-toolbar {
				border: 1px solid transparent !important;
				border-bottom: none !important;
				background-color: ${this.options.codeBackground} !important;
				border-radius: none !important;
			}
			
			${stickyToolbarStyles}
			
			/* Default toolbar colors */
			${selector} .ql-toolbar button,
			${selector} .ql-toolbar .ql-picker-label {
				color: ${this.options.toolbarColor} !important;
			}
			
			/* Default toolbar colors */
			${selector} .ql-toolbar button,
			${selector} .ql-toolbar .ql-picker-label {
				color: ${this.options.toolbarColor} !important;
			}
			
			${selector} .ql-toolbar .ql-stroke {
				stroke: ${this.options.toolbarStrokeColor} !important;
			}
			
			${selector} .ql-toolbar .ql-fill,
			${selector} .ql-toolbar .ql-stroke.ql-fill {
				fill: ${this.options.toolbarFillColor} !important;
			}
			
			/* Active states */
			${selector} .ql-toolbar button.ql-active,
			${selector} .ql-toolbar .ql-picker-label.ql-active,
			${selector} .ql-toolbar .ql-picker-item.ql-selected {
				color: ${this.options.toolbarActiveColor} !important;
			}
			
			${selector} .ql-toolbar button.ql-active .ql-stroke,
			${selector} .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
			${selector} .ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
			${selector} .ql-toolbar button.ql-active .ql-stroke-miter,
			${selector} .ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
			${selector} .ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter {
				stroke: ${this.options.toolbarActiveStrokeColor} !important;
			}
			
			${selector} .ql-toolbar button.ql-active .ql-fill,
			${selector} .ql-toolbar .ql-picker-label.ql-active .ql-fill,
			${selector} .ql-toolbar .ql-picker-item.ql-selected .ql-fill,
			${selector} .ql-toolbar button.ql-active .ql-stroke.ql-fill,
			${selector} .ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
			${selector} .ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill {
				fill: ${this.options.toolbarActiveFillColor} !important;
			}
			
			/* Hover states */
			${selector} .ql-toolbar button:hover,
			${selector} .ql-toolbar button:focus,
			${selector} .ql-toolbar .ql-picker-label:hover,
			${selector} .ql-toolbar .ql-picker-item:hover {
				color: ${this.options.toolbarHoverColor} !important;
			}
			
			${selector} .ql-toolbar button:hover .ql-stroke,
			${selector} .ql-toolbar button:focus .ql-stroke,
			${selector} .ql-toolbar .ql-picker-label:hover .ql-stroke,
			${selector} .ql-toolbar .ql-picker-item:hover .ql-stroke,
			${selector} .ql-toolbar button:hover .ql-stroke-miter,
			${selector} .ql-toolbar button:focus .ql-stroke-miter,
			${selector} .ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
			${selector} .ql-toolbar .ql-picker-item:hover .ql-stroke-miter {
				stroke: ${this.options.toolbarHoverStrokeColor} !important;
			}
			
			${selector} .ql-toolbar button:hover .ql-fill,
			${selector} .ql-toolbar button:focus .ql-fill,
			${selector} .ql-toolbar .ql-picker-label:hover .ql-fill,
			${selector} .ql-toolbar .ql-picker-item:hover .ql-fill,
			${selector} .ql-toolbar button:hover .ql-stroke.ql-fill,
			${selector} .ql-toolbar button:focus .ql-stroke.ql-fill,
			${selector} .ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
			${selector} .ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill {
				fill: ${this.options.toolbarHoverFillColor} !important;
			}
			
			/* Editor content styling */
			${selector} .ql-editor {
				font-family: ${this.options.editorFontFamily} !important;
				font-size: ${this.options.editorFontSize} !important;
				line-height: ${this.options.editorLineHeight} !important;
				padding: ${this.options.editorPadding} !important;
				color: ${this.options.editorTextColor} !important;
				background-color: ${this.options.editorBackground} !important;
			}
			
			/* Placeholder styling */
			${selector} .ql-editor.ql-blank::before {
				color: ${this.options.placeholderColor} !important;
				font-style: ${this.options.placeholderStyle} !important;
			}

			/* Checkboxes styling */
			${selector} .ql-editor li[data-list=unchecked] > .ql-ui:before {
				content: '\\2713';
				color: transparent;
				display: inline-block;
				width: 16px;
				height: 16px;
				border: 1px solid ${this.options.editorTextColor};
				border-radius: 50%;
				margin-right: 0.5em;
				text-align: center;
				line-height: 17px;
				background-color: transparent;
			}

			${selector} .ql-editor li[data-list=checked] > .ql-ui:before {
				content: '\\2714';
				color: ${this.options.toolbarBackground};
				display: inline-block;
				width: 16px;
				height: 16px;
				border: 1px solid ${this.options.editorTextColor};
				border-radius: 50%;
				margin-right: 0.5em;
				text-align: center;
				line-height: 17px;
				background-color: ${this.options.editorTextColor};
			}

			${selector} .ql-editor li[data-list=checked] {
				text-decoration: line-through !important;
			}

			${selector} .ql-snow .ql-picker-options {
				background-color: ${this.options.codeBackground} !important;
				border-radius: ${this.options.toolbarBorderRadius} !important;
			}

			${selector} .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
				border-color: ${this.options.toolbarBorder} !important;
				border: none !important;
			}

			${selector} .ql-toolbar.ql-snow .ql-picker-options {
				border: 1px solid ${this.options.toolbarBorder} !important;
				border-color: ${this.options.toolbarBorder} !important;
				border-radius: ${this.options.toolbarBorderRadius} !important;
				background-color: ${this.options.codeBackground} !important;
			}

			${selector} .ql-snow .ql-editor blockquote {
				border-left: 4px solid ${this.options.codeBackground} !important;
			}

			${selector} .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-label {
				border-color: transparent !important;
			}

			${selector} .ql-snow .ql-picker.ql-expanded .ql-picker-label {
				color: ${this.options.toolbarActiveColor} !important;
			}

			${selector} .ql-snow .ql-picker-options .ql-picker-item {
				color: ${this.options.toolbarColor} !important;
			}

			${selector} .ql-snow .ql-editor .ql-code-block-container {
				background-color: ${this.options.codeBackground} !important;
				color: ${this.options.codeTextColor} !important;
				border-radius: 6px !important;
			}

			${selector} .ql-snow .ql-tooltip {
				background-color: ${this.options.codeBackground} !important;
				color: ${this.options.codeTextColor} !important;
				border: none !important;
				border-radius: 6px !important;
				box-shadow: none !important;
			}

			${selector} .ql-snow .ql-tooltip input[type=text] {
				background-color: ${this.options.codeBackground} !important;
				color: ${this.options.codeTextColor} !important;
			}
    	`
	}
}
