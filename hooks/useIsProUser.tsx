import useAccountQuery from "@/queries/useAccount.query"
import { useMemo, useEffect, useRef } from "react"

export default function useIsProUser() {
	const didRefetch = useRef<boolean>(false)

	const accountQuery = useAccountQuery({
		enabled: false
	})

	const isProUser = useMemo(() => {
		if (accountQuery.status !== "success") {
			return false
		}

		return accountQuery.data.account.subs.some(sub => sub.activated && !sub.cancelled)
	}, [accountQuery.data, accountQuery.status])

	useEffect(() => {
		if (!didRefetch.current && accountQuery.dataUpdatedAt === 0) {
			didRefetch.current = true

			accountQuery.refetch().catch(console.error)
		}
	}, [accountQuery])

	return isProUser
}
