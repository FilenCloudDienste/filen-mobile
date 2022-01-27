const convertUint8ArrayToBinaryString = (u8Array) => {
	let i, len = u8Array.length, b_str = ""

	for (i = 0; i < len; i++){
		b_str += String.fromCharCode(u8Array[i])
	}

	return b_str
}

const generateRandomString = (length = 32) => {
	return self.btoa(Array.from(nativeCrypto.getRandomValues(new Uint8Array(length * 2))).map((b) => String.fromCharCode(b)).join("")).replace(/[+/]/g, "").substring(0, length)
}

function base64ArrayBuffer(arrayBuffer) {
	var base64    = ''
	var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

	var bytes         = new Uint8Array(arrayBuffer)
	var byteLength    = bytes.byteLength
	var byteRemainder = byteLength % 3
	var mainLength    = byteLength - byteRemainder

	var a, b, c, d
	var chunk

	// Main loop deals with bytes in chunks of 3
	for (var i = 0; i < mainLength; i = i + 3) {
	// Combine the three bytes into a single integer
	chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

	// Use bitmasks to extract 6-bit segments from the triplet
	a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
	b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
	c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
	d = chunk & 63               // 63       = 2^6 - 1

	// Convert the raw binary segments to the appropriate ASCII encoding
	base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
	}

	// Deal with the remaining bytes and padding
	if (byteRemainder == 1) {
	chunk = bytes[mainLength]

	a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

	// Set the 4 least significant bits to zero
	b = (chunk & 3)   << 4 // 3   = 2^2 - 1

	base64 += encodings[a] + encodings[b] + '=='
	} else if (byteRemainder == 2) {
	chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

	a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
	b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

	// Set the 2 least significant bits to zero
	c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

	base64 += encodings[a] + encodings[b] + encodings[c] + '='
	}
	
	return base64
}

function convertWordArrayToUint8Array(wordArray) {
	let arrayOfWords = wordArray.hasOwnProperty("words") ? wordArray.words : []
	let length = wordArray.hasOwnProperty("sigBytes") ? wordArray.sigBytes : arrayOfWords.length * 4
	let uInt8Array = new Uint8Array(length), index=0, word, i

	for(i = 0; i < length; i++){
		word = arrayOfWords[i]

		uInt8Array[index++] = word >> 24
		uInt8Array[index++] = (word >> 16) & 0xff
		uInt8Array[index++] = (word >> 8) & 0xff
		uInt8Array[index++] = word & 0xff
	}

	return uInt8Array
}

function base64ArrayBuffer(arrayBuffer) {
  var base64    = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var bytes         = new Uint8Array(arrayBuffer)
  var byteLength    = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength    = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
	// Combine the three bytes into a single integer
	chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

	// Use bitmasks to extract 6-bit segments from the triplet
	a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
	b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
	c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
	d = chunk & 63               // 63       = 2^6 - 1

	// Convert the raw binary segments to the appropriate ASCII encoding
	base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
	chunk = bytes[mainLength]

	a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

	// Set the 4 least significant bits to zero
	b = (chunk & 3)   << 4 // 3   = 2^2 - 1

	base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
	chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

	a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
	b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

	// Set the 2 least significant bits to zero
	c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

	base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }
  
  return base64
}

function _base64ToArrayBuffer(base64) {
	var binary_string = self.atob(base64);
	var len = binary_string.length;
	var bytes = new Uint8Array(len);
	for (var i = 0; i < len; i++) {
		bytes[i] = binary_string.charCodeAt(i);
	}
	return bytes.buffer;
}

function buf2hex(buffer) { // buffer is an ArrayBuffer
	return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function deriveKeyFromPassword (password, salt, iterations = 200000, hash = "SHA-512", bitLength = 512, returnHex = true){	
	try{
		var bits = await nativeCrypto.subtle.deriveBits({
			name: "PBKDF2",
			  salt: new TextEncoder().encode(salt),
			  iterations: iterations,
			  hash: {
				name: hash
			  }
		}, await nativeCrypto.subtle.importKey("raw", new TextEncoder().encode(password), {
			name: "PBKDF2"
		}, false, ["deriveBits"]), bitLength)
	}
	catch(e){
		throw new Error(e)
	}
  
	if(returnHex){
		  return buf2hex(bits)
	}

	return bits
}

function fetchWithTimeout(ms, promise) {
	return new Promise((resolve, reject) => {
		let timer = setTimeout(() => {
			return reject(new Error("Request timeout after " + ms + "ms"))
		}, ms)

		promise.then((value) => {
			clearTimeout(timer)
			
			return resolve(value)
		}).catch((err) => {
			clearTimeout(timer)

			return reject(err)
		})
	})
}

function getOrientation(file, callback) {
	var reader = new FileReader()

	reader.onload = function(e){
		var view = new DataView(e.target.result)

        reader = null

		if(view.getUint16(0, false) != 0xFFD8){
			return callback(-2)
		}

		var length = view.byteLength, offset = 2;

		while (offset < length){
			if (view.getUint16(offset+2, false) <= 8) return callback(-1);

			var marker = view.getUint16(offset, false);
			offset += 2;

			if (marker == 0xFFE1){
				if (view.getUint32(offset += 2, false) != 0x45786966) {
					return callback(-1);
				}

				var little = view.getUint16(offset += 6, false) == 0x4949;

				offset += view.getUint32(offset + 4, little);

				var tags = view.getUint16(offset, little);

				offset += 2;

				for (var i = 0; i < tags; i++){
					if (view.getUint16(offset + (i * 12), little) == 0x0112){
						return callback(view.getUint16(offset + (i * 12) + 8, little));
					}
				}
			}
			else if ((marker & 0xFF00) != 0xFF00){
				break;
			}
			else{ 
				offset += view.getUint16(offset, false);
			}
		}

		return callback(-1);
	};
	return reader.readAsArrayBuffer(file);
}