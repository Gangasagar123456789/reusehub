import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, BookMarked, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock3, Filter, Heart, HeartHandshake, IndianRupee,
  Leaf, LockKeyhole, LogIn, LogOut, Menu, MessageCircle, PackageCheck, PackagePlus, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, Tag, Trash2, Upload, UserRound, Users, X, Zap, GraduationCap, Bookmark,
  LayoutDashboard, Flag, Pencil, RefreshCw, CircleHelp, Mail, ExternalLink
} from 'lucide-react'
import {
  changeInterestStatus, createInterest, createListing, createReport, getAdminListings, getCurrentUser, getImpactStats,
  getListing, imageForCategory, isLiveBackend, listInterests, listListings, listReports, moderateListing, resolveReport,
  resendSignupConfirmation, signIn as serviceSignIn, signOut as serviceSignOut, signUp as serviceSignUp, subscribeAuth, updateListing,
  updateListingStatus,
} from './services/store'
import type { AppUser, InterestRequest, Listing, ListingInput, ListingReport } from './types'
import './styles.css'

const categories = [
  'Engineering & Academic Textbooks', 'Reference Books', 'Notebooks', 'Stationery', 'Calculators', 'Lab Coats & Lab Supplies', 'Other Educational Materials',
]
const conditions = ['New', 'Like New', 'Good', 'Fair'] as const
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
const dateLabel = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

// Lightweight app-wide authentication context.
type AuthValue = { user: AppUser | null; loading: boolean; setUser: (user: AppUser | null) => void; refreshUser: () => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null)
function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshUser = useCallback(async () => { setUser(await getCurrentUser()) }, [])
  useEffect(() => {
    let active = true
    getCurrentUser().then(value => { if (active) setUser(value) }).catch(() => { if (active) setUser(null) }).finally(() => { if (active) setLoading(false) })
    const unsubscribe = subscribeAuth(value => { if (active) { setUser(value); setLoading(false) } })
    return () => { active = false; unsubscribe() }
  }, [])
  const value = useMemo(() => ({ user, loading, setUser, refreshUser }), [user, loading, refreshUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider missing'); return value }

type Toast = { id: number; text: string; kind: 'success' | 'error' | 'info' }
const ToastContext = createContext<(text: string, kind?: Toast['kind']) => void>(() => {})
function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, text, kind }])
    window.setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 3900)
  }, [])
  return <ToastContext.Provider value={show}>{children}<div className="toast-stack" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast toast-${t.kind}`}><span className="toast-icon">{t.kind === 'success' ? <CheckCircle2 size={18}/> : t.kind === 'error' ? <CircleAlert size={18}/> : <CircleHelp size={18}/>}</span><span>{t.text}</span><button className="icon-button toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} aria-label="Dismiss notification"><X size={15}/></button></div>)}</div></ToastContext.Provider>
}
function useToast() { return useContext(ToastContext) }

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`brand ${compact ? 'brand-compact' : ''}`} to="/" aria-label="ReuseHub home"><span className="brand-mark"><BookOpen size={22} strokeWidth={2.3}/><span className="brand-mark-dot"/></span><span className="brand-word">Reuse<span>Hub</span><small>GIVE IT ANOTHER CHAPTER</small></span></Link>
}
function Header() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  async function logout() {
    try { await serviceSignOut(); setUser(null); toast('You have been signed out.'); navigate('/') }
    catch (error) { toast(error instanceof Error ? error.message : 'Could not sign out.', 'error') }
  }
  useEffect(() => setMobileOpen(false), [location.pathname])
  return <header className="site-header"><div className="header-inner"><Brand/>
    <button className="mobile-menu icon-button" aria-label="Toggle navigation" onClick={() => setMobileOpen(v => !v)}>{mobileOpen ? <X size={22}/> : <Menu size={22}/>}</button>
    <nav className={`main-nav ${mobileOpen ? 'main-nav-open' : ''}`}>
      <Link className={location.pathname === '/browse' ? 'nav-active' : ''} to="/browse">Browse items</Link>
      <a href="/about" onClick={e => { e.preventDefault(); navigate('/about') }}>How it works</a>
      {user && <Link className={location.pathname === '/dashboard' ? 'nav-active' : ''} to="/dashboard">My dashboard</Link>}
    </nav>
    <div className="header-actions">
      {user ? <>
        <span className="header-user"><span className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</span><span>{user.displayName.split(' ')[0]}</span></span>
        {user.role === 'admin' && <Link to="/admin" className="admin-chip"><ShieldCheck size={14}/> Admin</Link>}
        <button className="btn btn-ghost btn-small" onClick={logout}><LogOut size={15}/> Log out</button>
      </> : <><Link to="/login" className="login-link">Log in</Link><Link to="/signup" className="btn btn-primary btn-small">Join ReuseHub <ArrowRight size={15}/></Link></>}
    </div>
  </div></header>
}
function DemoBanner() {
  if (isLiveBackend()) return null
  return <div className="demo-banner"><Sparkles size={15}/><span><strong>Local demo mode</strong> — changes stay in this browser and are not shared with other users.</span><Link to="/guidelines">How it works <ArrowRight size={13}/></Link></div>
}
function Footer() {
  return <footer className="site-footer"><div className="footer-top"><div className="footer-brand"><Brand/><p>Good things deserve another chapter. Help useful educational materials find their next home.</p></div><div className="footer-links"><div><strong>Explore</strong><Link to="/browse">Browse items</Link><Link to="/list-item">List an item</Link><Link to="/about">About ReuseHub</Link></div><div><strong>Community</strong><Link to="/guidelines">Safety guidelines</Link><a href="mailto:reusehub@example.com">Contact support</a></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ReuseHub · Built for reuse, made for students.</span><span className="footer-leaf"><Leaf size={14}/> A little less waste, a little more possibility.</span></div></footer>
}
function Layout({ children }: { children: ReactNode }) {
  return <><Header/><DemoBanner/><main className="app-main">{children}</main><Footer/></>
}
function Spinner({ label = 'Loading...' }: { label?: string }) { return <div className="state-panel"><span className="spinner"/><span>{label}</span></div> }
function ErrorPanel({ text, onRetry }: { text: string; onRetry?: () => void }) { return <div className="state-panel state-error"><CircleAlert size={24}/><strong>Something went wrong</strong><span>{text}</span>{onRetry && <button className="btn btn-outline btn-small" onClick={onRetry}><RefreshCw size={14}/> Try again</button>}</div> }
function EmptyPanel({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="empty-panel"><span className="empty-illustration"><BookMarked size={28}/></span><h3>{title}</h3><p>{text}</p>{action}</div> }

function ListingCard({ listing }: { listing: Listing }) {
  const savings = listing.mrp !== null && listing.mrp > listing.price && listing.listingType === 'resale' ? listing.mrp - listing.price : null
  const percent = savings && listing.mrp ? Math.round(savings / listing.mrp * 100) : 0
  return <article className="listing-card">
    <Link className="listing-image-wrap" to={`/items/${listing.id}`}>
      <img src={listing.coverImage || imageForCategory(listing.category)} alt={listing.title} className="listing-image" loading="lazy" onError={e => { e.currentTarget.src = imageForCategory(listing.category) }}/>
      <span className={`listing-type ${listing.listingType === 'donation' ? 'type-donation' : 'type-resale'}`}>{listing.listingType === 'donation' ? <><Heart size={12} fill="currentColor"/> Free</> : <><Tag size={12}/> For sale</>}</span>
      {listing.isSample && <span className="sample-pill">Example</span>}
    </Link>
    <div className="listing-card-body">
      <div className="card-meta"><span>{listing.category.replace('Engineering & Academic Textbooks', 'Academic books').replace('Lab Coats & Lab Supplies', 'Lab supplies')}</span><span className="condition-dot">{listing.condition}</span></div>
      <Link to={`/items/${listing.id}`} className="listing-title">{listing.title}</Link>
      <div className="listing-price-row"><div className="price-group"><strong>{listing.listingType === 'donation' ? 'Free' : money(listing.price)}</strong>{listing.listingType === 'resale' && listing.mrp !== null && listing.mrp > listing.price && <del>{money(listing.mrp)}</del>}</div>{savings !== null && <span className="saving-tag">-{percent}%</span>}</div>
      {savings !== null && <div className="saving-caption">Save {money(savings)} vs. declared MRP</div>}
      <div className="listing-card-bottom"><span className="seller-mini"><span className="seller-avatar">{listing.sellerName.slice(0,1).toUpperCase()}</span>{listing.sellerName}</span><span className="listing-date">{dateLabel(listing.createdAt)}</span></div>
    </div>
  </article>
}

function HomePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [stats, setStats] = useState({ approvedListings: 0, availableItems: 0, completedDonations: 0, completedResales: 0, completedHandovers: 0, declaredSavings: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const toast = useToast()
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const [items, impact] = await Promise.all([listListings(), getImpactStats()]); setListings(items.slice(0, 4)); setStats(impact) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load listings.'); toast('The homepage could not load all data.', 'error') }
    finally { setLoading(false) }
  }, [toast])
  useEffect(() => { void load() }, [load])
  const doSearch = (e: FormEvent) => { e.preventDefault(); navigate(`/browse?q=${encodeURIComponent(query)}`) }
  const categoryItems = [
    { label: 'Academic books', category: 'Engineering & Academic Textbooks', icon: <BookOpen size={21}/> },
    { label: 'Stationery', category: 'Stationery', icon: <Pencil size={21}/> },
    { label: 'Calculators', category: 'Calculators', icon: <IndianRupee size={21}/> },
    { label: 'Notes & notebooks', category: 'Notebooks', icon: <BookMarked size={21}/> },
  ]
  return <>
    <section className="hero-section"><div className="hero-orb hero-orb-one"/><div className="hero-orb hero-orb-two"/><div className="hero-grid">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> THE STUDENT REUSE COMMUNITY</div><h1>Pass it on.<br/><em>Pay less.</em> Waste less.</h1><p className="hero-description">Find affordable books and supplies, or give your unused educational items a second life. Good things deserve another chapter.</p>
        <form className="hero-search" onSubmit={doSearch}><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search books, calculators, stationery..." aria-label="Search educational materials"/><button type="submit" aria-label="Search"><ArrowRight size={18}/></button></form>
        <div className="hero-ctas"><Link to="/browse" className="btn btn-primary btn-large">Explore items <ArrowRight size={17}/></Link><Link to="/list-item" className="btn btn-soft btn-large"><HeartHandshake size={17}/> Donate or sell</Link></div>
        <div className="hero-trust"><div className="trust-avatars"><span>A</span><span>I</span><span>K</span><span>+</span></div><span>Built around students helping students</span></div>
      </div>
      <div className="hero-art"><div className="hero-image-main"><img src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=90" alt="Books ready to be reused"/><div className="hero-image-overlay"/><div className="hero-image-label"><span className="hero-label-icon"><BookOpen size={18}/></span><span><strong>Every item has a next chapter.</strong><small>Pass knowledge forward.</small></span></div></div><div className="float-card float-card-saving"><span className="float-icon"><Tag size={17}/></span><span><strong>More value, less spend</strong><small>Student-friendly resale</small></span></div><div className="float-card float-card-free"><span className="float-heart"><Heart size={18} fill="currentColor"/></span><span><strong>Give freely</strong><small>Make someone's day</small></span></div><div className="hero-sunburst"><Leaf size={24}/></div></div>
    </div><div className="hero-bottom-line"><span>01 / SHARE</span><span/><span>02 / DISCOVER</span><span/><span>03 / REUSE</span></div></section>

    <section className="impact-strip"><div className="impact-intro"><span className="eyebrow">SMALL ACTION, REAL DIFFERENCE</span><p>Make more of what<br/>you already have.</p></div><div className="impact-number"><strong>{stats.availableItems}</strong><span>Items available</span></div><div className="impact-number"><strong>{stats.completedHandovers}</strong><span>Completed handovers</span></div><div className="impact-number"><strong>{money(stats.declaredSavings)}</strong><span>Declared savings from completed resales</span></div><div className="impact-note"><ShieldCheck size={17}/><span>Impact figures update from recorded activity.</span></div></section>

    <section className="section categories-section"><div className="section-heading"><div><span className="eyebrow">FIND YOUR NEXT FAVOURITE</span><h2>What are you looking for?</h2><p>Useful things, ready for a new owner.</p></div><Link to="/browse" className="text-link">See all items <ArrowUpRight size={16}/></Link></div><div className="category-grid">{categoryItems.map((c, i) => <button className={`category-tile category-tile-${i + 1}`} key={c.label} onClick={() => navigate(`/browse?category=${encodeURIComponent(c.category)}`)}><span className="category-icon">{c.icon}</span><span className="category-tile-title">{c.label}</span><span className="category-tile-arrow"><ArrowUpRight size={17}/></span></button>)}</div></section>

    <section className="section latest-section"><div className="section-heading"><div><span className="eyebrow">FRESH FINDS</span><h2>Recently listed</h2><p>Give great materials a second life.</p></div><Link to="/browse" className="text-link">Browse the marketplace <ArrowRight size={16}/></Link></div>
      {loading ? <Spinner label="Loading the latest listings..."/> : error ? <ErrorPanel text={error} onRetry={load}/> : listings.length ? <div className="listing-grid">{listings.map(item => <ListingCard listing={item} key={item.id}/>)}</div> : <EmptyPanel title="Be the first to list something" text="Share a book or useful study item with your community." action={<Link to="/list-item" className="btn btn-primary">List an item</Link>}/>}
    </section>

    <section className="how-section"><div className="how-visual"><div className="how-visual-photo"><img src="https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1000&q=85" alt="Notebook and study supplies"/></div><div className="how-sticker"><Leaf size={19}/><span>Reuse is a<br/><strong>good habit.</strong></span></div></div><div className="how-copy"><span className="eyebrow">SIMPLE BY DESIGN</span><h2>Good things happen<br/>when we pass them on.</h2><p className="how-lede">A simple way to help useful things reach the people who need them next.</p><div className="how-step"><span>01</span><div><strong>List what you no longer need</strong><p>Choose a free donation or set a fair resale price. Add a photo and a few details.</p></div></div><div className="how-step"><span>02</span><div><strong>Find something useful</strong><p>Search by subject, category, item condition, or price to find the right fit.</p></div></div><div className="how-step"><span>03</span><div><strong>Connect and pass it on</strong><p>Send an interest request, arrange a safe handover, and give the item another chapter.</p></div></div><Link to="/about" className="btn btn-outline">See how ReuseHub works <ArrowRight size={16}/></Link></div></section>

    <section className="cta-section"><div className="cta-ornament cta-ornament-one"/><div className="cta-ornament cta-ornament-two"/><div className="cta-copy"><span className="eyebrow eyebrow-light"><Sparkles size={14}/> YOUR NEXT CHAPTER STARTS HERE</span><h2>Have something useful<br/>sitting on your shelf?</h2><p>Someone else might be looking for exactly that.</p><Link to="/list-item" className="btn btn-cream btn-large">List an item today <ArrowRight size={17}/></Link></div><div className="cta-doodle"><BookOpen size={94} strokeWidth={1.1}/><span><Heart size={23} fill="currentColor"/></span></div></section>
  </>
}

function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'all')
  const [type, setType] = useState(searchParams.get('type') || 'all')
  const [condition, setCondition] = useState('all')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const toast = useToast()
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const list = await listListings({ search, category, type, condition, maxPrice, sort }); setItems(list); setSearchParams(p => { if (search) p.set('q', search); else p.delete('q'); if (category !== 'all') p.set('category', category); else p.delete('category'); if (type !== 'all') p.set('type', type); else p.delete('type'); return p }, { replace: true }) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load items.'); toast('Unable to load marketplace items.', 'error') }
    finally { setLoading(false) }
  }, [search, category, type, condition, maxPrice, sort, setSearchParams, toast])
  useEffect(() => { void load() }, [load])
  const clear = () => { setSearch(''); setCategory('all'); setType('all'); setCondition('all'); setMaxPrice(''); setSort('newest') }
  const filterCount = [category !== 'all', type !== 'all', condition !== 'all', Boolean(maxPrice)].filter(Boolean).length
  return <div className="page-container browse-page"><div className="page-heading"><div><span className="eyebrow">THE REUSE MARKETPLACE</span><h1>Find your next <em>good thing.</em></h1><p>Books, supplies, and study essentials looking for a new home.</p></div><Link to="/list-item" className="btn btn-primary"><PackagePlus size={17}/> List an item</Link></div>
    <div className="browse-search-row"><form className="browse-search" onSubmit={e => { e.preventDefault(); void load() }}><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Try ‘data structures’ or ‘calculator’"/><button type="submit" className="btn btn-primary btn-small">Search</button></form><button className={`btn btn-outline filter-mobile-trigger ${filtersOpen ? 'selected' : ''}`} onClick={() => setFiltersOpen(v => !v)}><SlidersHorizontal size={16}/> Filters {filterCount > 0 && <span className="filter-count">{filterCount}</span>}</button></div>
    <div className="browse-layout"><aside className={`filter-sidebar ${filtersOpen ? 'filter-sidebar-open' : ''}`}><div className="filter-heading"><strong><Filter size={16}/> Refine your search</strong><button className="text-button" onClick={clear}>Clear all</button></div>
      <div className="filter-group"><label htmlFor="category-filter">Category</label><select id="category-filter" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c => <option value={c} key={c}>{c}</option>)}</select></div>
      <div className="filter-group"><label>Listing type</label><div className="filter-pills"><button className={type === 'all' ? 'active' : ''} onClick={() => setType('all')}>All</button><button className={type === 'donation' ? 'active' : ''} onClick={() => setType('donation')}>Free</button><button className={type === 'resale' ? 'active' : ''} onClick={() => setType('resale')}>For sale</button></div></div>
      <div className="filter-group"><label htmlFor="condition-filter">Condition</label><select id="condition-filter" value={condition} onChange={e => setCondition(e.target.value)}><option value="all">Any condition</option>{conditions.map(c => <option key={c}>{c}</option>)}</select></div>
      <div className="filter-group"><label htmlFor="max-price">Maximum price</label><div className="price-input-wrap"><span>₹</span><input id="max-price" type="number" min="0" placeholder="No limit" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}/></div><div className="quick-prices">{['100', '250', '500'].map(p => <button key={p} className={maxPrice === p ? 'active' : ''} onClick={() => setMaxPrice(maxPrice === p ? '' : p)}>Under ₹{p}</button>)}</div></div>
      <div className="filter-help"><ShieldCheck size={17}/><p>Always check the item's condition and edition before arranging a handover.</p></div><button className="btn btn-primary apply-filter-btn" onClick={() => setFiltersOpen(false)}>Show {items.length} results</button>
    </aside><section className="browse-results"><div className="results-toolbar"><div><strong>{loading ? 'Finding items…' : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}</strong><span>{category !== 'all' ? ` in ${category}` : ' available to explore'}</span></div><label className="sort-select"><span>Sort by</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Recently added</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select><ChevronDown size={14}/></label></div>
      {loading ? <Spinner label="Finding items for you..."/> : error ? <ErrorPanel text={error} onRetry={load}/> : items.length ? <div className="listing-grid">{items.map(item => <ListingCard key={item.id} listing={item}/>)}</div> : <EmptyPanel title="No items matched that search" text="Try another keyword or clear a filter to discover more items." action={<button className="btn btn-outline" onClick={clear}>Clear filters</button>}/>}
    </section></div>
  </div>
}

function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { setUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const next = new URLSearchParams(location.search).get('next') || '/dashboard'
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const isSignup = mode === 'signup'
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('')
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    if (isSignup && !displayName.trim()) { setError('Enter your name to create an account.'); return }
    if (password.length < 6) { setError('Use a password with at least 6 characters.'); return }
    setLoading(true)
    try {
      if (isSignup) {
        const result = await serviceSignUp(displayName, email, password)
        if (result.user) { setUser(result.user); toast('Welcome to ReuseHub!'); navigate(next) }
        else { toast('Account created. Check your email to confirm the account.', 'info'); navigate('/login') }
      } else {
        const user = await serviceSignIn(email, password)
        setUser(user); toast(`Welcome back, ${user.displayName.split(' ')[0]}!`); navigate(next)
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }
  async function resendConfirmation() {
    setError('')
    if (!email.trim()) { setError('Enter your email address above first.'); return }
    setResendingConfirmation(true)
    try {
      await resendSignupConfirmation(email)
      toast('Confirmation email requested. Open the newest email and use its confirmation link.', 'info')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the confirmation email. Please try again.')
    } finally {
      setResendingConfirmation(false)
    }
  }
  async function demo(role: 'user' | 'admin') {
    setLoading(true); setError('')
    try { const user = await serviceSignIn(role === 'admin' ? 'admin@reusehub.local' : 'student@reusehub.local', 'local-demo-password', role, role === 'admin' ? 'Demo Admin' : 'Demo Student'); setUser(user); toast(role === 'admin' ? 'Entered local demo administrator view.' : 'Welcome to the local demo!'); navigate(role === 'admin' ? '/admin' : next) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not start demo.') }
    finally { setLoading(false) }
  }
  return <div className="auth-page"><div className="auth-art"><div className="auth-art-content"><Brand/><div className="auth-art-stack"><div className="book-slab book-slab-one"/><div className="book-slab book-slab-two"/><div className="book-slab book-slab-three"/><div className="book-slab book-slab-four"><BookOpen size={62}/></div><span className="auth-leaf auth-leaf-one"><Leaf size={29}/></span><span className="auth-leaf auth-leaf-two"><Sparkles size={22}/></span></div><h2>Good things deserve<br/>another chapter.</h2><p>Keep useful things in circulation. Help students find what they need next.</p><div className="auth-art-note"><HeartHandshake size={17}/> Built around students helping students</div></div></div><div className="auth-panel"><div className="auth-panel-inner"><Link to="/" className="back-home"><ChevronLeft size={15}/> Back to home</Link><span className="eyebrow">WELCOME TO REUSEHUB</span><h1>{isSignup ? 'Join the reuse community.' : 'Good to see you again.'}</h1><p className="auth-intro">{isSignup ? 'Create an account to share, discover, and pass useful things forward.' : 'Sign in to manage your listings and connect with your community.'}</p>
      <form onSubmit={submit} className="auth-form">{isSignup && <div className="field"><label htmlFor="auth-name">Your name</label><div className="input-icon-wrap"><UserRound size={17}/><input id="auth-name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Shivani Patil" autoComplete="name"/></div></div>}
        <div className="field"><label htmlFor="auth-email">Email address</label><div className="input-icon-wrap"><Mail size={17}/><input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></div></div>
        <div className="field"><label htmlFor="auth-password">Password</label><div className="input-icon-wrap"><LockKeyhole size={17}/><input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={isSignup ? 'new-password' : 'current-password'}/><button type="button" className="show-password" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></div>
        {error && <div className="form-error"><CircleAlert size={16}/>{error}</div>}<button type="submit" className="btn btn-primary btn-full btn-large" disabled={loading}>{loading ? <><span className="spinner spinner-light"/> Please wait…</> : <>{isSignup ? 'Create account' : 'Sign in'} <ArrowRight size={17}/></>}</button>
      </form>
      {isLiveBackend() && !isSignup && <div className="resend-confirmation"><p>Did you create an account but haven't confirmed your email yet?</p><button type="button" className="btn btn-text btn-full" onClick={resendConfirmation} disabled={loading || resendingConfirmation}>{resendingConfirmation ? 'Sending confirmation email…' : 'Resend confirmation email'}</button></div>}
      <div className="auth-switch">{isSignup ? 'Already part of the community?' : 'New to ReuseHub?'} <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link></div>
      {!isLiveBackend() && <div className="demo-login"><div className="demo-login-label"><Sparkles size={15}/> Explore without backend setup</div><p>Local demo data is saved in this browser only. Demo accounts are for testing, not real authentication.</p><button className="btn btn-outline btn-full" onClick={() => demo('user')} disabled={loading}><UserRound size={16}/> Continue as demo student</button><button className="btn btn-text btn-full" onClick={() => demo('admin')} disabled={loading}><ShieldCheck size={16}/> Open demo admin view</button></div>}
      {isLiveBackend() && <div className="auth-security-note"><ShieldCheck size={16}/> Your sign-in is handled securely by Supabase Authentication.</div>}
    </div></div></div>
}

function ListingFormPage() {
  const { id: editId } = useParams()
  const location = useLocation()
  const isEdit = Boolean(editId)
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [condition, setCondition] = useState<typeof conditions[number]>('Good')
  const [listingType, setListingType] = useState<'donation' | 'resale'>('resale')
  const [mrp, setMrp] = useState('')
  const [price, setPrice] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!editId || !user) return
    let active = true
    getListing(editId).then(item => {
      if (!active) return
      if (!item || (item.sellerId !== user.id && user.role !== 'admin')) { setError('This listing was not found, or you do not have permission to edit it.'); setLoading(false); return }
      setTitle(item.title); setDescription(item.description); setCategory(item.category); setCondition(item.condition); setListingType(item.listingType); setMrp(item.mrp === null ? '' : String(item.mrp)); setPrice(item.listingType === 'resale' ? String(item.price) : ''); setCoverImage(item.coverImage); setPreview(item.coverImage); setLoading(false)
    }).catch(err => { if (active) { setError(err instanceof Error ? err.message : 'Unable to load this listing.'); setLoading(false) } })
    return () => { active = false }
  }, [editId, user])
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url) }, [file])
  const mrpNum = mrp.trim() ? Number(mrp) : null
  const priceNum = listingType === 'donation' ? 0 : Number(price)
  const savings = mrpNum !== null && Number.isFinite(mrpNum) && mrpNum > priceNum && listingType === 'resale' ? mrpNum - priceNum : null
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('')
    if (!user) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return }
    if (title.trim().length < 3) { setError('Enter a title with at least 3 characters.'); return }
    if (description.trim().length < 10) { setError('Add a little more detail (at least 10 characters).'); return }
    if (listingType === 'resale' && (!price.trim() || !Number.isFinite(priceNum) || priceNum <= 0)) { setError('Enter a valid asking price greater than ₹0.'); return }
    if (listingType === 'resale' && mrp.trim() && (!Number.isFinite(mrpNum) || Number(mrp) <= 0)) { setError('MRP must be a valid amount greater than ₹0, or leave it blank.'); return }
    if (file && (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)) { setError('Choose an image smaller than 5 MB.'); return }
    setSaving(true)
    const input: ListingInput = { title, description, category, condition, listingType, mrp: listingType === 'resale' ? mrpNum : null, price: priceNum, coverImageFile: file, existingCoverImage: coverImage || undefined }
    try {
      const saved = isEdit && editId ? await updateListing(user, editId, input) : await createListing(user, input)
      toast(isEdit ? 'Your listing has been updated.' : 'Your item is now listed!')
      navigate(`/items/${saved.id}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save the listing.') }
    finally { setSaving(false) }
  }
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(window.location.pathname)}`} replace/>
  if (loading) return <div className="page-container"><Spinner label="Loading your listing..."/></div>
  return <div className="page-container listing-form-page"><div className="form-page-heading"><Link to="/dashboard" className="back-link"><ChevronLeft size={16}/> Back to dashboard</Link><span className="eyebrow">GIVE IT ANOTHER CHAPTER</span><h1>{isEdit ? 'Make an update.' : 'Give something a new home.'}</h1><p>A few details help the right person find your item.</p></div>
    <form className="listing-form-layout" onSubmit={submit}><div className="listing-form-main panel-card"><div className="form-section-title"><span>01</span><div><h2>Tell us about the item</h2><p>Be clear about the item and its condition.</p></div></div>
      <div className="field"><label htmlFor="item-title">Item title <span className="required">*</span></label><input id="item-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Structures textbook" maxLength={90} required/><small>Use a name other students will recognize.</small></div>
      <div className="form-two-col"><div className="field"><label htmlFor="item-category">Category <span className="required">*</span></label><select id="item-category" value={category} onChange={e => { setCategory(e.target.value); if (!file && !coverImage) setPreview(imageForCategory(e.target.value)) }}>{categories.map(c => <option key={c}>{c}</option>)}</select></div><div className="field"><label htmlFor="item-condition">Condition <span className="required">*</span></label><select id="item-condition" value={condition} onChange={e => setCondition(e.target.value as typeof conditions[number])}>{conditions.map(c => <option key={c}>{c}</option>)}</select></div></div>
      <div className="field"><label htmlFor="item-description">Description <span className="required">*</span></label><textarea id="item-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Share the edition, what's included, any marks or wear, and anything a buyer should know." rows={5} maxLength={1200} required/><div className="field-bottom-note"><small>Honest details help everyone make a good decision.</small><small>{description.length}/1200</small></div></div>
      <div className="form-section-title form-section-gap"><span>02</span><div><h2>Add a photo</h2><p>A real photo helps the next owner understand what they're getting.</p></div></div>
      <label htmlFor="item-photo" className={`upload-zone ${preview ? 'upload-zone-filled' : ''}`}><input id="item-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { setFile(e.target.files?.[0] || null); setCoverImage('') }}/>{preview ? <><img src={preview} alt="Listing preview"/><span className="upload-replace"><Upload size={15}/> Replace image</span></> : <><span className="upload-icon"><Upload size={23}/></span><strong>Click to upload a photo</strong><span>PNG, JPG, or WebP · Up to 5 MB</span></>}<small>Use only photos you have permission to share.</small></label>
    </div><aside className="listing-form-side"><div className="panel-card listing-type-panel"><div className="form-section-title"><span>03</span><div><h2>Choose how to pass it on</h2><p>Both options keep useful things in circulation.</p></div></div>
      <button type="button" className={`listing-type-choice ${listingType === 'donation' ? 'choice-selected' : ''}`} onClick={() => { setListingType('donation'); setPrice(''); setMrp('') }}><span className="choice-icon choice-free"><HeartHandshake size={21}/></span><span className="choice-copy"><strong>Donate for free</strong><small>Give it to a student who can use it.</small></span><span className="choice-radio">{listingType === 'donation' && <Check size={13}/>}</span></button>
      <button type="button" className={`listing-type-choice ${listingType === 'resale' ? 'choice-selected' : ''}`} onClick={() => setListingType('resale')}><span className="choice-icon choice-sell"><Tag size={21}/></span><span className="choice-copy"><strong>Sell at your price</strong><small>Recover some of what you spent.</small></span><span className="choice-radio">{listingType === 'resale' && <Check size={13}/>}</span></button>
      {listingType === 'resale' && <div className="price-fields"><div className="field"><label htmlFor="item-mrp">Original MRP <span className="optional">(optional)</span></label><div className="price-input-wrap"><span>₹</span><input id="item-mrp" type="number" min="1" step="1" placeholder="e.g. 600" value={mrp} onChange={e => setMrp(e.target.value)}/></div></div><div className="field"><label htmlFor="item-price">Your asking price <span className="required">*</span></label><div className="price-input-wrap"><span>₹</span><input id="item-price" type="number" min="1" step="1" placeholder="e.g. 250" value={price} onChange={e => setPrice(e.target.value)} required/></div></div>
          {savings !== null ? <div className="savings-preview"><span><Sparkles size={16}/></span><div><strong>Buyers save {money(savings)}{mrpNum ? ` (${(savings / mrpNum * 100).toFixed(1)}%)` : ''}</strong><small>Compared with your declared MRP.</small></div></div> : <div className="price-tip"><CircleHelp size={16}/><span>Choose a fair price based on the item's edition, age, and condition. MRP is seller-declared.</span></div>}
        </div>}
      <div className="form-trust-note"><ShieldCheck size={17}/><p>Meet at an agreed public place, inspect the item, and arrange payment directly with the other student.</p></div></div>
      {error && <div className="form-error"><CircleAlert size={16}/>{error}</div>}
      <div className="form-submit-panel"><p>By listing this item, you confirm that the description is accurate and the item is permitted under ReuseHub's guidelines.</p><button type="submit" className="btn btn-primary btn-full btn-large" disabled={saving}>{saving ? <><span className="spinner spinner-light"/> Saving…</> : <>{isEdit ? 'Save changes' : 'Publish listing'} <ArrowRight size={17}/></>}</button><Link to="/guidelines" className="guidelines-link">Read listing guidelines <ExternalLink size={13}/></Link></div>
    </aside></form>
  </div>
}

function ItemDetailsPage() {
  const { id: listingId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Hi! Is this item still available?')
  const [showRequest, setShowRequest] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('Misleading item information')
  const [reportDetails, setReportDetails] = useState('')
  const [related, setRelated] = useState<Listing[]>([])
  const [myRequests, setMyRequests] = useState<InterestRequest[]>([])
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const item = listingId ? await getListing(listingId) : null
      if (!item) { setListing(null); setError('This listing could not be found. It may have been removed.'); return }
      setListing(item)
      const [others, requests] = await Promise.all([listListings({ category: item.category }), user ? listInterests(user) : Promise.resolve([])])
      setRelated(others.filter(x => x.id !== item.id).slice(0, 3)); setMyRequests(requests)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load item details.') }
    finally { setLoading(false) }
  }, [listingId, user])
  useEffect(() => { void load() }, [load])
  if (loading) return <div className="page-container"><Spinner label="Loading item details..."/></div>
  if (error || !listing) return <div className="page-container"><ErrorPanel text={error || 'Listing not found.'} onRetry={load}/><Link to="/browse" className="btn btn-outline">Back to browse</Link></div>
  const isOwner = user?.id === listing.sellerId
  const savings = listing.mrp !== null && listing.mrp > listing.price && listing.listingType === 'resale' ? listing.mrp - listing.price : null
  const alreadyRequested = myRequests.some(r => r.listingId === listing.id && ['pending', 'accepted'].includes(r.status))
  async function requestItem(e: FormEvent) {
    e.preventDefault()
   if (!listing) return 
    if (!user) { navigate(`/login?next=${encodeURIComponent(`/items/${listing.id}`)}`); return }
    setRequesting(true)
    try { await createInterest(user, listing.id, message); toast('Interest sent. You can track it in your dashboard.'); setShowRequest(false); await load() }
    catch (err) { toast(err instanceof Error ? err.message : 'Could not send request.', 'error') }
    finally { setRequesting(false) }
  }
  if (!listing) return
  async function reportItem(e: FormEvent) {
    e.preventDefault()
    if (!listing) return
    if (!user) { navigate(`/login?next=${encodeURIComponent(`/items/${listing.id}`)}`); return }
    try { await createReport(user, listing.id, reportReason, reportDetails); toast('Thanks. Your report has been submitted for review.'); setReportOpen(false); setReportDetails('') }
    catch (err) { toast(err instanceof Error ? err.message : 'Could not submit report.', 'error') }
  }
  return <div className="page-container detail-page"><div className="breadcrumbs"><Link to="/browse">Marketplace</Link><ChevronRight size={14}/><span>{listing.category}</span></div>
    <div className="detail-layout"><div className="detail-gallery"><div className="detail-photo"><img src={listing.coverImage || imageForCategory(listing.category)} alt={listing.title} onError={e => { e.currentTarget.src = imageForCategory(listing.category) }}/><span className={`listing-type ${listing.listingType === 'donation' ? 'type-donation' : 'type-resale'}`}>{listing.listingType === 'donation' ? <><Heart size={12} fill="currentColor"/> Free donation</> : <><Tag size={12}/> For sale</>}</span>{listing.isSample && <span className="sample-pill">Example listing</span>}</div><div className="detail-photo-note"><ShieldCheck size={16}/><span>Ask questions and check the item before agreeing to a handover.</span></div></div>
      <div className="detail-info"><span className="eyebrow">{listing.category}</span><h1>{listing.title}</h1><div className="detail-seller"><span className="seller-avatar seller-avatar-large">{listing.sellerName.slice(0,1).toUpperCase()}</span><span><strong>{listing.sellerName}</strong><small>Listed {dateLabel(listing.createdAt)}</small></span><span className="condition-badge">{listing.condition}</span></div>
        <div className="detail-price-block"><div className="detail-price-main"><strong>{listing.listingType === 'donation' ? 'Free' : money(listing.price)}</strong>{listing.listingType === 'resale' && listing.mrp !== null && <del>{money(listing.mrp)} MRP</del>}</div>{savings !== null && <div className="detail-savings"><span><Sparkles size={15}/></span><strong>Save {money(savings)} ({((savings / (listing.mrp || 1)) * 100).toFixed(1)}%)</strong><small>Compared with seller-declared MRP</small></div>}</div>
        <div className="detail-description"><h3>About this item</h3><p>{listing.description}</p></div>
        <div className="detail-facts"><div><span>Condition</span><strong>{listing.condition}</strong></div><div><span>Listing type</span><strong>{listing.listingType === 'donation' ? 'Free donation' : 'Resale'}</strong></div><div><span>Availability</span><strong className={`status-text status-${listing.status}`}>{listing.status === 'available' ? 'Available' : listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}</strong></div></div>
        {listing.status === 'available' && !isOwner && (listing.isSample ? <div className="sample-explainer"><Sparkles size={17}/><span><strong>Illustrative example listing</strong><small>This sample is for exploring the design. Create a listing in demo mode to test the complete request workflow.</small></span></div> : <div className="detail-actions">{alreadyRequested ? <div className="request-sent"><CircleCheck size={18}/><span><strong>You've sent a request</strong><small>Track it from your dashboard.</small></span><Link to="/dashboard" className="text-link">View</Link></div> : <button className="btn btn-primary btn-large btn-full" onClick={() => user ? setShowRequest(v => !v) : navigate(`/login?next=${encodeURIComponent(`/items/${listing.id}`)}`)}><MessageCircle size={18}/> I'm interested <ArrowRight size={17}/></button>}{showRequest && <form className="request-form" onSubmit={requestItem}><label htmlFor="request-message">Message to the seller</label><textarea id="request-message" rows={3} maxLength={500} value={message} onChange={e => setMessage(e.target.value)} placeholder="Ask a question or suggest a handover time."/><button type="submit" className="btn btn-primary btn-full" disabled={requesting}>{requesting ? 'Sending…' : 'Send interest request'}</button><small>Don't share sensitive personal information here.</small></form>}</div>)}
        {isOwner && <div className="owner-actions"><Link className="btn btn-primary btn-full" to={`/edit/${listing.id}`}><Pencil size={16}/> Edit your listing</Link><Link className="btn btn-outline btn-full" to="/dashboard">Manage requests</Link></div>}
        {listing.status === 'reserved' && <div className="reserved-note"><Clock3 size={18}/><span><strong>This item is reserved</strong><small>The seller is arranging a handover with another student.</small></span></div>}
        {listing.status === 'completed' && <div className="reserved-note"><PackageCheck size={18}/><span><strong>This item has found a new home</strong><small>Thanks for helping keep useful materials in circulation.</small></span></div>}
        <div className="detail-secondary"><button className="text-button report-button" onClick={() => setReportOpen(v => !v)}><Flag size={14}/> Report listing</button><span><LockKeyhole size={13}/> Keep personal details private.</span></div>
        {reportOpen && <form className="report-form" onSubmit={reportItem}><div className="report-header"><strong>Report this listing</strong><button type="button" className="icon-button" onClick={() => setReportOpen(false)}><X size={16}/></button></div><div className="field"><label htmlFor="report-reason">Reason</label><select id="report-reason" value={reportReason} onChange={e => setReportReason(e.target.value)}>{['Misleading item information','Prohibited item','Suspected scam','Duplicate listing','Incorrect price or description','Other'].map(r => <option key={r}>{r}</option>)}</select></div><div className="field"><label htmlFor="report-details">Details (optional)</label><textarea id="report-details" rows={2} value={reportDetails} onChange={e => setReportDetails(e.target.value)} maxLength={500}/></div><button className="btn btn-outline btn-full" type="submit">Submit report</button></form>}
      </div></div>
    {related.length > 0 && <section className="related-section"><div className="section-heading"><div><span className="eyebrow">MORE TO EXPLORE</span><h2>Similar items</h2></div><Link to="/browse" className="text-link">Browse all <ArrowRight size={15}/></Link></div><div className="listing-grid">{related.map(item => <ListingCard listing={item} key={item.id}/>)}</div></section>}
  </div>
}

function DashboardPage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'listings' | 'incoming' | 'outgoing'>('listings')
  const [items, setItems] = useState<Listing[]>([])
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [requests, setRequests] = useState<InterestRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try { const [allItems, allRequests] = await Promise.all([listListings({ includeModeration: true, status: 'all' }), listInterests(user)]); setAllListings(allItems); setItems(allItems.filter(item => item.sellerId === user.id)); setRequests(allRequests) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load dashboard.') }
    finally { setLoading(false) }
  }, [user])
  useEffect(() => { void load() }, [load])
  if (!user) return <Navigate to="/login?next=%2Fdashboard" replace/>
  const incoming = requests.filter(r => r.sellerId === user.id)
  const outgoing = requests.filter(r => r.buyerId === user.id)
  async function action(request: InterestRequest, kind: 'accept' | 'decline' | 'cancel' | 'complete') {
    try { await changeInterestStatus(user!, request.id, kind); toast(kind === 'accept' ? 'Request accepted. The listing is now reserved.' : kind === 'complete' ? 'Handover marked as completed.' : `Request ${kind}ed.`); await load() }
    catch (err) { toast(err instanceof Error ? err.message : 'Could not update this request.', 'error') }
  }
  async function remove(item: Listing) {
    if (!confirm(`Remove “${item.title}” from the marketplace?`)) return
    try { await updateListingStatus(user!, item.id, 'removed'); toast('Listing removed.'); await load() }
    catch (err) { toast(err instanceof Error ? err.message : 'Could not remove listing.', 'error') }
  }
  const statusLabel = (status: string) => status.charAt(0).toUpperCase() + status.slice(1)
  return <div className="page-container dashboard-page"><div className="dashboard-welcome"><div><span className="eyebrow">YOUR REUSEHUB SPACE</span><h1>Hey, {user.displayName.split(' ')[0]} <span className="wave">✳</span></h1><p>Everything you've shared and everything you're looking for, in one place.</p></div><Link to="/list-item" className="btn btn-primary"><PackagePlus size={17}/> List an item</Link></div>
    <div className="dashboard-stats"><div className="dash-stat"><span className="dash-stat-icon"><PackagePlus size={18}/></span><div><strong>{items.length}</strong><small>Your listings</small></div></div><div className="dash-stat"><span className="dash-stat-icon stat-amber"><MessageCircle size={18}/></span><div><strong>{incoming.filter(r => r.status === 'pending').length}</strong><small>New requests</small></div></div><div className="dash-stat"><span className="dash-stat-icon stat-blue"><HeartHandshake size={18}/></span><div><strong>{[...incoming, ...outgoing].filter(r => r.status === 'completed').length}</strong><small>Completed handovers</small></div></div></div>
    <div className="dashboard-tabs" role="tablist"><button role="tab" aria-selected={tab === 'listings'} className={tab === 'listings' ? 'active' : ''} onClick={() => setTab('listings')}><Tag size={16}/> My listings <span>{items.length}</span></button><button role="tab" aria-selected={tab === 'incoming'} className={tab === 'incoming' ? 'active' : ''} onClick={() => setTab('incoming')}><ArrowDownRight size={16}/> Incoming <span>{incoming.length}</span></button><button role="tab" aria-selected={tab === 'outgoing'} className={tab === 'outgoing' ? 'active' : ''} onClick={() => setTab('outgoing')}><ArrowUpRight size={16}/> My requests <span>{outgoing.length}</span></button></div>
    {loading ? <Spinner label="Loading your dashboard..."/> : error ? <ErrorPanel text={error} onRetry={load}/> : <>
      {tab === 'listings' && (items.length ? <div className="dashboard-listings">{items.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(item => <div className="dashboard-listing-row" key={item.id}><img src={item.coverImage} alt="" onError={e => { e.currentTarget.src = imageForCategory(item.category) }}/><div className="dashboard-listing-main"><Link to={`/items/${item.id}`}><strong>{item.title}</strong></Link><span>{item.listingType === 'donation' ? 'Free donation' : money(item.price)} · {dateLabel(item.createdAt)}</span></div><span className={`status-badge status-${item.status}`}>{statusLabel(item.status)}</span><div className="dashboard-row-actions"><Link className="icon-button" to={`/items/${item.id}`} aria-label="View listing"><ExternalLink size={16}/></Link>{item.status !== 'completed' && item.status !== 'removed' && <Link className="icon-button" to={`/edit/${item.id}`} aria-label="Edit listing"><Pencil size={16}/></Link>}{item.status !== 'removed' && <button className="icon-button icon-danger" aria-label="Remove listing" onClick={() => remove(item)}><Trash2 size={16}/></button>}</div></div>)}</div> : <EmptyPanel title="Your shelf is still empty" text="List an unused book or study item and help it find its next owner." action={<Link to="/list-item" className="btn btn-primary">List your first item <ArrowRight size={16}/></Link>}/>)}
      {tab === 'incoming' && (incoming.length ? <div className="request-list">{incoming.map(req => { const item = items.find(i => i.id === req.listingId); return <div className="request-card" key={req.id}><div className="request-card-top"><span className="request-avatar">{req.buyerName.slice(0,1).toUpperCase()}</span><div className="request-person"><strong>{req.buyerName}</strong><small>Interested in <Link to={`/items/${req.listingId}`}>{item?.title || 'your listing'}</Link></small></div><span className={`status-badge status-${req.status}`}>{statusLabel(req.status)}</span></div>{req.message && <blockquote className="request-message">“{req.message}”</blockquote>}<div className="request-card-bottom"><small>Received {dateLabel(req.createdAt)}</small><div>{req.status === 'pending' && <><button className="btn btn-outline btn-small" onClick={() => void action(req, 'decline')}>Decline</button><button className="btn btn-primary btn-small" onClick={() => void action(req, 'accept')}><Check size={14}/> Accept request</button></>}{req.status === 'accepted' && <button className="btn btn-primary btn-small" onClick={() => void action(req, 'complete')}><PackageCheck size={14}/> Mark handover complete</button>}</div></div></div>})}</div> : <EmptyPanel title="No incoming requests yet" text="When a student is interested in your listing, their request will show up here."/>)}
      {tab === 'outgoing' && (outgoing.length ? <div className="request-list">{outgoing.map(req => { const item = allListings.find(i => i.id === req.listingId); return <div className="request-card" key={req.id}><div className="request-card-top"><div className="request-person"><strong><Link to={`/items/${req.listingId}`}>{item?.title || 'Requested item'}</Link></strong><small>Seller: {req.sellerId === user.id ? 'You' : (item?.sellerName || 'Student')}</small></div><span className={`status-badge status-${req.status}`}>{statusLabel(req.status)}</span></div>{req.message && <blockquote className="request-message">“{req.message}”</blockquote>}<div className="request-card-bottom"><small>Sent {dateLabel(req.createdAt)}</small><div>{req.status === 'pending' && <button className="btn btn-outline btn-small" onClick={() => void action(req, 'cancel')}>Cancel request</button>}{req.status === 'accepted' && <span className="status-help">Arrange the handover directly with the seller.</span>}{req.status === 'accepted' && <button className="btn btn-primary btn-small" onClick={() => void action(req, 'complete')}><PackageCheck size={14}/> Mark complete</button>}</div></div></div>})}</div> : <EmptyPanel title="No requests sent yet" text="Find a useful item and send a message to let the seller know you're interested." action={<Link to="/browse" className="btn btn-primary">Browse items <ArrowRight size={16}/></Link>}/>)}
    </>}
    <div className="dashboard-safety"><ShieldCheck size={19}/><div><strong>A quick safety reminder</strong><p>Arrange handovers in a public place, inspect items before completing an exchange, and never share passwords or verification codes.</p></div><Link to="/guidelines">Read guidelines <ArrowRight size={14}/></Link></div>
  </div>
}

function AdminPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState<Listing[]>([])
  const [reports, setReports] = useState<ListingReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'listings' | 'reports'>('listings')
  const load = useCallback(async () => {
    if (user?.role !== 'admin') return
    setLoading(true); setError('')
    try { const [allItems, allReports] = await Promise.all([getAdminListings(), listReports()]); setItems(allItems); setReports(allReports) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load admin data.') }
    finally { setLoading(false) }
  }, [user])
  useEffect(() => { void load() }, [load])
  if (!user) return <Navigate to="/login?next=%2Fadmin" replace/>
  if (user.role !== 'admin') return <div className="page-container"><EmptyPanel title="Administrator access only" text="This area is restricted to authorized administrators." action={<Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>}/></div>
  async function moderate(item: Listing, action: 'approve' | 'reject' | 'remove') {
    try { await moderateListing(user!, item.id, action); toast(action === 'approve' ? 'Listing approved.' : action === 'reject' ? 'Listing rejected.' : 'Listing removed.'); await load() }
    catch (err) { toast(err instanceof Error ? err.message : 'Moderation failed.', 'error') }
  }
  async function reportAction(report: ListingReport, status: 'reviewed' | 'resolved') {
    try { await resolveReport(user!, report.id, status); toast(`Report marked ${status}.`); await load() }
    catch (err) { toast(err instanceof Error ? err.message : 'Could not update report.', 'error') }
  }
  const pendingListings = items.filter(item => item.moderationStatus === 'pending')
  const unresolvedReports = reports.filter(report => report.status !== 'resolved')
  return <div className="page-container admin-page"><div className="admin-heading"><div><span className="eyebrow"><ShieldCheck size={14}/> COMMUNITY CARE</span><h1>Admin workspace</h1><p>Keep ReuseHub safe, useful, and welcoming for everyone.</p></div><span className="admin-role-pill"><ShieldCheck size={16}/> Administrator</span></div><div className="admin-stats"><div><span>All listings</span><strong>{items.length}</strong></div><div><span>Awaiting review</span><strong>{pendingListings.length}</strong></div><div><span>Open reports</span><strong>{unresolvedReports.length}</strong></div></div>
    <div className="dashboard-tabs admin-tabs"><button className={tab === 'listings' ? 'active' : ''} onClick={() => setTab('listings')}><PackagePlus size={16}/> Listings <span>{items.length}</span></button><button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}><Flag size={16}/> Reports <span>{reports.length}</span></button></div>
    {loading ? <Spinner label="Loading moderation data..."/> : error ? <ErrorPanel text={error} onRetry={load}/> : tab === 'listings' ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Item</th><th>Owner</th><th>Type</th><th>Status</th><th>Review</th><th>Actions</th></tr></thead><tbody>{items.filter(item => item.status !== 'removed').map(item => <tr key={item.id}><td><div className="admin-item-cell"><img src={item.coverImage} alt="" onError={e => { e.currentTarget.src = imageForCategory(item.category) }}/><div><Link to={`/items/${item.id}`}><strong>{item.title}</strong></Link><small>{item.category}</small></div>{item.isSample && <span className="sample-pill">Example</span>}</div></td><td>{item.sellerName}</td><td>{item.listingType === 'donation' ? 'Donation' : `Sale · ${money(item.price)}`}</td><td><span className={`status-badge status-${item.status}`}>{item.status}</span></td><td><span className={`status-badge status-${item.moderationStatus}`}>{item.moderationStatus}</span></td><td><div className="admin-actions">{item.moderationStatus !== 'approved' && <button className="btn btn-primary btn-xs" onClick={() => void moderate(item, 'approve')}>Approve</button>}<button className="btn btn-outline btn-xs" onClick={() => void moderate(item, 'reject')}>Reject</button><button className="icon-button icon-danger" title="Remove listing" onClick={() => void moderate(item, 'remove')}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{items.length === 0 && <EmptyPanel title="No listings yet" text="Listings will appear here as students share resources."/>}</div> : <div className="report-list">{reports.length ? reports.map(report => { const item = items.find(x => x.id === report.listingId); return <div className="report-card" key={report.id}><div className="report-card-top"><span className="report-flag"><Flag size={17}/></span><div><strong>{report.reason}</strong><small>{item ? <Link to={`/items/${item.id}`}>{item.title}</Link> : 'Listing no longer available'} · {dateLabel(report.createdAt)}</small></div><span className={`status-badge status-${report.status}`}>{report.status}</span></div>{report.details && <p>{report.details}</p>}<div className="report-actions">{report.status === 'pending' && <button className="btn btn-outline btn-small" onClick={() => void reportAction(report, 'reviewed')}>Mark reviewed</button>}{report.status !== 'resolved' && <button className="btn btn-primary btn-small" onClick={() => void reportAction(report, 'resolved')}><Check size={14}/> Resolve report</button>}</div></div>}) : <EmptyPanel title="No reports submitted" text="Reports from the community will appear here for review."/>}</div>}
    <div className="admin-note"><LockKeyhole size={17}/><span>Administrator actions should be protected by database permissions in a connected Supabase deployment. The local demo admin role is only a browser-based demonstration.</span></div>
  </div>
}

function AboutPage() {
  return <div className="page-container content-page"><span className="eyebrow">WHY REUSEHUB EXISTS</span><h1>Good things deserve<br/><em>another chapter.</em></h1><p className="content-lede">ReuseHub brings students together around a simple idea: educational materials should be easier to find, affordable to access, and useful for as long as possible.</p><div className="content-feature-grid"><div><span><HeartHandshake size={23}/></span><h3>Give without a barrier</h3><p>List an item as a free donation for someone who can use it next.</p></div><div><span><Tag size={23}/></span><h3>Resell at a fair price</h3><p>Choose an asking price and help another student spend less on educational essentials.</p></div><div><span><Leaf size={23}/></span><h3>Keep useful things moving</h3><p>Encourage reuse instead of letting serviceable books and supplies sit unused.</p></div></div><div className="content-section"><h2>The problem we're trying to solve</h2><p>Students often finish courses with materials they no longer need, while other students are searching for those same resources. Informal messaging groups can be difficult to search, and a donation-only model may not work for everyone. ReuseHub provides one searchable place for free donations and affordable resales, with clear listing details and a structured request workflow.</p><h2>How it works</h2><ol><li><strong>List:</strong> Add the item, explain its condition, upload a photo, and choose donation or resale.</li><li><strong>Discover:</strong> Other students can search and filter listings to find something useful.</li><li><strong>Connect:</strong> A buyer sends an interest request; the seller accepts or declines it.</li><li><strong>Pass it on:</strong> Students agree on a safe handover and mark the item completed.</li></ol><h2>What ReuseHub does not do</h2><p>The first version does not process payments, provide delivery, independently verify MRP, guarantee an item's condition, or certify a user's identity. Students should inspect an item and agree on payment and handover directly.</p></div><div className="content-cta"><div><strong>Have something useful to share?</strong><span>Let it find its next owner.</span></div><Link to="/list-item" className="btn btn-cream">List an item <ArrowRight size={16}/></Link></div></div>
}
function GuidelinesPage() {
  const rules = [
    ['List educational and study-related items', 'Textbooks, reference books, permitted notes, stationery, calculators, lab coats, and suitable educational materials are welcome.'],
    ['Describe condition honestly', 'Mention marks, wear, missing parts, edition numbers, and anything a buyer should know. Add photos that represent the actual item.'],
    ['Use fair and transparent pricing', "MRP and condition information are entered by sellers. Compare editions and condition, and do not misrepresent the item’s value."],
    ['Meet safely for handovers', 'Choose an agreed public place, preferably on campus. Inspect the item before agreeing to complete the handover.'],
    ['Protect private information', 'Do not share passwords, verification codes, sensitive documents, or unnecessary personal details through listing messages.'],
    ['Report inappropriate listings', 'Use the report function for suspected scams, prohibited items, duplicates, or misleading descriptions. Administrators can review reports.'],
  ]
  return <div className="page-container content-page guidelines-page"><span className="eyebrow">A BETTER COMMUNITY STARTS HERE</span><h1>Keep it useful.<br/><em>Keep it safe.</em></h1><p className="content-lede">A few simple guidelines help make ReuseHub more helpful and trustworthy for every student.</p><div className="guideline-list">{rules.map((rule, i) => <div className="guideline-row" key={rule[0]}><span className="guideline-number">{String(i + 1).padStart(2, '0')}</span><div><h3>{rule[0]}</h3><p>{rule[1]}</p></div><CheckCircle2 size={19}/></div>)}</div><div className="guidelines-warning"><ShieldCheck size={22}/><div><strong>Remember: use your judgement.</strong><p>ReuseHub helps students discover and coordinate exchanges. It does not guarantee seller identity, item condition, or transaction outcomes.</p></div></div><Link to="/browse" className="btn btn-primary">Explore listings <ArrowRight size={16}/></Link></div>
}
function NotFoundPage() { return <div className="page-container not-found"><span className="not-found-number">404</span><h1>This page took another route.</h1><p>The page you’re looking for might have moved, or it may not exist.</p><Link to="/" className="btn btn-primary">Back to home <ArrowRight size={16}/></Link></div> }

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <><Header/><div className="page-container app-loading"><Spinner label="Getting ReuseHub ready..."/></div></>
  return <Layout><Routes><Route path="/" element={<HomePage/>}/><Route path="/browse" element={<BrowsePage/>}/><Route path="/items/:id" element={<ItemDetailsPage/>}/><Route path="/list-item" element={<ListingFormPage/>}/><Route path="/edit/:id" element={<ListingFormPage/>}/><Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/signup" element={<AuthPage mode="signup"/>}/><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/admin" element={<AdminPage/>}/><Route path="/about" element={<AboutPage/>}/><Route path="/guidelines" element={<GuidelinesPage/>}/><Route path="*" element={<NotFoundPage/>}/></Routes></Layout>
}

export default function App() {
  return <BrowserRouter><ToastProvider><AuthProvider><AppRoutes/></AuthProvider></ToastProvider></BrowserRouter>
}
