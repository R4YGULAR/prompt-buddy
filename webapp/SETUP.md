# Prompt Buddy Web App

The complete SaaS web application for Prompt Buddy - authentication, licensing, payments, and user management.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Supabase

#### Create a new Supabase project:
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key

#### Set up the database:
1. In your Supabase dashboard, go to the SQL Editor
2. Run the SQL from `supabase-schema.sql` to create tables and functions
3. Enable Row Level Security (RLS) policies

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for admin operations)

### 4. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the website.

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Payments**: Stripe (coming soon)

### Database Schema

#### Core Tables
- `users` - User profiles and subscription info
- `licenses` - License keys and management
- `license_activations` - Device tracking
- `subscriptions` - Stripe subscription data

#### Key Functions
- `handle_new_user()` - Auto-creates user profile on signup
- `generate_license_key()` - Creates unique PB-XXXX-XXXX format keys
- `create_user_license()` - Issues license to user

### Pages Structure
```
src/app/
├── page.tsx           # Landing page
├── login/page.tsx     # Sign in
├── register/page.tsx  # Sign up
├── pricing/page.tsx   # Pricing plans
├── dashboard/         # User dashboard (coming)
└── auth/callback/     # OAuth callback
```

## 🔐 Authentication Flow

1. **Registration**: Users sign up with email/password or Google OAuth
2. **Email Verification**: Supabase sends confirmation email
3. **Profile Creation**: Automatic user profile creation via database trigger
4. **Dashboard Access**: Users can manage licenses and account

## 💳 License Management

### License Key Format
```
PB-XXXX-XXXX-XXXX-XXXX
```

### License Types
- **Free**: Default tier, limited features
- **PRO**: Full features, lifetime license
- **Enterprise**: Team features, annual billing

### Desktop App Integration
The desktop app validates licenses by:
1. Checking local storage for cached license
2. API call to validate license status
3. Feature flags based on license tier

## 🚀 Deployment

### Recommended: Vercel
1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Alternative: Any Next.js hosting
- Netlify
- Railway
- Self-hosted with Docker

## 📱 Features Implemented

### ✅ Complete
- [x] Landing page with pricing
- [x] User authentication (email + OAuth)
- [x] Database schema and functions
- [x] License key generation
- [x] Responsive design
- [x] Pricing page with FAQ

### 🚧 In Progress  
- [ ] User dashboard
- [ ] License management UI
- [ ] Stripe payment integration
- [ ] Download links management
- [ ] Admin panel

### 📋 Planned
- [ ] Team management
- [ ] Usage analytics
- [ ] Email marketing integration
- [ ] Customer support chat
- [ ] API for desktop app sync

## 🔧 Development

### Adding New Pages
```bash
# Create new page
mkdir src/app/new-page
touch src/app/new-page/page.tsx
```

### Database Changes
1. Update `supabase-schema.sql`
2. Run migration in Supabase dashboard
3. Update TypeScript types in `lib/supabase.ts`

### Environment Variables
- Add to `.env.example` for documentation
- Add to `.env.local` for local development
- Add to deployment platform for production

## 📄 License

This web application is part of the Prompt Buddy project and follows the same licensing terms.