const getRandomArbitrary = (min, max) => {
	return Math.floor(Math.random() * (max - min) + min)
}

const workerOnMessage = (e) => {
	e.stopPropagation()
	e.preventDefault()

	if(!workerCallbacks[e.data.id]){
		console.log("Worker call " + e.data.id + " has no callback defined.")

		e = null

		return false
	}
	else{
		if(e.data.err){
			workerCallbacks[e.data.id](e.data.err)
		}
		else{
			workerCallbacks[e.data.id](null, e.data)
		}

		delete workerCallbacks[e.data.id]

		e.data = null
		e = null

		return true
	}
}

const createWorker = () => {
  	let worker = new Worker("assets/worker/worker.js")

	worker.onmessage = workerOnMessage

	return worker
}

let cpuCount = 8
let workers = []
let workerCallbacks = {}
let workerNextCallId = 0

for(let i = 0; i < cpuCount; i++){
	workers.push(createWorker())
}

module.exports = {
	createObjectURL: (blob) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "createObjectURL",
				id,
				data: blob
			})

			id = null
			blob = null
			worker = null

			return true
		})
	},
	revokeObjectURL: (blob) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "revokeObjectURL",
				id,
				data: blob
			})

			id = null
			blob = null
			worker = null

			return true
		})
	},
	getExifOrientation: (blob) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "getExifOrientation",
				id,
				file: blob
			})

			id = null
			blob = null
			worker = null

			return true
		})
	},
	clearLocalForageKeys: (term) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "clearLocalForageKeys",
				id,
				term
			})

			 id = null
			 term = null
			 worker = null

			return true
		})
	},
	localforageRemoveItem: (key) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "localforageRemoveItem",
				id,
				key
			})

			 id = null
			 key = null
			 worker = null

			return true
		})
	},
	localforageSetItem: (key, data) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "localforageSetItem",
				id,
				key,
				data
			})

			 data = null
			 key = null
			 id = null
			 worker = null

			return true
		})
	},
	localforageGetItem: (key) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]

			worker.postMessage({
				type: "localforageGetItem",
				id,
				key
			})

			 id = null
			 key = null
			 worker = null

			return true
		})
	},
	newBlob: (data, options) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}
		
			worker.postMessage({
				type: "newBlob",
				id,
				data,
				options
			})

			id = null
			data = null
			options = null
			worker = null

			return true
		})
	},
	newFile: (data, options) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}
		
			worker.postMessage({
				type: "newFile",
				id,
				data,
				options
			})

			id = null
			data = null
			options = null
			worker = null

			return true
		})
	},
	fetchBlobWriter: (url, options, timeout) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}
		
			worker.postMessage({
				type: "fetchBlobWriter",
				id,
				url,
				options,
				timeout
			})

			id = null
			url = null
			options = null
			timeout = null
			worker = null

			return true
		})
	},
	fetchWithTimeoutDownloadWorker: (url, options, timeout) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}
		
			worker.postMessage({
				type: "fetchWithTimeoutDownload",
				id,
				url,
				options,
				timeout
			})

			id = null
			url = null
			options = null
			timeout = null
			worker = null

			return true
		})
	},
	fetchWithTimeoutJSONWorker: (url, options, timeout) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "fetchWithTimeoutJSON",
				id,
				url,
				options,
				timeout
			})

			 id =null
			 url=null
			 options=null
			 timeout=null
			 worker=null

			return true
		})
	},
	decryptMetadataWorker: (data, key) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "decryptMetadata",
				id,
				data,
				key
			})

			id = null
			data = null
			key = null
			worker = null

			return true
		})
	},
	encryptMetadataWorker: (data, key, version) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "encryptMetadata",
				id,
				data,
				key,
				version
			})

			id = null
			data = null
			key = null
			version = null
			worker = null

			return true
		})
	},
    encryptData: (uuid, index, key, data, version, callback) => {
		let id = workerNextCallId++

		workerCallbacks[id] = (err, data) => {
			if(err){
				callback(err)

				err = null
				data = null

				return false
			}

			callback(null, data.data)

			err = null
			data = null

			return true
		}

		let worker = workers[getRandomArbitrary(0, (workers.length - 1))]

        worker.postMessage({
            id,
			type: "encryptData",
			uuid,
            index,
            key,
            data,
			version
        })

		id = null
		uuid = null
		index = null
		key = null
		data = null
		version = null
		worker = null

		return true
    },
    decryptData: (uuid, index, key, data, version) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			worker.postMessage({
				id,
				type: "decryptData",
				uuid,
				index,
				key,
				data,
				version
			})

			id = null
			uuid = null
			index = null
			key = null
			data = null
			version = null
			worker = null

			return true
		})
    },
    convertArrayBufferToBase64: (data, callback) => {
		let id = workerNextCallId++

		workerCallbacks[id] = (err, data) => {
			if(err){
				callback(err)

				err = null
				data = null

				return false
			}

			callback(null, data.data)

			err = null
			data = null

			return true
		}

		let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
    
        worker.postMessage({
            type: "arrayBufferToBase64",
            id,
            data
        })

		 id=null
		 data=null
		 worker=null

		return true
	},
	convertBase64ToArrayBuffer: (data, callback) => {
        let id = workerNextCallId++

		workerCallbacks[id] = (err, data) => {
			if(err){
				callback(err)

				err = null
				data = null

				return false
			}

			callback(null, data.data)

			err = null
			data = null

			return true
		}

		let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
    
        worker.postMessage({
            type: "base64ToArrayBuffer",
            id,
            data
        })

		id = null
		data = null
		worker = null

		return true
    },
	JSONStringifyLengthWorker: (data) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "JSONStringifyLength",
				id,
				data
			})

			id = null
			data = null
			worker = null

			return true
		})
	},
	JSONStringifyWorker: (data) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "JSONStringify",
				id,
				data
			})

			id = null
			data = null
			worker = null

			return true
		})
	},
	JSONParseWorker: (data) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "JSONParse",
				id,
				data
			})

			id = null
			data = null
			worker = null

			return true
		})
	},
	md5Hash: (data, stringify) => {
		return new Promise((resolve, reject) => {
			let id = workerNextCallId++

			workerCallbacks[id] = (err, data) => {
				if(err){
					reject(err)

					err = null
					data = null

					return false
				}

				resolve(data.data)

				err = null
				data = null

				return true
			}

			let worker = workers[getRandomArbitrary(0, (workers.length - 1))]
		
			worker.postMessage({
				type: "md5Hash",
				id,
				data,
				stringify
			})

			id = null
			data = null
			worker = null

			return true
		})
	}
}