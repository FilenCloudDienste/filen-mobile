import React from 'react'
import ReactDOM from 'react-dom'

import { setupConfig } from "@ionic/react"

import App from './App'

setupConfig({
    rippleEffect: true,
    mode: "md",
    hardwareBackButton: false
})

ReactDOM.render(<App />, document.getElementById('root'))