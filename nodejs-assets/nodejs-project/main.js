const bridge = require("rn-bridge")
const { NodeWorker } = require("./bundle")

new NodeWorker(bridge)
