'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Crown, Sparkles, Download, ArrowRight, X } from 'lucide-react'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    billing: 'forever',
    description: 'Perfect for trying out Prompt Buddy',
    features: [
      '6 default prompts included',
      '5 custom prompts',
      'Global keyboard shortcuts',
      'Beautiful floating UI',
      'Cross-platform support',
      'Local storage'
    ],
    limitations: [
      'No AI prompt generation',
      'No AI prompt enhancement', 
      'Limited custom prompts',
      'No cloud sync'
    ],
    cta: 'Download Free',
    ctaLink: '/register',
    popular: false
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 29,
    billing: 'lifetime',
    description: 'Everything you need to maximize productivity',
    features: [
      'Everything in Free',
      'Unlimited custom prompts',
      'AI prompt generation with Kimi 32B',
      'AI prompt enhancement',
      'Cloud sync across devices',
      'Priority support',
      'Advanced customization',
      'Export/import prompts',
      'Team sharing (coming soon)'
    ],
    limitations: [],
    cta: 'Get PRO License',
    ctaLink: '/checkout?plan=pro',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    billing: 'per year',
    description: 'For teams and organizations',
    features: [
      'Everything in PRO',
      'Team management dashboard',
      'Centralized license management',
      'SSO integration',
      'Advanced analytics',
      'Custom AI model integration',
      'Priority support & onboarding',
      'Custom branding options'
    ],
    limitations: [],
    cta: 'Contact Sales',
    ctaLink: '/contact?plan=enterprise',
    popular: false
  }
]

const faqs = [
  {
    question: 'How does the lifetime PRO license work?',
    answer: 'Pay once, use forever! Your PRO license never expires and includes all current and future PRO features. You can use it on up to 3 devices.'
  },
  {
    question: 'Can I upgrade from Free to PRO later?',
    answer: 'Absolutely! You can upgrade at any time. Your existing prompts and settings will be preserved, and you\'ll immediately unlock all PRO features.'
  },
  {
    question: 'What AI models do you use?',
    answer: 'We use Kimi 32B for prompt generation and enhancement. It\'s specifically optimized for understanding and creating developer-focused prompts with high accuracy.'
  },
  {
    question: 'Is there a refund policy?',
    answer: 'Yes! We offer a 30-day money-back guarantee. If you\'re not satisfied with PRO for any reason, we\'ll refund your purchase in full.'
  },
  {
    question: 'How many devices can I use my license on?',
    answer: 'PRO licenses can be used on up to 3 devices. Enterprise licenses have no device limits and include team management features.'
  },
  {
    question: 'Do you offer student discounts?',
    answer: 'Yes! Students get 50% off PRO licenses. Contact us with your student ID or .edu email for a discount code.'
  }
]

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mr-3"></div>
              <span className="text-xl font-bold text-gray-900">Prompt Buddy</span>
            </Link>
            
            <nav className="hidden md:flex space-x-8">
              <Link href="/#features" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="/pricing" className="text-purple-600 font-medium">Pricing</Link>
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
      <section className="pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Start free and upgrade when you&apos;re ready for AI-powered features
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div 
                key={plan.id} 
                className={`relative rounded-2xl p-8 ${
                  plan.popular 
                    ? 'bg-gradient-to-b from-purple-600 to-purple-700 text-white shadow-2xl scale-105' 
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-yellow-400 text-purple-900 px-4 py-2 rounded-full text-sm font-bold flex items-center">
                      <Crown size={16} className="mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                      ${plan.price}
                    </span>
                    <span className={`text-lg ${plan.popular ? 'text-purple-200' : 'text-gray-600'}`}>
                      /{plan.billing}
                    </span>
                  </div>
                  <p className={`${plan.popular ? 'text-purple-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <Check className={`w-5 h-5 mr-3 ${plan.popular ? 'text-yellow-400' : 'text-green-500'}`} />
                      <span className={`${plan.popular ? 'text-purple-100' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, i) => (
                    <li key={i} className="flex items-center opacity-50">
                      <X className={`w-5 h-5 mr-3 ${plan.popular ? 'text-purple-300' : 'text-gray-400'}`} />
                      <span className={`${plan.popular ? 'text-purple-200' : 'text-gray-500'}`}>
                        {limitation}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href={plan.ctaLink}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-center block transition-colors ${
                    plan.popular 
                      ? 'bg-white text-purple-600 hover:bg-gray-50' 
                      : plan.id === 'free'
                        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {plan.cta}
                  {plan.id === 'pro' && <ArrowRight className="w-4 h-4 inline ml-2" />}
                  {plan.id === 'free' && <Download className="w-4 h-4 inline ml-2" />}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Feature Comparison</h2>
            <p className="text-lg text-gray-600">See exactly what&apos;s included in each plan</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="grid lg:grid-cols-4 gap-0">
              {/* Feature column */}
              <div className="lg:col-span-1 bg-gray-50 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Features</h3>
                <div className="space-y-6">
                  {[
                    'Default prompts',
                    'Custom prompts',
                    'Global shortcuts',
                    'Cross-platform',
                    'AI generation',
                    'AI enhancement',
                    'Cloud sync',
                    'Priority support',
                    'Team features'
                  ].map((feature) => (
                    <div key={feature} className="text-gray-700 py-3 border-b border-gray-200 last:border-b-0">
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan columns */}
              {plans.map((plan) => (
                <div key={plan.id} className="p-6 border-l border-gray-200">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <div className="text-2xl font-bold text-purple-600">${plan.price}</div>
                  </div>
                  <div className="space-y-6">
                    {[
                      plan.id !== 'free', // Default prompts
                      plan.id === 'free' ? '5' : 'Unlimited', // Custom prompts  
                      true, // Global shortcuts
                      true, // Cross-platform
                      plan.id !== 'free', // AI generation
                      plan.id !== 'free', // AI enhancement
                      plan.id !== 'free', // Cloud sync
                      plan.id === 'pro' || plan.id === 'enterprise', // Priority support
                      plan.id === 'enterprise' // Team features
                    ].map((included, i) => (
                      <div key={i} className="flex justify-center py-3 border-b border-gray-200 last:border-b-0">
                        {typeof included === 'boolean' ? (
                          included ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300" />
                          )
                        ) : (
                          <span className="text-sm font-medium text-gray-700">{included}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600">Everything you need to know about Prompt Buddy</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <button
                  className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-gray-50"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <div className={`transform transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
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
            Start with our free plan and upgrade when you&apos;re ready
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-white text-purple-600 px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors inline-flex items-center gap-2 text-lg font-semibold">
              <Download size={20} />
              Start Free
            </Link>
            <Link href="/checkout?plan=pro" className="bg-purple-800 text-white px-8 py-4 rounded-xl hover:bg-purple-900 transition-colors inline-flex items-center gap-2 text-lg font-semibold">
              <Sparkles size={20} />
              Get PRO
            </Link>
          </div>
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
                <li><Link href="/#features" className="hover:text-white">Features</Link></li>
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