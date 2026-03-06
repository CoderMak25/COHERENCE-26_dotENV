import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './landing.css'

/* ── Intersection Observer hook for scroll-reveal ── */
function useReveal() {
    const ref = useRef(null)
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
            { threshold: 0.15 }
        )
        const els = ref.current?.querySelectorAll('.ln-reveal, .ln-stagger')
        els?.forEach(el => observer.observe(el))
        return () => observer.disconnect()
    }, [])
    return ref
}

/* ── Counter animation ── */
function AnimatedCounter({ target, suffix = '' }) {
    const spanRef = useRef(null)
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                let start = 0
                const end = parseFloat(target.replace(/,/g, ''))
                const duration = 1500
                const startTime = performance.now()
                const step = (time) => {
                    const progress = Math.min((time - startTime) / duration, 1)
                    const eased = 1 - Math.pow(1 - progress, 3)
                    const current = Math.floor(eased * end)
                    if (spanRef.current) {
                        spanRef.current.textContent = current.toLocaleString() + suffix
                    }
                    if (progress < 1) requestAnimationFrame(step)
                }
                requestAnimationFrame(step)
                observer.disconnect()
            }
        }, { threshold: 0.5 })
        if (spanRef.current) observer.observe(spanRef.current)
        return () => observer.disconnect()
    }, [target, suffix])
    return <span ref={spanRef} className="ln-stat-num">0{suffix}</span>
}

export default function Landing() {
    const pageRef = useReveal()

    return (
        <div ref={pageRef} className="landing">
            {/* ━━━ SECTION 1: NAVBAR ━━━ */}
            <nav className="ln-nav">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-[#0D0D0D]"></div>
                    <div>
                        <span className="text-[18px] font-bold tracking-tight">OUTREACHX</span>
                        <p className="text-[10px] text-[#999] tracking-widest uppercase leading-none">OUTREACH INTELLIGENCE OS</p>
                    </div>
                </div>

                <div className="ln-nav-links">
                    <a href="#features" className="ln-nav-link">FEATURES</a>
                    <a href="#how-it-works" className="ln-nav-link">HOW IT WORKS</a>
                    <a href="#pricing" className="ln-nav-link">PRICING</a>
                    <a href="#testimonials" className="ln-nav-link">TESTIMONIALS</a>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/login" className="ln-btn ln-btn-secondary" style={{ padding: '8px 16px' }}>LOGIN</Link>
                    <Link to="/login" className="ln-btn ln-btn-primary" style={{ padding: '8px 16px' }}>GET STARTED →</Link>
                </div>
            </nav>

            {/* ━━━ SECTION 2: HERO ━━━ */}
            <section className="ln-hero">
                <div className="ln-hero-left">
                    <div className="ln-reveal">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6" style={{ background: '#0D0D0D', color: '#FFFFFF', border: '2px solid #0D0D0D', boxShadow: '3px 3px 0 #0D0D0D' }}>
                            <span className="text-[8px]">■</span>
                            <span className="text-[11px] font-bold uppercase tracking-widest">AI-POWERED OUTREACH AUTOMATION</span>
                        </div>
                    </div>

                    <h1 className="ln-reveal">
                        CLOSE <span className="ln-highlight">MORE</span><br />
                        DEALS WITH<br />
                        LESS EFFORT.
                    </h1>

                    <p className="ln-hero-sub ln-reveal">
                        OutreachX automates your entire sales outreach pipeline — from lead import to AI-personalized emails to conversion tracking. Built for teams that move fast.
                    </p>

                    <div className="flex gap-4 mb-8 ln-reveal">
                        <Link to="/login" className="ln-btn ln-btn-primary" style={{ padding: '14px 28px', fontSize: '13px' }}>START FOR FREE →</Link>
                        <a href="#preview" className="ln-btn ln-btn-secondary" style={{ padding: '14px 28px', fontSize: '13px' }}>WATCH DEMO ▶</a>
                    </div>

                    <div className="ln-reveal">
                        <p className="text-[10px] text-[#999] uppercase tracking-widest mb-2">TRUSTED BY 500+ SALES TEAMS</p>
                        <div className="flex items-center gap-1">
                            <div className="flex -space-x-1">
                                {['R', 'S', 'M'].map((l, i) => (
                                    <div key={i} className="w-[24px] h-[24px] bg-[#0D0D0D] text-[#FFFFFF] flex items-center justify-center text-[10px] font-bold" style={{ border: '1px solid #FFFFFF' }}>{l}</div>
                                ))}
                            </div>
                            <span className="text-[12px] ml-2" style={{ color: '#F5C400' }}>★★★★★</span>
                            <span className="text-[11px] text-[#999] ml-1">4.9/5</span>
                        </div>
                    </div>
                </div>

                <div className="ln-hero-right ln-reveal">
                    <div className="ln-mockup-box p-4">
                        <div className="ln-mockup-tag">LIVE DASHBOARD</div>
                        {/* Mock stat cards */}
                        <div className="grid grid-cols-4 gap-2 mb-3 pt-4">
                            {[{ n: '1,248', l: 'LEADS' }, { n: '847', l: 'SENT' }, { n: '34.2%', l: 'OPEN RATE' }, { n: '93', l: 'REPLIES' }].map((s, i) => (
                                <div key={i} className="p-2" style={{ border: '1px solid #0D0D0D' }}>
                                    <div className="text-[8px] text-[#999] uppercase tracking-widest">{s.l}</div>
                                    <div className="text-[16px] font-bold">{s.n}</div>
                                </div>
                            ))}
                        </div>
                        {/* Mock chart */}
                        <div className="flex items-end gap-1 h-[60px] mb-3" style={{ borderLeft: '1px solid #DDD', borderBottom: '1px solid #DDD' }}>
                            {[40, 65, 85, 50, 95, 20, 15].map((h, i) => (
                                <div key={i} className="flex-1" style={{ height: `${h}%`, background: h > 50 ? '#F5C400' : '#E5E5E5', border: '1px solid #0D0D0D' }}></div>
                            ))}
                        </div>
                        {/* Mock table */}
                        <div style={{ border: '1px solid #0D0D0D' }}>
                            {['Rahul Sharma — ACTIVE', 'Priya Mehta — REPLIED', 'James Walker — PENDING'].map((row, i) => (
                                <div key={i} className="px-2 py-1.5 text-[9px] font-bold" style={{ borderBottom: i < 2 ? '1px solid #DDD' : 'none' }}>{row}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ━━━ SECTION 3: STATS BAR ━━━ */}
            <div className="ln-stats">
                <div className="ln-stat"><AnimatedCounter target="10000" suffix="+" /><div className="ln-stat-label">LEADS MANAGED</div></div>
                <div className="ln-stat-divider"></div>
                <div className="ln-stat"><AnimatedCounter target="500" suffix="+" /><div className="ln-stat-label">SALES TEAMS</div></div>
                <div className="ln-stat-divider"></div>
                <div className="ln-stat"><AnimatedCounter target="98" suffix="%" /><div className="ln-stat-label">DELIVERABILITY</div></div>
                <div className="ln-stat-divider"></div>
                <div className="ln-stat"><span className="ln-stat-num">4.2x</span><div className="ln-stat-label">AVG ROI</div></div>
            </div>

            {/* ━━━ SECTION 4: FEATURES ━━━ */}
            <section id="features" className="ln-section">
                <div className="ln-reveal">
                    <div className="ln-section-label">// FEATURES</div>
                    <h2 className="ln-section-title">EVERYTHING YOU NEED TO <span style={{ borderBottom: '4px solid #F5C400' }}>CLOSE</span>.</h2>
                </div>

                <div className="ln-features-grid ln-stagger">
                    {[
                        { icon: '⬡', num: '01', title: 'VISUAL WORKFLOW BUILDER', desc: 'Drag-and-drop canvas to build multi-step outreach sequences with conditional branching, delays, and smart routing logic.' },
                        { icon: '⚡', num: '02', title: 'AI MESSAGE GENERATION', desc: 'LLM-powered personalization engine writes emails tailored to each lead\'s name, company, role, and context. Every message feels hand-written.' },
                        { icon: '◉', num: '03', title: 'LEAD INTELLIGENCE', desc: 'Import leads from CSV or Excel. Filter, tag, segment, and track every lead\'s journey through your pipeline in real time.' },
                        { icon: '⏱', num: '04', title: 'HUMAN-LIKE DELAYS', desc: 'Randomized send timing with ±20% variance mimics natural human behavior. Throttle controls keep you out of spam folders.' },
                        { icon: '▦', num: '05', title: 'REAL-TIME MONITORING', desc: 'Live activity feed, pipeline tracker, and execution stats. See exactly what\'s happening across every campaign at every moment.' },
                        { icon: '⛨', num: '06', title: 'SAFETY CONTROLS', desc: 'Daily send caps, unsubscribe handling, blacklist management, and retry queues. Compliant by default. No surprises.' },
                    ].map((f) => (
                        <div key={f.num} className="ln-card ln-feature-card">
                            <div className="flex justify-between items-start">
                                <div className="ln-feature-icon">{f.icon}</div>
                                <span className="ln-feature-num">{f.num}</span>
                            </div>
                            <h3 className="ln-feature-title">{f.title}</h3>
                            <p className="ln-feature-desc">{f.desc}</p>
                            <a href="#" className="ln-feature-link">LEARN MORE →</a>
                        </div>
                    ))}
                </div>
            </section>

            {/* ━━━ SECTION 5: HOW IT WORKS ━━━ */}
            <section id="how-it-works" className="ln-section">
                <div className="ln-reveal">
                    <div className="ln-section-label">// PROCESS</div>
                    <h2 className="ln-section-title">THREE STEPS TO FULL AUTOMATION.</h2>
                </div>

                <div className="ln-steps ln-reveal">
                    <div className="ln-card ln-step-card">
                        <div className="ln-step-num">01</div>
                        <h3 className="ln-step-title">IMPORT YOUR LEADS</h3>
                        <p className="ln-step-desc">Upload a CSV or Excel file with your lead data. OutreachX parses, deduplicates, and organizes every contact automatically.</p>
                        <div className="ln-step-tag">IMPORT & SEGMENT</div>
                    </div>

                    <div className="ln-step-arrow">──▶</div>

                    <div className="ln-card ln-step-card">
                        <div className="ln-step-num">02</div>
                        <h3 className="ln-step-title">BUILD YOUR WORKFLOW</h3>
                        <p className="ln-step-desc">Design your outreach sequence visually. Set email steps, delays, conditions, and branching logic with our drag-and-drop builder.</p>
                        <div className="ln-step-tag">DESIGN & CONFIGURE</div>
                    </div>

                    <div className="ln-step-arrow">──▶</div>

                    <div className="ln-card ln-step-card">
                        <div className="ln-step-num">03</div>
                        <h3 className="ln-step-title">EXECUTE & CONVERT</h3>
                        <p className="ln-step-desc">Hit run. The AI generates personalized messages, the engine sends them with human-like timing, and you track every result live.</p>
                        <div className="ln-step-tag">AUTOMATE & TRACK</div>
                    </div>
                </div>
            </section>

            {/* ━━━ SECTION 6: DASHBOARD PREVIEW ━━━ */}
            <section id="preview" className="ln-section">
                <div className="ln-reveal">
                    <div className="ln-section-label">// PRODUCT PREVIEW</div>
                    <h2 className="ln-section-title">THE COMMAND CENTER FOR YOUR PIPELINE.</h2>
                </div>

                <div className="ln-reveal">
                    <div className="ln-preview-box">
                        <div className="ln-preview-strip">
                            <span className="text-[9px] font-bold tracking-widest">■ OUTREACHX DASHBOARD — LIVE VIEW</span>
                        </div>
                        {/* Full mockup inside */}
                        <div className="p-6">
                            {/* Stats row */}
                            <div className="grid grid-cols-4 gap-3 mb-4">
                                {[{ n: '1,248', l: 'TOTAL LEADS', c: '#F5C400' }, { n: '847', l: 'EMAILS SENT', c: '#0D0D0D' }, { n: '34.2%', l: 'OPEN RATE', c: '#00C853' }, { n: '93', l: 'REPLIES', c: '#0D0D0D' }].map((s, i) => (
                                    <div key={i} className="p-3" style={{ border: '2px solid #0D0D0D', boxShadow: '3px 3px 0 #0D0D0D' }}>
                                        <div className="text-[10px] text-[#999] uppercase tracking-widest font-bold mb-1">{s.l}</div>
                                        <div className="text-[28px] font-bold" style={{ color: s.c }}>{s.n}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Pipeline */}
                            <div className="flex items-center gap-2 mb-4">
                                {['IMPORTED — 1,248', 'CONTACTED — 847', 'OPENED — 291', 'REPLIED — 93', 'CONVERTED — 41'].map((stage, i) => (
                                    <div key={i} className="flex-1 flex items-center">
                                        <div className="flex-1 p-2 text-[9px] font-bold uppercase text-center" style={{ border: '2px solid #0D0D0D', background: i === 1 ? '#F5C400' : '#FFFFFF', boxShadow: '2px 2px 0 #0D0D0D' }}>{stage}</div>
                                        {i < 4 && <span className="text-[12px] px-1 font-bold text-[#0D0D0D]">▶</span>}
                                    </div>
                                ))}
                            </div>
                            {/* Chart area */}
                            <div className="flex items-end gap-1.5 h-[80px] mb-4" style={{ borderLeft: '2px solid #0D0D0D', borderBottom: '2px solid #0D0D0D', padding: '0 4px 0' }}>
                                {[40, 65, 85, 50, 95, 20, 15].map((h, i) => (
                                    <div key={i} className="flex-1" style={{ height: `${h}%`, background: h > 50 ? '#F5C400' : '#E5E5E5', border: '1px solid #0D0D0D' }}></div>
                                ))}
                            </div>
                            {/* Table */}
                            <div style={{ border: '2px solid #0D0D0D' }}>
                                <div className="grid grid-cols-5 text-[9px] font-bold uppercase tracking-widest text-[#999] bg-[#F8F8F8]" style={{ borderBottom: '2px solid #0D0D0D' }}>
                                    {['NAME', 'COMPANY', 'STATUS', 'WORKFLOW', 'ACTION'].map(h => <div key={h} className="p-2" style={{ borderRight: '1px solid #DDD' }}>{h}</div>)}
                                </div>
                                {[
                                    ['Rahul Sharma', 'TechCorp', 'ACTIVE', 'Q1 Outbound', '▶'],
                                    ['Priya Mehta', 'InnovateX', 'REPLIED', 'Enterprise', '▶'],
                                    ['James Walker', 'Globex Ltd', 'PENDING', '—', '▶'],
                                ].map((row, i) => (
                                    <div key={i} className="grid grid-cols-5 text-[10px] font-bold" style={{ borderBottom: i < 2 ? '1px solid #E5E5E5' : 'none' }}>
                                        {row.map((cell, j) => (
                                            <div key={j} className="p-2" style={{ borderRight: '1px solid #E5E5E5', color: j === 2 ? (cell === 'ACTIVE' ? '#00C853' : cell === 'REPLIED' ? '#F5C400' : '#999') : '#0D0D0D' }}>{cell}</div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-8 ln-reveal">
                    <p className="text-[18px] font-bold max-w-[400px]">Real-time data. Zero configuration. Works on day one.</p>
                    <Link to="/login" className="ln-btn ln-btn-primary" style={{ padding: '14px 28px' }}>OPEN LIVE DEMO →</Link>
                </div>
            </section>

            {/* ━━━ SECTION 7: TESTIMONIALS ━━━ */}
            <section id="testimonials" className="ln-section">
                <div className="ln-reveal">
                    <div className="ln-section-label">// SOCIAL PROOF</div>
                    <h2 className="ln-section-title">TEAMS THAT SWITCHED NEVER WENT BACK.</h2>
                </div>

                <div className="ln-testimonials ln-stagger">
                    {[
                        { quote: 'OutreachX cut our outreach time by 70%. The AI messages are so good our leads think I wrote each one personally.', name: 'Rahul Sharma', role: 'Head of Sales @ TechFlow', init: 'R' },
                        { quote: 'The workflow builder is the most intuitive thing I\'ve used. Built our entire Q3 sequence in 20 minutes flat.', name: 'Sarah Jenkins', role: 'Founder @ Nexus Corp', init: 'S' },
                        { quote: 'Open rates went from 18% to 41% in the first two weeks. The personalization engine is genuinely scary good.', name: 'Marcus Chen', role: 'CMO @ Aura Systems', init: 'M' },
                    ].map((t, i) => (
                        <div key={i} className="ln-card ln-testimonial-card">
                            <div className="ln-stars">★★★★★</div>
                            <p className="ln-quote">"{t.quote}"</p>
                            <div className="ln-author-strip">
                                <div className="ln-author-avatar">{t.init}</div>
                                <div>
                                    <div className="ln-author-name">{t.name}</div>
                                    <div className="ln-author-role">{t.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ━━━ SECTION 8: PRICING ━━━ */}
            <section id="pricing" className="ln-section">
                <div className="ln-reveal">
                    <div className="ln-section-label">// PRICING</div>
                    <h2 className="ln-section-title">SIMPLE PRICING. NO SURPRISES.</h2>
                    <p className="text-[14px] text-[#999] -mt-8 mb-12">Start free. Scale when you're ready.</p>
                </div>

                <div className="ln-pricing ln-stagger">
                    {/* STARTER */}
                    <div className="ln-card ln-pricing-card">
                        <div className="ln-pricing-label">STARTER</div>
                        <div className="ln-pricing-price">$0<span className="ln-pricing-period">/mo</span></div>
                        <div className="ln-pricing-features">
                            {['500 leads', '1 workflow', '1,000 emails/mo', 'Basic analytics', 'CSV import'].map(f => (
                                <div key={f} className="ln-pricing-feature"><span className="ln-pricing-bullet">■</span>{f}</div>
                            ))}
                        </div>
                        <Link to="/login" className="ln-btn ln-btn-secondary w-full justify-center">START FREE →</Link>
                    </div>

                    {/* PRO */}
                    <div className="ln-card ln-pricing-card ln-pricing-featured">
                        <div className="ln-pricing-banner">MOST POPULAR</div>
                        <div className="ln-pricing-label">PRO</div>
                        <div className="ln-pricing-price">$49<span className="ln-pricing-period" style={{ color: '#555' }}>/mo</span></div>
                        <div className="ln-pricing-features">
                            {['10,000 leads', 'Unlimited workflows', '50,000 emails/mo', 'AI message generation', 'Full analytics', 'Priority support'].map(f => (
                                <div key={f} className="ln-pricing-feature"><span className="ln-pricing-bullet">■</span>{f}</div>
                            ))}
                        </div>
                        <Link to="/login" className="ln-btn ln-btn-dark w-full justify-center" style={{ background: '#0D0D0D', color: '#FFFFFF', boxShadow: 'none' }}>GET STARTED →</Link>
                    </div>

                    {/* ENTERPRISE */}
                    <div className="ln-card ln-pricing-card">
                        <div className="ln-pricing-label">ENTERPRISE</div>
                        <div className="ln-pricing-price" style={{ fontSize: '40px' }}>CUSTOM</div>
                        <p className="text-[12px] text-[#999] mb-4">contact us</p>
                        <div className="ln-pricing-features">
                            {['Unlimited leads', 'Custom workflows', 'Unlimited emails', 'Dedicated AI model', 'SLA + compliance', 'Onboarding support'].map(f => (
                                <div key={f} className="ln-pricing-feature"><span className="ln-pricing-bullet">■</span>{f}</div>
                            ))}
                        </div>
                        <a href="#" className="ln-btn ln-btn-secondary w-full justify-center">CONTACT SALES →</a>
                    </div>
                </div>
            </section>

            {/* ━━━ SECTION 9: CTA BANNER ━━━ */}
            <div className="ln-cta-banner">
                <div className="ln-reveal">
                    <div className="ln-cta-chip">// GET STARTED TODAY</div>
                    <h2 className="ln-cta-title">
                        READY TO <span style={{ color: '#F5C400' }}>AUTOMATE</span><br />
                        YOUR OUTREACH?
                    </h2>
                    <p className="ln-cta-sub">Join 500+ sales teams already closing more deals with less effort.</p>
                    <div className="flex gap-4 justify-center mb-4">
                        <Link to="/login" className="ln-btn" style={{ background: '#F5C400', color: '#0D0D0D', border: '2px solid #0D0D0D', boxShadow: '4px 4px 0 #F5C400', padding: '14px 28px', fontSize: '13px' }}>START FOR FREE →</Link>
                        <a href="#" className="ln-btn" style={{ background: 'transparent', color: '#FFFFFF', border: '2px solid rgba(255,255,255,0.3)', boxShadow: 'none', padding: '14px 28px', fontSize: '13px' }}>BOOK A DEMO</a>
                    </div>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No credit card required. Free forever plan available.</p>
                </div>
            </div>

            {/* ━━━ SECTION 10: FOOTER ━━━ */}
            <footer className="ln-footer">
                <div className="ln-footer-grid">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[8px]">■</span>
                            <span className="text-[16px] font-bold">OUTREACHX</span>
                        </div>
                        <p className="text-[10px] text-[#999] uppercase tracking-widest mb-4">OUTREACH INTELLIGENCE OS</p>
                        <p className="text-[12px] text-[#999] leading-relaxed mb-4">AI-powered sales outreach automation platform. Built for teams that move fast and close deals.</p>
                        <div className="flex gap-2">
                            {['TW', 'GH', 'LI'].map(s => (
                                <div key={s} className="w-[28px] h-[28px] flex items-center justify-center text-[10px] font-bold cursor-pointer hover:bg-[#F5C400] hover:text-[#0D0D0D] transition-colors" style={{ border: '1px solid #0D0D0D' }}>{s}</div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="ln-footer-col-title">PRODUCT</div>
                        {['Features', 'How It Works', 'Pricing', 'Changelog', 'Roadmap'].map(l => (
                            <a key={l} href="#" className="ln-footer-link">{l}</a>
                        ))}
                    </div>

                    <div>
                        <div className="ln-footer-col-title">COMPANY</div>
                        {['About', 'Blog', 'Careers', 'Press', 'Contact'].map(l => (
                            <a key={l} href="#" className="ln-footer-link">{l}</a>
                        ))}
                    </div>

                    <div>
                        <div className="ln-footer-col-title">LEGAL</div>
                        {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map(l => (
                            <a key={l} href="#" className="ln-footer-link">{l}</a>
                        ))}
                    </div>
                </div>

                <div className="ln-footer-bottom">
                    <span className="text-[11px] text-[#999]">© 2026 OUTREACHX. ALL RIGHTS RESERVED.</span>
                    <span className="text-[10px] text-[#CCC]">BUILT FOR THE HACKATHON — TRACK 3: SALES & OUTREACH SYSTEMS</span>
                </div>
            </footer>
        </div>
    )
}
