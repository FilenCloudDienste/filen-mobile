export type BlobPropertyBag = {
	type?: string
	endings?: "transparent" | "native"
}

export type BlobPart = string | ArrayBuffer | ArrayBufferView | Blob

export class BlobPolyfill implements Blob {
	private _size: number = 0
	private _type: string = ""
	private _parts: Uint8Array[] = []

	public constructor(blobParts: BlobPart[] = [], options: BlobPropertyBag = {}) {
		this._type = options.type || ""
		this._processParts(blobParts, options.endings)
	}

	public get size(): number {
		return this._size
	}

	public get type(): string {
		return this._type
	}

	public get parts(): Uint8Array[] {
		return this._parts
	}

	private _processParts(blobParts: BlobPart[], endings?: "transparent" | "native"): void {
		let totalSize = 0
		const parts: Uint8Array[] = []

		for (const part of blobParts) {
			let uint8Array: Uint8Array

			if (typeof part === "string") {
				uint8Array = this._stringToUint8Array(part, endings)
			} else if (part instanceof ArrayBuffer) {
				uint8Array = new Uint8Array(part)
			} else if (ArrayBuffer.isView(part)) {
				uint8Array = new Uint8Array(part.buffer, part.byteOffset, part.byteLength)
			} else if (part instanceof BlobPolyfill) {
				uint8Array = this._combineUint8Arrays(part._parts)
			} else {
				uint8Array = this._stringToUint8Array(String(part), endings)
			}

			parts.push(uint8Array)

			totalSize += uint8Array.length
		}

		this._parts = parts
		this._size = totalSize
	}

	private _stringToUint8Array(str: string, endings?: "transparent" | "native"): Uint8Array {
		if (endings === "native") {
			str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
		}

		const encoder = new TextEncoder()

		return encoder.encode(str)
	}

	private _combineUint8Arrays(arrays: Uint8Array[]): Uint8Array {
		const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
		const result = new Uint8Array(totalLength)
		let offset = 0

		for (const array of arrays) {
			result.set(array, offset)

			offset += array.length
		}

		return result
	}

	async bytes(): Promise<Uint8Array> {
		const combined = this._combineUint8Arrays(this._parts)

		return combined
	}

	slice(start?: number, end?: number, contentType?: string): Blob {
		const totalSize = this._size

		start = start === undefined ? 0 : start
		end = end === undefined ? totalSize : end

		if (start < 0) {
			start = Math.max(0, totalSize + start)
		}

		if (end < 0) {
			end = Math.max(0, totalSize + end)
		}

		start = Math.min(start, totalSize)
		end = Math.min(end, totalSize)

		if (start > end) {
			start = end
		}

		const sliceLength = end - start

		if (sliceLength === 0) {
			return new BlobPolyfill([], {
				type: contentType || this._type
			})
		}

		const slicedData = new Uint8Array(sliceLength)
		let currentOffset = 0
		let sliceOffset = 0

		for (const part of this._parts) {
			const partEnd = currentOffset + part.length

			if (currentOffset >= end) {
				break
			}

			if (partEnd <= start) {
				currentOffset = partEnd

				continue
			}

			const copyStart = Math.max(0, start - currentOffset)
			const copyEnd = Math.min(part.length, end - currentOffset)
			const copyLength = copyEnd - copyStart

			if (copyLength > 0) {
				slicedData.set(part.subarray(copyStart, copyEnd), sliceOffset)

				sliceOffset += copyLength
			}

			currentOffset = partEnd
		}

		return new BlobPolyfill([slicedData], {
			type: contentType || this._type
		})
	}

	async arrayBuffer(): Promise<ArrayBuffer> {
		const combined = this._combineUint8Arrays(this._parts)

		return combined.buffer.slice(combined.byteOffset, combined.byteOffset + combined.byteLength) as ArrayBuffer
	}

	async text(): Promise<string> {
		const combined = this._combineUint8Arrays(this._parts)
		const decoder = new TextDecoder()

		return decoder.decode(combined)
	}

	public stream(): ReadableStream<Uint8Array> {
		const parts = this._parts
		let partIndex = 0

		return new ReadableStream<Uint8Array>({
			start() {},
			pull(controller) {
				if (partIndex >= parts.length) {
					controller.close()

					return
				}

				const chunk = parts[partIndex]

				controller.enqueue(chunk)

				partIndex++
			},
			cancel() {}
		})
	}

	public toString(): string {
		return "[object Blob]"
	}

	public get [Symbol.toStringTag](): string {
		return "Blob"
	}
}

export default BlobPolyfill
