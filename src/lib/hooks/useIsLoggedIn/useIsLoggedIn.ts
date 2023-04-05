import { useState, useEffect } from "react"
import storage from "../../storage"
import { useMMKVBoolean } from "react-native-mmkv"

const useIsLoggedIn = () => {
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(storage.getBoolean("isLoggedIn"))
	const [isLoggedInDb, _] = useMMKVBoolean("isLoggedIn", storage)

	useEffect(() => {
		setIsLoggedIn(isLoggedInDb)
	}, [isLoggedInDb])

	return isLoggedIn
}

export default useIsLoggedIn
