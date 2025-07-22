import { Download, Sparkles, Crown, Check, ArrowRight, Monitor, Zap, Shield } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mr-3"></div>
              <span className="text-xl font-bold text-gray-900">Prompt Buddy</span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/docs" className="text-gray-600 hover:text-gray-900">Docs</Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                Sign In
              </Link>
              <Link href="/register" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered Prompts
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Always at Your Fingertips
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The beautiful, floating prompt manager for developers. Quick access to your most-used AI prompts with intelligent generation and enhancement powered by Kimi 32B.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/register" className="bg-purple-600 text-white px-8 py-4 rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 text-lg">
              <Download size={20} />
              Download Free
            </Link>
            <Link href="#demo" className="border border-gray-300 text-gray-700 px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors text-lg">
              Watch Demo
            </Link>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="text-gray-400 text-sm ml-4">Prompt Buddy</span>
                </div>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {[
                    { title: "Debug Root Cause", color: "from-purple-500 to-pink-500", shortcut: "⌘⌥1" },
                    { title: "Explain Code", color: "from-blue-500 to-cyan-500", shortcut: "⌘⌥2" },
                    { title: "Refactor", color: "from-green-500 to-emerald-500", shortcut: "⌘⌥3" },
                    { title: "AI Generate", color: "from-yellow-500 to-orange-500", shortcut: "PRO", isPro: true }
                  ].map((prompt, i) => (
                    <div key={i} className="relative flex items-center bg-white/10 rounded-lg p-3 min-w-max backdrop-blur border border-white/20">
                      <div className="text-xs font-bold text-white mr-2">{i + 1}</div>
                      <div>
                        <div className="text-white text-sm font-medium">{prompt.title}</div>
                        <div className="text-gray-300 text-xs">
                          {prompt.isPro ? <Crown size={12} className="inline text-yellow-400" /> : prompt.shortcut}
                        </div>
                      </div>
                      <div className={`absolute inset-0 opacity-20 rounded-lg bg-gradient-to-r ${prompt.color}`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need</h2>
            <p className="text-lg text-gray-600">Powerful features to supercharge your development workflow</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Monitor className="w-8 h-8 text-purple-600" />,
                title: "Always On Top",
                description: "Beautiful floating window that stays accessible while you code"
              },
              {
                icon: <Zap className="w-8 h-8 text-purple-600" />,
                title: "Lightning Fast",
                description: "Instant access with global shortcuts. Built with Tauri for native performance"
              },
              {
                icon: <Sparkles className="w-8 h-8 text-purple-600" />,
                title: "AI-Powered",
                description: "Generate and enhance prompts with Kimi 32B AI integration"
              },
              {
                icon: <Shield className="w-8 h-8 text-purple-600" />,
                title: "Cross-Platform",
                description: "Works seamlessly on macOS, Windows, and Linux"
              },
              {
                icon: <Crown className="w-8 h-8 text-purple-600" />,
                title: "Unlimited Prompts",
                description: "No limits on creativity with PRO subscription"
              },
              {
                icon: <Check className="w-8 h-8 text-purple-600" />,
                title: "Smart Sync",
                description: "Your prompts and settings sync across all your devices"
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-600">Choose the perfect plan for your needs</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Free</h3>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-600">/forever</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {[
                  "6 default prompts included",
                  "5 custom prompts",
                  "Global keyboard shortcuts", 
                  "Beautiful floating UI",
                  "Cross-platform support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/register" className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors text-center block">
                Get Started Free
              </Link>
            </div>
            
            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-purple-600 to-purple-700 rounded-2xl p-8 text-white relative">
              <div className="absolute top-4 right-4 bg-yellow-400 text-purple-900 px-3 py-1 rounded-full text-sm font-bold">
                Popular
              </div>
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold">PRO</h3>
                <div className="mt-2">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-purple-200">/lifetime</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {[
                  "Everything in Free",
                  "Unlimited custom prompts",
                  "AI prompt generation",
                  "AI prompt enhancement",
                  "Priority support",
                  "Advanced customization"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <Check className="w-5 h-5 text-yellow-400 mr-3" />
                    <span className="text-purple-100">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/pricing" className="w-full bg-white text-purple-600 py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors text-center block font-semibold">
                Upgrade to PRO
                <ArrowRight className="w-4 h-4 inline ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to supercharge your workflow?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join thousands of developers who use Prompt Buddy daily
          </p>
          <Link href="/register" className="bg-white text-purple-600 px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors inline-flex items-center gap-2 text-lg font-semibold">
            <Download size={20} />
            Download Now - It&apos;s Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mr-3"></div>
                <span className="text-xl font-bold">Prompt Buddy</span>
              </div>
              <p className="text-gray-400">
                The beautiful prompt manager for developers.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Prompt Buddy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}