import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Landing from './pages/landing/Landing'
import Login from './pages/Login'
import VoiceAgent from './pages/VoiceAgent'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Campaigns from './pages/Campaigns'
import Analytics from './pages/Analytics'
import Logs from './pages/Logs'
import VoiceLogs from './pages/VoiceLogs'
import WorkflowBuilder from './pages/workflow/WorkflowBuilder'
import Settings from './pages/Settings'
import Profile from './pages/Profile'

function AppLayout() {
    return (
        <div className="flex h-screen w-full overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full bg-[var(--bg-base)] relative z-10 overflow-hidden">
                <Topbar />
                <div className="flex-1 relative overflow-hidden">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/leads" element={<Leads />} />
                        <Route path="/campaigns" element={<Campaigns />} />
                        <Route path="/workflows" element={<WorkflowBuilder />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/logs" element={<Logs />} />
                        <Route path="/voice-logs" element={<VoiceLogs />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/profile" element={<Profile />} />
                    </Routes>
                </div>
            </main>
        </div>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/voice/:leadId" element={<VoiceAgent />} />
                        {/* Protected app routes */}
                        <Route path="/app/*" element={
                            <ProtectedRoute>
                                <AppLayout />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </BrowserRouter>
            </ThemeProvider>
        </AuthProvider>
    )
}
