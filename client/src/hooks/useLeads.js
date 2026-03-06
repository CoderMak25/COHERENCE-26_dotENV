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
            const res = await leadsAPI.getAll(params)
            setLeads(res.data)
            setPagination(res.pagination)
        } catch (err) {
            setError(err)
        } finally {
            setLoading(false)
        }
    }, [JSON.stringify(params)])

    useEffect(() => { fetchLeads() }, [fetchLeads])

    return { leads, loading, error, pagination, refetch: fetchLeads }
}
