import { useState, useEffect, useCallback } from 'react'
import { leadsAPI } from '../services/api'

export const useLeads = (params = {}) => {
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [pagination, setPagination] = useState({})

    const fetchLeads = useCallback(async () => {
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
            const res = await leadsAPI.getAll(cleanParams)
            setLeads(res.data || [])
            setPagination(res.pagination || {})
        } catch (err) {
            console.error('useLeads fetch error:', err)
            setError(err)
        } finally {
            setLoading(false)
        }
    }, [JSON.stringify(params)])

    useEffect(() => { fetchLeads() }, [fetchLeads])

    return { leads, loading, error, pagination, refetch: fetchLeads }
}
