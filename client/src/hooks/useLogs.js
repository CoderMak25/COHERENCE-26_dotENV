import { useState, useEffect, useCallback } from 'react'
import { logsAPI } from '../services/api'

export const useLogs = (params = {}) => {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [pagination, setPagination] = useState({})

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true)
            const res = await logsAPI.getAll(params)
            setLogs(res.data)
            setPagination(res.pagination)
        } catch (err) {
            setError(err)
        } finally {
            setLoading(false)
        }
    }, [JSON.stringify(params)])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    return { logs, loading, error, pagination, refetch: fetchLogs }
}
