import { withLayoutContext } from "expo-router"
import {
	createNativeBottomTabNavigator,
	NativeBottomTabNavigationOptions,
	NativeBottomTabNavigationEventMap
} from "@bottom-tabs/react-navigation"
import { ParamListBase, TabNavigationState } from "@react-navigation/native"

export const BottomTabNavigator = createNativeBottomTabNavigator().Navigator

export const Tabs = withLayoutContext<
	NativeBottomTabNavigationOptions,
	typeof BottomTabNavigator,
	TabNavigationState<ParamListBase>,
	NativeBottomTabNavigationEventMap
>(BottomTabNavigator)

export default Tabs
