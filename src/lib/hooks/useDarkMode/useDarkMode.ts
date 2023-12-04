import storage from "../../storage"
import { useMMKVBoolean } from "react-native-mmkv"

const useDarkMode = () => {
	const [darkMode] = useMMKVBoolean("darkMode", storage)

	return darkMode
}

export default useDarkMode
