/**
 * Semaphore
 *
 * @export
 * @class Semaphore
 * @typedef {Semaphore}
 */
export class Semaphore {
	private counter: number = 0
	private waiting: Array<{
		resolve: (value: void | PromiseLike<void>) => void
		reject: (reason?: unknown) => void
	}> = []
	private maxCount: number

	/**
	 * Creates an instance of Semaphore.
	 *
	 * @constructor
	 * @public
	 * @param {number} [max=1]
	 */
	public constructor(max: number = 1) {
		this.maxCount = max
	}

	/**
	 * Acquire a lock.
	 *
	 * @public
	 * @returns {Promise<void>}
	 */
	public acquire(): Promise<void> {
		if (this.counter < this.maxCount) {
			this.counter++

			return Promise.resolve()
		} else {
			return new Promise<void>((resolve, reject) => {
				this.waiting.push({
					resolve,
					reject
				})
			})
		}
	}

	/**
	 * Release a lock.
	 *
	 * @public
	 */
	public release(): void {
		if (this.counter <= 0) {
			return
		}

		this.counter--

		this.processQueue()
	}

	/**
	 * Returns the locks in the queue.
	 *
	 * @public
	 * @returns {number}
	 */
	public count(): number {
		return this.counter
	}

	/**
	 * Set max number of concurrent locks.
	 *
	 * @public
	 * @param {number} newMax
	 */
	public setMax(newMax: number): void {
		this.maxCount = newMax

		this.processQueue()
	}

	/**
	 * Purge all waiting promises.
	 *
	 * @public
	 * @returns {number}
	 */
	public purge(): number {
		const unresolved = this.waiting.length

		for (const waiter of this.waiting) {
			waiter.reject("Task has been purged")
		}

		this.counter = 0
		this.waiting = []

		return unresolved
	}

	/**
	 * Internal process queue.
	 *
	 * @private
	 */
	private processQueue(): void {
		if (this.waiting.length > 0 && this.counter < this.maxCount) {
			this.counter++

			const waiter = this.waiting.shift()

			if (waiter) {
				waiter.resolve()
			}
		}
	}
}

export default Semaphore
