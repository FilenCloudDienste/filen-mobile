import type { TextInput, TextInputProps } from "react-native"

export type SearchInputProps = TextInputProps & {
	containerClassName?: string
	iconContainerClassName?: string
	cancelText?: string
	iconColor?: string
}

export type SearchInputRef = TextInput
