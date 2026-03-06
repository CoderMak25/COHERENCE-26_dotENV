import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login, loginWithGoogle, loginDemo } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await login(email, password)
            navigate('/app')
        } catch (err) {
            setError(err.message?.includes('invalid') ? 'INVALID CREDENTIALS' : 'AUTH FAILED — TRY AGAIN')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogle = async () => {
        setError('')
        try {
            await loginWithGoogle()
            navigate('/app')
        } catch (err) {
            setError('GOOGLE SIGN-IN FAILED')
        }
    }

    const handleDemo = async () => {
        setError('')
        setLoading(true)
        try {
            await loginDemo()
            navigate('/app')
        } catch (err) {
            setError('DEMO LOGIN FAILED')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center" style={{ background: '#FFFFFF', fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}>
            {/* Grid pattern background */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #0D0D0D 0px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #0D0D0D 0px, transparent 1px, transparent 40px)' }}></div>

            <div className="relative z-10 w-full max-w-[420px] mx-4">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 mb-8 group">
                    <div className="w-3 h-3 bg-[#0D0D0D] group-hover:bg-[#F5C400] transition-colors"></div>
                    <span className="text-[16px] font-bold tracking-tight text-[#0D0D0D] uppercase">OUTREACHX</span>
                </Link>

                {/* Login Card */}
                <div style={{ border: '2px solid #0D0D0D', boxShadow: '6px 6px 0px #0D0D0D', background: '#FFFFFF' }}>
                    {/* Header strip */}
                    <div style={{ background: '#F5C400', borderBottom: '2px solid #0D0D0D', padding: '14px 24px' }}>
                        <h1 className="text-[18px] font-bold text-[#0D0D0D] uppercase tracking-tight">SIGN IN</h1>
                        <p className="text-[11px] text-[#0D0D0D] opacity-60 uppercase tracking-widest mt-1">ACCESS YOUR OUTREACH DASHBOARD</p>
                    </div>

                    <div className="p-[24px]">
                        {/* Error */}
                        {error && (
                            <div className="mb-4 p-3 text-[11px] font-bold text-[#FF4545] uppercase tracking-widest" style={{ border: '2px solid #FF4545', boxShadow: '3px 3px 0 #FF4545', background: 'rgba(255,69,69,0.05)' }}>
                                ■ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">EMAIL</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="w-full h-[44px] px-3 text-[12px] font-bold text-[#0D0D0D] placeholder-[#999]"
                                    style={{ border: '2px solid #0D0D0D', background: '#FFFFFF', borderRadius: 0, boxShadow: 'none' }}
                                    required
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">PASSWORD</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-[44px] px-3 text-[12px] font-bold text-[#0D0D0D] placeholder-[#999]"
                                    style={{ border: '2px solid #0D0D0D', background: '#FFFFFF', borderRadius: 0, boxShadow: 'none' }}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-[48px] text-[12px] font-bold uppercase tracking-widest hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-transform"
                                style={{ background: '#F5C400', color: '#0D0D0D', border: '2px solid #0D0D0D', boxShadow: '4px 4px 0 #0D0D0D' }}
                            >
                                {loading ? 'SIGNING IN...' : 'SIGN IN →'}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center my-5">
                            <div className="flex-1 h-[2px] bg-[#E5E5E5]"></div>
                            <span className="px-3 text-[10px] font-bold text-[#999] uppercase tracking-widest">OR</span>
                            <div className="flex-1 h-[2px] bg-[#E5E5E5]"></div>
                        </div>

                        {/* Google Login */}
                        <button
                            onClick={handleGoogle}
                            className="w-full h-[44px] text-[11px] font-bold uppercase tracking-widest mb-3 hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-transform flex items-center justify-center gap-2"
                            style={{ background: '#FFFFFF', color: '#0D0D0D', border: '2px solid #0D0D0D', boxShadow: '3px 3px 0 #0D0D0D' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                            SIGN IN WITH GOOGLE
                        </button>

                        {/* Demo Login */}
                        <button
                            onClick={handleDemo}
                            className="w-full h-[44px] text-[11px] font-bold uppercase tracking-widest hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-transform"
                            style={{ background: '#0D0D0D', color: '#FFFFFF', border: '2px solid #0D0D0D', boxShadow: '3px 3px 0 #F5C400' }}
                        >
                            ▶ DEMO LOGIN — INSTANT ACCESS
                        </button>

                        <p className="text-[10px] text-center text-[#999] mt-4 uppercase tracking-widest">
                            NO CREDIT CARD REQUIRED
                        </p>
                    </div>
                </div>

                {/* Back to landing */}
                <div className="mt-6 text-center">
                    <Link to="/" className="text-[11px] font-bold text-[#555] uppercase tracking-widest hover:text-[#F5C400] transition-colors">
                        ← BACK TO HOME
                    </Link>
                </div>
            </div>
        </div>
    )
}
