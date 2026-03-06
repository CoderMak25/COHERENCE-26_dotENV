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
            setError(null)
            // Strip empty/null/undefined and 'ALL' values so they don't confuse the backend
            const cleanParams = {}
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
                    cleanParams[key] = value
                }
            })
            const res = await logsAPI.getAll(cleanParams)
            setLogs(res.data || [])
            setPagination(res.pagination || {})
        } catch (err) {
            console.error('useLogs fetch error:', err)
            setError(err)
        } finally {
            setLoading(false)
        }
    }, [JSON.stringify(params)])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    return { logs, loading, error, pagination, refetch: fetchLogs }
}
