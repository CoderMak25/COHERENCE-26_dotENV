import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' }
})

api.interceptors.response.use(
    res => res.data,
    err => Promise.reject(err.response?.data || err.message)
)

// Leads
export const leadsAPI = {
    getAll: (params) => api.get('/leads', { params }),
    getOne: (id) => api.get(`/leads/${id}`),
    create: (data) => api.post('/leads', data),
    update: (id, data) => api.put(`/leads/${id}`, data),
    remove: (id) => api.delete(`/leads/${id}`),
    bulkDelete: (ids) => api.delete('/leads/bulk', { data: { ids } }),
    recordEngagement: (id, eventType) => api.post(`/leads/${id}/engagement`, { eventType }),
    rescoreAll: () => api.post('/leads/rescore-all'),
    import: (file) => {
        const form = new FormData()
        form.append('file', file)
        return api.post('/leads/import', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    }
}


// Campaigns
export const campaignsAPI = {
    getAll: () => api.get('/campaigns'),
    getOne: (id) => api.get(`/campaigns/${id}`),
    create: (data) => api.post('/campaigns', data),
    update: (id, data) => api.put(`/campaigns/${id}`, data),
    run: (id) => api.post(`/campaigns/${id}/run`),
    pause: (id) => api.post(`/campaigns/${id}/pause`),
    remove: (id) => api.delete(`/campaigns/${id}`)
}

// Workflows
export const workflowsAPI = {
    getAll: () => api.get('/workflows'),
    getOne: (id) => api.get(`/workflows/${id}`),
    save: (data) => api.post('/workflows', data),
    update: (id, data) => api.put(`/workflows/${id}`, data),
    execute: (id, leadIds) => api.post(`/workflows/${id}/execute`, { leadIds }),
    remove: (id) => api.delete(`/workflows/${id}`)
}

// AI
export const aiAPI = {
    generate: (data) => api.post('/ai/generate', data)
}

// Logs
export const logsAPI = {
    getAll: (params) => api.get('/logs', { params })
}

// Dashboard
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats')
}

// Users
export const usersAPI = {
    getProfile: (params) => api.get('/users/profile', { params }),
    updateProfile: (data) => api.put('/users/profile', data),
    updateSettings: (data) => api.put('/users/settings', data),
}

export default api
