import { useState, useEffect } from "react"
import storage from "../../storage"
import { useMMKVBoolean } from "react-native-mmkv"

const useDarkMode = () => {
    const [darkMode, setDarkMode] = useState<boolean>(storage.getBoolean("darkMode"))
    const [darkModeDb, _] = useMMKVBoolean("darkMode", storage)

    useEffect(() => {
        setDarkMode(darkModeDb)
    }, [darkModeDb])

    return darkMode
}

export default useDarkMode