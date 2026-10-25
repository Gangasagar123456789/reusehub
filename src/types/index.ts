export type UserRole = 'user' | 'admin'
export type ListingType = 'donation' | 'resale'
export type ListingStatus = 'available' | 'reserved' | 'completed' | 'removed'
export type ModerationStatus = 'pending' | 'approved' | 'rejected'
export type ItemCondition = 'New' | 'Like New' | 'Good' | 'Fair'
export type InterestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved'

export interface AppUser {
  id: string
  email: string
  displayName: string
  institution?: string
  academicYear?: string
  role: UserRole
}

export interface Listing {
  id: string
  sellerId: string
  sellerName: string
  title: string
  description: string
  category: string
  condition: ItemCondition
  listingType: ListingType
  mrp: number | null
  price: number
  status: ListingStatus
  moderationStatus: ModerationStatus
  coverImage: string
  createdAt: string
  updatedAt: string
  isSample?: boolean
}

export interface InterestRequest {
  id: string
  listingId: string
  sellerId: string
  buyerId: string
  buyerName: string
  message: string
  status: InterestStatus
  createdAt: string
  updatedAt: string
}

export interface ListingReport {
  id: string
  listingId: string
  reporterId: string
  reason: string
  details: string
  status: ReportStatus
  createdAt: string
}

export interface SellerContact {
  userId: string
  phoneNumber: string
  whatsappNumber: string
  isPublic: boolean
  updatedAt: string
}

export interface SellerContactInput {
  phoneNumber: string
  whatsappNumber: string
  isPublic: boolean
}

export interface ListingInput {
  title: string
  description: string
  category: string
  condition: ItemCondition
  listingType: ListingType
  mrp: number | null
  price: number
  coverImageFile?: File | null
  existingCoverImage?: string
}
