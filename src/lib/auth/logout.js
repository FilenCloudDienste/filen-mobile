import { storage } from "../storage"
import { StackActions } from "@react-navigation/native"

export const logout = ({ navigation }) => {
    try{
        storage.delete("apiKey")
        storage.delete("apiKey")
        storage.delete("email"),
        storage.delete("masterKeys")
        storage.delete("authVersion")
        storage.set("isLoggedIn", false)
    }
    catch(e){
        return console.log(e)
    }

    if(typeof navigation.replace !== "undefined"){
        navigation.replace("LoginScreen")
    }
    else{
        navigation.current.dispatch(StackActions.replace("LoginScreen"))
    }
}