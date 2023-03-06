import * as FileSystem from "expo-file-system"
import { toExpoFsPath, toExpoFsPathWithoutEncode } from "../helpers"

export const cacheDirectory = FileSystem.cacheDirectory
export const documentDirectory = FileSystem.documentDirectory

export const copy = async (from: string, to: string) => {
    await FileSystem.copyAsync({
        from: toExpoFsPath(from),
        to: toExpoFsPath(to)
    })
}

export const stat = async (path: string) => {
    return await FileSystem.getInfoAsync(toExpoFsPath(path))
}

export const iOSstat = async (path: string) => {
    return await FileSystem.getInfoAsync(toExpoFsPathWithoutEncode(path))
}

export const unlink = async (path: string) => {
    await FileSystem.deleteAsync(toExpoFsPath(path), {
        idempotent: true
    })
}

export const move = async (from: string, to: string) => {
    await FileSystem.moveAsync({
        from: toExpoFsPath(from),
        to: toExpoFsPath(to)
    })
}

export const readAsString = async (path: string, encoding: FileSystem.EncodingType | "utf8" | "base64" | undefined = "utf8") => {
    return await FileSystem.readAsStringAsync(toExpoFsPath(path), {
        encoding
    })
}

export const readDirectory = async (path: string) => {
    return await FileSystem.readDirectoryAsync(toExpoFsPath(path))
}

export const mkdir = async (path: string, intermediates: boolean = true) => {
    await FileSystem.makeDirectoryAsync(toExpoFsPath(path), {
        intermediates
    })
}