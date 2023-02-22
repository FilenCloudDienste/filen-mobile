import * as FileSystem from "expo-file-system"
import { Semaphore, toExpoFsPath } from "../helpers"

const writeSemaphore = new Semaphore(2)
const writeSemaphoreTimeout = 100
const readSemaphore = new Semaphore(128)

export const cacheDirectory = FileSystem.cacheDirectory

export const copy = async (from: string, to: string, skipSemaphore: boolean = false) => {
    if(!skipSemaphore){
        await writeSemaphore.acquire()
    }

    try{
        await FileSystem.copyAsync({
            from: toExpoFsPath(from),
            to: toExpoFsPath(to)
        })

        if(!skipSemaphore){
            setTimeout(() => writeSemaphore.release(), writeSemaphoreTimeout)
        }
    }
    catch(e){
        if(!skipSemaphore){
            setTimeout(() => writeSemaphore.release(), writeSemaphoreTimeout)
        }

        throw e
    }
}

export const stat = async (path: string) => {
    await readSemaphore.acquire()

    try{
        const stat = await FileSystem.getInfoAsync(toExpoFsPath(path))

        readSemaphore.release()

        return stat
    }
    catch(e){
        readSemaphore.release()

        throw e
    }
}

export const unlink = async (path: string, skipSemaphore: boolean = false) => {
    if(!skipSemaphore){
        await writeSemaphore.acquire()
    }

    try{
        await FileSystem.deleteAsync(toExpoFsPath(path), {
            idempotent: true
        })

        if(!skipSemaphore){
            setTimeout(() => writeSemaphore.release(), writeSemaphoreTimeout)
        }
    }
    catch(e){
        if(!skipSemaphore){
            setTimeout(() => writeSemaphore.release(), writeSemaphoreTimeout)
        }

        throw e
    }
}

export const move = async (from: string, to: string, skipSemaphore: boolean = false) => {
    if(!skipSemaphore){
        await writeSemaphore.acquire()
    }

    try{
        await FileSystem.moveAsync({
            from: toExpoFsPath(from),
            to: toExpoFsPath(to)
        })

        if(!skipSemaphore){
            setTimeout(() => writeSemaphore.release(), writeSemaphoreTimeout)
        }
    }
    catch(e){
        if(!skipSemaphore){
            setTimeout(() => writeSemaphore.release(), writeSemaphoreTimeout)
        }

        throw e
    }
}

export const readAsString = async (path: string, encoding: FileSystem.EncodingType | "utf8" | "base64" | undefined = "utf8") => {
    await readSemaphore.acquire()

    try{
        const string = await FileSystem.readAsStringAsync(toExpoFsPath(path), {
            encoding
        })

        readSemaphore.release()

        return string
    }
    catch(e){
        readSemaphore.release()

        throw e
    }
}

export const readDirectory = async (path: string) => {
    await readSemaphore.acquire()

    try{
        const directory = await FileSystem.readDirectoryAsync(toExpoFsPath(path))

        readSemaphore.release()

        return directory
    }
    catch(e){
        readSemaphore.release()

        throw e
    }
}