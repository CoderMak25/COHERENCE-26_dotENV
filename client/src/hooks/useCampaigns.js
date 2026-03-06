import { useState, useEffect, useCallback } from 'react'
import { campaignsAPI } from '../services/api'

export const useCampaigns = () => {
    const [campaigns, setCampaigns] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchCampaigns = useCallback(async () => {
        try {
            setLoading(true)
            const res = await campaignsAPI.getAll()
            setCampaigns(res.data)
        } catch (err) {
            setError(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

    return { campaigns, loading, error, refetch: fetchCampaigns }
}
