const socketIO = require("socket.io-client")

export function initSocket(self){
    if(!self.state.isLoggedIn){
        return false
    }

    if(typeof window.customVariables.socket !== "undefined"){
        return false
    }

    window.customVariables.socket = socketIO("https://socket.filen.io", {
		path: "",
		reconnect: true,
		transports: [
			"websocket"
		]
	})

    window.customVariables.socket.on("connect_error", (err) => {
        console.log("Error while trying to connect to socket server:", err)
    })

    window.customVariables.socket.on("connect", () => {
        self.setState({
            socketConnected: true
        })

        window.customVariables.socket.emit("auth", {
			apiKey: self.state.userAPIKey || ""
		})

        clearInterval(window.customVariables.socketPingInterval)

        window.customVariables.socketPingInterval = setInterval(() => {
            window.customVariables.socket.emit("heartbeat")
        }, 5000)

        console.log("Connected to socket server")
    })

    window.customVariables.socket.on("disconnect", (err) => {
        console.log(err)

        self.setState({
            socketConnected: false
        })

        console.log("Disconnected from socket server")
    })

    window.customVariables.socket.on("new-event", (data) => {
        if(data.type == "passwordChanged"){
            return window.customFunctions.logoutUser()
        }
    })
}

export function sendSocket(self, message, data){
    if(!self.state.isLoggedIn){
        return false
    }

    if(typeof window.customVariables.socket == "undefined"){
        return false
    }

    window.customVariables.socket.emit(message, data)

    return true
}