const bridge = require("rn-bridge")
const { NodeWorker } = require("./bundle")

const type = (process.argv.find(arg => arg.startsWith("--type=")) || "").split("=")[1] || "foreground"

new NodeWorker(bridge, type)
