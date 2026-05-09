export interface Division {
  id: string
  name: string
  slug: string
  description?: string
  created_at: string
}

export interface DivisionMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
}