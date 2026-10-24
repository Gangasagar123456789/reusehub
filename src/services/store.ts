import { supabase, supabaseConfigured } from '../lib/supabase'
import type { AppUser, InterestRequest, Listing, ListingInput, ListingReport, ListingStatus, ModerationStatus } from '../types'

const LS = {
  listings: 'reusehub:listings:v1',
  interests: 'reusehub:interests:v1',
  reports: 'reusehub:reports:v1',
  users: 'reusehub:users:v1',
  session: 'reusehub:session:v1',
}

const fallbackImages: Record<string, string> = {
  'Engineering & Academic Textbooks': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1000&q=85',
  'Reference Books': 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85',
  Notebooks: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=1000&q=85',
  Stationery: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=85',
  Calculators: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=1000&q=85',
  'Lab Coats & Lab Supplies': 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=1000&q=85',
  'Other Educational Materials': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=85',
}

const now = Date.now()
const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString()
const SAMPLE_USER = 'reusehub-sample-seller'

const sampleListings: Listing[] = [
  { id: 'sample-1', sellerId: SAMPLE_USER, sellerName: 'Aarav S.', title: 'Data Structures & Algorithms', description: 'A useful reference for core data structures, trees, graphs, sorting, and algorithm analysis. Some pencil annotations in the margins; all pages intact.', category: 'Engineering & Academic Textbooks', condition: 'Good', listingType: 'resale', mrp: 650, price: 280, status: 'available', moderationStatus: 'approved', coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1000&q=85', createdAt: daysAgo(1), updatedAt: daysAgo(1), isSample: true },
  { id: 'sample-2', sellerId: SAMPLE_USER, sellerName: 'Isha M.', title: 'Engineering Drawing Kit', description: 'Complete geometry and drawing kit. Includes compass, divider, set squares, scale, and pencil. Everything is working and in good condition.', category: 'Stationery', condition: 'Good', listingType: 'resale', mrp: 420, price: 180, status: 'available', moderationStatus: 'approved', coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=85', createdAt: daysAgo(2), updatedAt: daysAgo(2), isSample: true },
  { id: 'sample-3', sellerId: SAMPLE_USER, sellerName: 'Kabir P.', title: 'Semester Notes & Notebooks', description: 'A bundle of clean notebooks with a few unused pages, plus handwritten revision notes. Free to a student who can use them.', category: 'Notebooks', condition: 'Good', listingType: 'donation', mrp: null, price: 0, status: 'available', moderationStatus: 'approved', coverImage: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=1000&q=85', createdAt: daysAgo(3), updatedAt: daysAgo(3), isSample: true },
  { id: 'sample-4', sellerId: SAMPLE_USER, sellerName: 'Meera R.', title: 'Scientific Calculator', description: 'A working scientific calculator suitable for engineering mathematics and physics. Buttons are responsive; please check model requirements before collecting.', category: 'Calculators', condition: 'Like New', listingType: 'resale', mrp: 950, price: 500, status: 'available', moderationStatus: 'approved', coverImage: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=1000&q=85', createdAt: daysAgo(4), updatedAt: daysAgo(4), isSample: true },
  { id: 'sample-5', sellerId: SAMPLE_USER, sellerName: 'Rohan K.', title: 'Physics Reference Book', description: 'Well-maintained reference book with a few highlighted sections. No missing pages. Free pickup arranged directly with the donor.', category: 'Reference Books', condition: 'Fair', listingType: 'donation', mrp: null, price: 0, status: 'available', moderationStatus: 'approved', coverImage: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85', createdAt: daysAgo(5), updatedAt: daysAgo(5), isSample: true },
  { id: 'sample-6', sellerId: SAMPLE_USER, sellerName: 'Sara D.', title: 'Programming Fundamentals', description: 'Introductory programming text with clear examples and exercises. Cover has light wear. A good option for first-year students.', category: 'Engineering & Academic Textbooks', condition: 'Good', listingType: 'resale', mrp: 520, price: 220, status: 'available', moderationStatus: 'approved', coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1000&q=85', createdAt: daysAgo(6), updatedAt: daysAgo(6), isSample: true },
]

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)) }
function id() { return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}` }
function seedListings(): Listing[] {
  const existing = localStorage.getItem(LS.listings)
  if (existing) return read<Listing[]>(LS.listings, sampleListings)
  write(LS.listings, sampleListings)
  return sampleListings
}
function localListings() { return seedListings() }
function localInterests() { return read<InterestRequest[]>(LS.interests, []) }
function localReports() { return read<ListingReport[]>(LS.reports, []) }
function toListing(row: any): Listing {
  return {
    id: row.id, sellerId: row.seller_id, sellerName: row.seller_name || 'Student', title: row.title,
    description: row.description || '', category: row.category, condition: row.condition, listingType: row.listing_type,
    mrp: row.mrp === null || row.mrp === undefined ? null : Number(row.mrp), price: Number(row.price), status: row.status,
    moderationStatus: row.moderation_status, coverImage: row.cover_image || fallbackImages[row.category] || fallbackImages['Other Educational Materials'],
    createdAt: row.created_at, updatedAt: row.updated_at || row.created_at,
  }
}
function toInterest(row: any): InterestRequest {
  return { id: row.id, listingId: row.listing_id, sellerId: row.seller_id, buyerId: row.buyer_id, buyerName: row.buyer_name || 'Student', message: row.message || '', status: row.status, createdAt: row.created_at, updatedAt: row.updated_at || row.created_at }
}
function toReport(row: any): ListingReport {
  return { id: row.id, listingId: row.listing_id, reporterId: row.reporter_id, reason: row.reason, details: row.details || '', status: row.status, createdAt: row.created_at }
}
function toProfile(row: any, email = ''): AppUser {
  return { id: row.id, email, displayName: row.display_name || email.split('@')[0] || 'Student', institution: row.institution || '', academicYear: row.academic_year || '', role: row.role === 'admin' ? 'admin' : 'user' }
}

export const isLiveBackend = () => supabaseConfigured
export const imageForCategory = (category: string) => fallbackImages[category] || fallbackImages['Other Educational Materials']

export async function getCurrentUser(): Promise<AppUser | null> {
  if (supabase) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    const { data: profile } = await supabase.from('profiles').select('id,display_name,institution,academic_year,role').eq('id', user.id).maybeSingle()
    if (!profile) return { id: user.id, email: user.email || '', displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Student', role: 'user' }
    return toProfile(profile, user.email || '')
  }
  return read<AppUser | null>(LS.session, null)
}

export async function signIn(email: string, password: string, demoRole: 'user' | 'admin' = 'user', demoName?: string): Promise<AppUser> {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new Error(error?.message || 'Unable to sign in.')
    const user = await getCurrentUser()
    if (!user) throw new Error('Your account was found, but the profile could not be loaded. Please refresh and try again.')
    return user
  }
  const normalizedEmail = email.trim().toLowerCase()
  const savedProfiles = read<Array<{ email: string; displayName: string }>>(LS.users, [])
  const savedProfile = savedProfiles.find(profile => profile.email.toLowerCase() === normalizedEmail)
  const user: AppUser = { id: `local-${normalizedEmail}`, email: normalizedEmail, displayName: demoName?.trim() || savedProfile?.displayName || email.split('@')[0] || 'Demo Student', role: demoRole }
  write(LS.session, user)
  return user
}

export async function signUp(displayName: string, email: string, password: string): Promise<{ user: AppUser | null; confirmationRequired: boolean }> {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Account could not be created.')
    const user = data.session ? await getCurrentUser() : null
    return { user, confirmationRequired: !data.session }
  }
  const users = read<Array<{ email: string; displayName: string }>>(LS.users, [])
  if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('An account with this email already exists in this browser demo.')
  users.push({ email: email.trim().toLowerCase(), displayName: displayName.trim() })
  write(LS.users, users)
  const user: AppUser = { id: `local-${email.trim().toLowerCase()}`, email: email.trim().toLowerCase(), displayName: displayName.trim(), role: 'user' }
  write(LS.session, user)
  return { user, confirmationRequired: false }
}

export async function signOut() {
  if (supabase) {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  } else localStorage.removeItem(LS.session)
}

export function subscribeAuth(callback: (user: AppUser | null) => void) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) callback(null)
    else {
      // Defer the profile query to avoid calling Supabase from inside its auth callback lock.
      setTimeout(async () => callback(await getCurrentUser()), 0)
    }
  })
  return () => data.subscription.unsubscribe()
}

export interface ListingFilters { search?: string; category?: string; type?: string; condition?: string; maxPrice?: string; sort?: string; includeModeration?: boolean; status?: string }
export async function listListings(filters: ListingFilters = {}): Promise<Listing[]> {
  let items: Listing[]
  if (supabase) {
    let query = supabase.from('listings').select('*')
    if (!filters.includeModeration) query = query.eq('moderation_status', 'approved').neq('status', 'removed')
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category)
    if (filters.type && filters.type !== 'all') query = query.eq('listing_type', filters.type)
    if (filters.condition && filters.condition !== 'all') query = query.eq('condition', filters.condition)
    if (filters.maxPrice) query = query.lte('price', Number(filters.maxPrice))
    if (filters.search?.trim()) query = query.ilike('title', `%${filters.search.trim()}%`)
    const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
    if (error) throw new Error(error.message)
    items = (data || []).map(toListing)
  } else {
    items = localListings().filter(item => {
      if (!filters.includeModeration && (item.moderationStatus !== 'approved' || item.status === 'removed')) return false
      if (filters.status && filters.status !== 'all' && item.status !== filters.status) return false
      if (filters.category && filters.category !== 'all' && item.category !== filters.category) return false
      if (filters.type && filters.type !== 'all' && item.listingType !== filters.type) return false
      if (filters.condition && filters.condition !== 'all' && item.condition !== filters.condition) return false
      if (filters.maxPrice && item.price > Number(filters.maxPrice)) return false
      if (filters.search?.trim() && !`${item.title} ${item.description} ${item.category}`.toLowerCase().includes(filters.search.trim().toLowerCase())) return false
      return true
    })
  }
  if (filters.sort === 'price-asc') items.sort((a, b) => a.price - b.price)
  else if (filters.sort === 'price-desc') items.sort((a, b) => b.price - a.price)
  else items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return items
}

export async function getListing(listingId: string): Promise<Listing | null> {
  if (supabase) {
    const { data, error } = await supabase.from('listings').select('*').eq('id', listingId).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? toListing(data) : null
  }
  return localListings().find(item => item.id === listingId) || null
}

export async function createListing(user: AppUser, input: ListingInput): Promise<Listing> {
  let coverImage = input.existingCoverImage || imageForCategory(input.category)
  if (supabase) {
    if (input.coverImageFile) {
      const ext = input.coverImageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('listing-images').upload(path, input.coverImageFile, { upsert: false, contentType: input.coverImageFile.type })
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`)
      coverImage = supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl
    }
    const { data, error } = await supabase.from('listings').insert({
      seller_id: user.id, title: input.title.trim(), description: input.description.trim(), category: input.category,
      condition: input.condition, listing_type: input.listingType, mrp: input.listingType === 'resale' ? input.mrp : null,
      price: input.listingType === 'donation' ? 0 : input.price, cover_image: coverImage,
      status: 'available', moderation_status: 'approved',
    }).select('*').single()
    if (error) throw new Error(error.message)
    return toListing(data)
  }
  const items = localListings()
  const listing: Listing = {
    id: id(), sellerId: user.id, sellerName: user.displayName, title: input.title.trim(), description: input.description.trim(),
    category: input.category, condition: input.condition, listingType: input.listingType, mrp: input.listingType === 'resale' ? input.mrp : null,
    price: input.listingType === 'donation' ? 0 : input.price, status: 'available', moderationStatus: 'approved',
    coverImage: input.coverImageFile ? await fileToDataUrl(input.coverImageFile) : coverImage, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  write(LS.listings, [listing, ...items])
  return listing
}
function fileToDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read selected image.')); reader.readAsDataURL(file) }) }

export async function updateListing(user: AppUser, listingId: string, input: ListingInput): Promise<Listing> {
  if (supabase) {
    let coverImage = input.existingCoverImage || undefined
    if (input.coverImageFile) {
      const ext = input.coverImageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('listing-images').upload(path, input.coverImageFile, { contentType: input.coverImageFile.type })
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`)
      coverImage = supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl
    }
    const changes: Record<string, unknown> = {
      title: input.title.trim(), description: input.description.trim(), category: input.category, condition: input.condition,
      listing_type: input.listingType, mrp: input.listingType === 'resale' ? input.mrp : null, price: input.listingType === 'donation' ? 0 : input.price,
      updated_at: new Date().toISOString(),
    }
    if (coverImage) changes.cover_image = coverImage
    const { data, error } = await supabase.from('listings').update(changes).eq('id', listingId).eq('seller_id', user.id).select('*').single()
    if (error) throw new Error(error.message)
    return toListing(data)
  }
  const items = localListings()
  const existing = items.find(item => item.id === listingId)
  if (!existing || existing.sellerId !== user.id) throw new Error('You can only edit your own listings.')
  const updated: Listing = { ...existing, title: input.title.trim(), description: input.description.trim(), category: input.category, condition: input.condition, listingType: input.listingType, mrp: input.listingType === 'resale' ? input.mrp : null, price: input.listingType === 'donation' ? 0 : input.price, coverImage: input.coverImageFile ? await fileToDataUrl(input.coverImageFile) : input.existingCoverImage || existing.coverImage, updatedAt: new Date().toISOString() }
  write(LS.listings, items.map(item => item.id === listingId ? updated : item))
  return updated
}

export async function updateListingStatus(user: AppUser, listingId: string, status: ListingStatus): Promise<void> {
  if (supabase) {
    if (status !== 'removed') throw new Error('Status changes must use the reservation or completion workflow.')
    const { error } = await supabase.rpc('remove_listing', { p_listing_id: listingId })
    if (error) throw new Error(error.message)
    return
  }
  const items = localListings()
  const item = items.find(x => x.id === listingId)
  if (!item) throw new Error('Listing not found.')
  if (item.sellerId !== user.id && user.role !== 'admin') throw new Error('You do not have permission to change this listing.')
  write(LS.listings, items.map(x => x.id === listingId ? { ...x, status, updatedAt: new Date().toISOString() } : x))
}

export async function createInterest(user: AppUser, listingId: string, message: string): Promise<InterestRequest> {
  if (supabase) {
    const { data, error } = await supabase.rpc('request_listing', { p_listing_id: listingId, p_message: message.trim() })
    if (error) throw new Error(error.message)
    if (Array.isArray(data)) return toInterest(data[0])
    return toInterest(data)
  }
  const listing = localListings().find(item => item.id === listingId)
  if (!listing || listing.status !== 'available' || listing.moderationStatus !== 'approved') throw new Error('This item is no longer available.')
  if (listing.sellerId === user.id) throw new Error('You cannot request your own listing.')
  const requests = localInterests()
  if (requests.some(r => r.listingId === listingId && r.buyerId === user.id && ['pending', 'accepted'].includes(r.status))) throw new Error('You already have an active request for this item.')
  const item: InterestRequest = { id: id(), listingId, sellerId: listing.sellerId, buyerId: user.id, buyerName: user.displayName, message: message.trim(), status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  write(LS.interests, [item, ...requests])
  return item
}

export async function listInterests(user: AppUser): Promise<InterestRequest[]> {
  if (supabase) {
    const { data, error } = await supabase.from('listing_interests').select('*').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(toInterest)
  }
  return localInterests().filter(r => r.buyerId === user.id || r.sellerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function changeInterestStatus(user: AppUser, requestId: string, action: 'accept' | 'decline' | 'cancel' | 'complete'): Promise<void> {
  if (supabase) {
    if (action === 'accept') {
      const { error } = await supabase.rpc('accept_listing_interest', { p_interest_id: requestId })
      if (error) throw new Error(error.message)
      return
    }
    if (action === 'complete') {
      const { error } = await supabase.rpc('complete_listing_interest', { p_interest_id: requestId })
      if (error) throw new Error(error.message)
      return
    }
    const status = action === 'decline' ? 'declined' : 'cancelled'
    let query = supabase.from('listing_interests').update({ status, updated_at: new Date().toISOString() }).eq('id', requestId).eq('status', 'pending')
    query = action === 'decline' ? query.eq('seller_id', user.id) : query.eq('buyer_id', user.id)
    const { error } = await query
    if (error) throw new Error(error.message)
    return
  }
  const requests = localInterests()
  const request = requests.find(r => r.id === requestId)
  if (!request) throw new Error('Request not found.')
  const listings = localListings()
  const listing = listings.find(item => item.id === request.listingId)
  if (action === 'accept') {
    if (request.sellerId !== user.id) throw new Error('Only the seller can accept this request.')
    if (request.status !== 'pending' || !listing || listing.status !== 'available') throw new Error('This request can no longer be accepted.')
    write(LS.interests, requests.map(r => r.listingId === request.listingId ? { ...r, status: r.id === requestId ? 'accepted' : (r.status === 'pending' ? 'declined' : r.status), updatedAt: new Date().toISOString() } : r))
    write(LS.listings, listings.map(item => item.id === request.listingId ? { ...item, status: 'reserved', updatedAt: new Date().toISOString() } : item))
    return
  }
  if (action === 'decline') {
    if (request.sellerId !== user.id || request.status !== 'pending') throw new Error('You cannot decline this request.')
    write(LS.interests, requests.map(r => r.id === requestId ? { ...r, status: 'declined', updatedAt: new Date().toISOString() } : r))
    return
  }
  if (action === 'cancel') {
    if (request.buyerId !== user.id || request.status !== 'pending') throw new Error('Only your pending requests can be cancelled.')
    write(LS.interests, requests.map(r => r.id === requestId ? { ...r, status: 'cancelled', updatedAt: new Date().toISOString() } : r))
    return
  }
  if (action === 'complete') {
    if (request.sellerId !== user.id && request.buyerId !== user.id) throw new Error('You are not part of this request.')
    if (request.status !== 'accepted' || !listing || listing.status !== 'reserved') throw new Error('Only a reserved handover can be marked complete.')
    write(LS.interests, requests.map(r => r.id === requestId ? { ...r, status: 'completed', updatedAt: new Date().toISOString() } : r))
    write(LS.listings, listings.map(item => item.id === request.listingId ? { ...item, status: 'completed', updatedAt: new Date().toISOString() } : item))
  }
}

export async function createReport(user: AppUser, listingId: string, reason: string, details: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('reports').insert({ listing_id: listingId, reporter_id: user.id, reason, details: details.trim() })
    if (error) throw new Error(error.message)
    return
  }
  const reports = localReports()
  if (reports.some(r => r.listingId === listingId && r.reporterId === user.id && r.status === 'pending')) throw new Error('You have already reported this listing.')
  reports.unshift({ id: id(), listingId, reporterId: user.id, reason, details: details.trim(), status: 'pending', createdAt: new Date().toISOString() })
  write(LS.reports, reports)
}

export async function listReports(): Promise<ListingReport[]> {
  if (supabase) {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(toReport)
  }
  return localReports()
}

export async function moderateListing(user: AppUser, listingId: string, action: 'approve' | 'reject' | 'remove'): Promise<void> {
  if (user.role !== 'admin') throw new Error('Administrator access required.')
  const moderationStatus: ModerationStatus = action === 'approve' ? 'approved' : 'rejected'
  if (supabase) {
    const { error } = await supabase.rpc('moderate_listing', { p_listing_id: listingId, p_action: action })
    if (error) throw new Error(error.message)
    return
  }
  write(LS.listings, localListings().map(item => item.id === listingId ? { ...item, moderationStatus: action === 'remove' ? 'rejected' : moderationStatus, status: action === 'approve' ? 'available' : 'removed', updatedAt: new Date().toISOString() } : item))
}

export async function resolveReport(user: AppUser, reportId: string, status: 'reviewed' | 'resolved'): Promise<void> {
  if (user.role !== 'admin') throw new Error('Administrator access required.')
  if (supabase) {
    const { error } = await supabase.rpc('resolve_listing_report', { p_report_id: reportId, p_status: status })
    if (error) throw new Error(error.message)
    return
  }
  write(LS.reports, localReports().map(report => report.id === reportId ? { ...report, status } : report))
}

export async function getImpactStats() {
  if (supabase) {
    const { data, error } = await supabase.rpc('get_impact_stats')
    if (error) throw new Error(error.message)
    return { approvedListings: Number(data?.approvedListings || 0), availableItems: Number(data?.availableItems || 0), completedDonations: Number(data?.completedDonations || 0), completedResales: Number(data?.completedResales || 0), completedHandovers: Number(data?.completedHandovers || 0), declaredSavings: Number(data?.declaredSavings || 0) }
  }
  const listings = await listListings({ includeModeration: true })
  const interests = localInterests().map(r => ({ id: r.id, status: r.status, listingId: r.listingId }))
  // Seed listings are marked as examples for the local demo; never count them as real impact.
  const realListings = listings.filter(l => !l.isSample)
  const completed = interests.filter((r: any) => r.status === 'completed')
  const completedListingIds = new Set(completed.map((r: any) => r.listingId))
  const completedListings = realListings.filter(l => completedListingIds.has(l.id) && l.status === 'completed')
  const resaleListings = completedListings.filter(l => l.listingType === 'resale' && l.mrp !== null && l.mrp > l.price)
  return {
    approvedListings: realListings.filter(l => l.moderationStatus === 'approved' && l.status !== 'removed').length,
    availableItems: realListings.filter(l => l.moderationStatus === 'approved' && l.status === 'available').length,
    completedDonations: completedListings.filter(l => l.listingType === 'donation').length,
    completedResales: completedListings.filter(l => l.listingType === 'resale').length,
    completedHandovers: completed.length,
    declaredSavings: resaleListings.reduce((sum, l) => sum + ((l.mrp || 0) - l.price), 0),
  }
}

export async function getAdminListings(): Promise<Listing[]> {
  return listListings({ includeModeration: true, status: 'all' })
}
