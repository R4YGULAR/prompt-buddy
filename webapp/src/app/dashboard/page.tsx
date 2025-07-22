'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getUserWithLicense, type UserWithLicense } from '@/lib/supabase'
import { Download, Key, Settings, LogOut, Crown, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserWithLicense | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)
      
      // Get user profile with license info
      const profile = await getUserWithLicense(user.id)
      setUserProfile(profile)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null
  }

  const isPro = userProfile.subscription_tier === 'PRO'
  const isEnterprise = userProfile.subscription_tier === 'ENTERPRISE'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800">
      {/* Header */}
      <div className="bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Prompt Buddy</h1>
            </div>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {userProfile.full_name || user.email?.split('@')[0]}!
          </h2>
          <p className="text-gray-300">
            Manage your Prompt Buddy account and license information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* License Status Card */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                {isPro || isEnterprise ? (
                  <Crown className="w-6 h-6 text-yellow-400" />
                ) : (
                  <Key className="w-6 h-6 text-gray-400" />
                )}
                <h3 className="text-xl font-semibold text-white">License Status</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Current Plan:</span>
                  <div className="flex items-center space-x-2">
                    {isPro && (
                      <>
                        <Crown className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 font-semibold">PRO</span>
                      </>
                    )}
                    {isEnterprise && (
                      <>
                        <Crown className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 font-semibold">ENTERPRISE</span>
                      </>
                    )}
                    {!isPro && !isEnterprise && (
                      <span className="text-gray-400">Free</span>
                    )}
                  </div>
                </div>

                {userProfile.license_key && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">License Key:</span>
                    <span className="text-white font-mono bg-black/30 px-3 py-1 rounded">
                      {userProfile.license_key}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Features:</span>
                  <div className="text-right">
                    {isPro || isEnterprise ? (
                      <div className="text-green-400">
                        <div>✓ Unlimited Prompts</div>
                        <div>✓ AI Enhancement</div>
                        <div>✓ AI Generation</div>
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        <div>• Up to 5 custom prompts</div>
                        <div>• Basic features only</div>
                      </div>
                    )}
                  </div>
                </div>

                {!isPro && !isEnterprise && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg">
                    <h4 className="text-white font-semibold mb-2">Upgrade to PRO</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      Unlock unlimited prompts and AI-powered features.
                    </p>
                    <button
                      onClick={() => router.push('/pricing')}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                    >
                      View Pricing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Download App */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Download className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Download App</h3>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Get the latest version of Prompt Buddy for your platform.
              </p>
              <div className="space-y-2">
                <button className="w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 py-2 px-4 rounded-lg hover:bg-blue-600/30 transition-colors">
                  macOS (Intel)
                </button>
                <button className="w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 py-2 px-4 rounded-lg hover:bg-blue-600/30 transition-colors">
                  macOS (Apple Silicon)
                </button>
                <button 
                  disabled 
                  className="w-full bg-gray-600/20 text-gray-500 border border-gray-500/30 py-2 px-4 rounded-lg cursor-not-allowed"
                >
                  Windows (Coming Soon)
                </button>
              </div>
            </div>

            {/* Account Settings */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Settings className="w-6 h-6 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Account</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Email:</span>
                  <div className="text-white">{user.email}</div>
                </div>
                <div>
                  <span className="text-gray-400">Member since:</span>
                  <div className="text-white">
                    {new Date(userProfile.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Stats (if pro/enterprise) */}
        {(isPro || isEnterprise) && (
          <div className="mt-8">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Usage Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">∞</div>
                  <div className="text-gray-300 text-sm">Custom Prompts</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">✓</div>
                  <div className="text-gray-300 text-sm">AI Features</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">24/7</div>
                  <div className="text-gray-300 text-sm">Support</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}