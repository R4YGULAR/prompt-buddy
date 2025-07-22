import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  subscription_status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'inactive'
  stripe_customer_id?: string
  created_at: string
  updated_at: string
}

export interface License {
  id: string
  user_id: string
  license_key: string
  license_type: 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'expired' | 'revoked'
  expires_at?: string
  device_count: number
  max_devices: number
  created_at: string
  updated_at: string
}

export interface LicenseActivation {
  id: string
  license_id: string
  device_id: string
  device_name?: string
  platform?: string
  last_used_at: string
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_price_id: string
  status: string
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
}

// Auth helpers
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return data
}

export const getUserLicenses = async (userId: string): Promise<License[]> => {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching licenses:', error)
    return []
  }
  
  return data || []
}

export const createUserLicense = async (userId: string, licenseType: 'pro' | 'enterprise' = 'pro'): Promise<string | null> => {
  const { data, error } = await supabase.rpc('create_user_license', {
    user_uuid: userId,
    license_type_param: licenseType
  })
  
  if (error) {
    console.error('Error creating license:', error)
    return null
  }
  
  return data
}

export const validateLicenseKey = async (licenseKey: string): Promise<License | null> => {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', licenseKey)
    .eq('status', 'active')
    .single()
  
  if (error) {
    console.error('Error validating license:', error)
    return null
  }
  
  // Check if license is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null
  }
  
  return data
}