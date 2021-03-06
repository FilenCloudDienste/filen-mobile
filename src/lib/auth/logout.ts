import storage from "../storage"
import { StackActions } from "@react-navigation/native"

export const logout = ({ navigation }: { navigation: any }) => {
    storage.delete("apiKey")
    storage.delete("userId")
    storage.delete("email"),
    storage.delete("masterKeys")
    storage.delete("authVersion")
    storage.set("isLoggedIn", false)

    storage.getAllKeys().forEach((key) => {
        if(key.indexOf("loadItemsCache:") !== -1){
            storage.delete(key)
        }
    })

    if(typeof navigation.replace !== "undefined"){
        navigation.replace("LoginScreen")
    }
    else{
        navigation.current.dispatch(StackActions.replace("LoginScreen"))
    }
}