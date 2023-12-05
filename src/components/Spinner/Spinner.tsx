import { memo, useEffect, useRef, useCallback } from "react"
import { Animated, Easing } from "react-native"

const Spinner = memo(
	({
		children,
		duration = 2000,
		outputRange = ["0deg", "360deg"],
		easing = Easing.linear,
		useNativeDriver = false,
		inputRange = [0, 1],
		toValue = 1
	}: {
		children: React.ReactNode
		duration?: number
		outputRange?: string[] | number[]
		easing?: (value: number) => number
		useNativeDriver?: boolean
		inputRange?: number[]
		toValue?: number
	}) => {
		const didMount = useRef<boolean>(false)
		const spinValue = useRef(new Animated.Value(0)).current
		const rotate = useRef(spinValue.interpolate({ inputRange, outputRange })).current

		const spin = useCallback(() => {
			spinValue.setValue(0)

			Animated.timing(spinValue, {
				toValue,
				duration,
				easing,
				useNativeDriver
			}).start(() => spin())
		}, [duration])

		useEffect(() => {
			if (!didMount.current) {
				didMount.current = true

				spin()
			}
		}, [])

		return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>
	}
)

export default Spinner
