-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'unpaid', 'inactive')),
    stripe_customer_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create licenses table
CREATE TABLE public.licenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    license_key TEXT UNIQUE NOT NULL,
    license_type TEXT DEFAULT 'pro' CHECK (license_type IN ('pro', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
    expires_at TIMESTAMP WITH TIME ZONE,
    device_count INTEGER DEFAULT 0,
    max_devices INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create license activations table (track which devices are using a license)
CREATE TABLE public.license_activations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    platform TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(license_id, device_id)
);

-- Create subscriptions table (for Stripe integration)
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_price_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Users can only see their own licenses
CREATE POLICY "Users can view own licenses" ON public.licenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own licenses" ON public.licenses FOR UPDATE USING (auth.uid() = user_id);

-- Users can only see their own license activations
CREATE POLICY "Users can view own license activations" ON public.license_activations 
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.licenses WHERE id = license_id));

-- Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Functions
-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to generate license key
CREATE OR REPLACE FUNCTION generate_license_key()
RETURNS TEXT AS $$
DECLARE
    key_part1 TEXT;
    key_part2 TEXT;
    key_part3 TEXT;
    key_part4 TEXT;
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
    -- Generate 4 random segments
    key_part1 := '';
    key_part2 := '';
    key_part3 := '';
    key_part4 := '';
    
    -- Generate each segment
    FOR i IN 1..4 LOOP
        key_part1 := key_part1 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        key_part2 := key_part2 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        key_part3 := key_part3 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        key_part4 := key_part4 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    RETURN 'PB-' || key_part1 || '-' || key_part2 || '-' || key_part3 || '-' || key_part4;
END;
$$ LANGUAGE plpgsql;

-- Function to create license for user
CREATE OR REPLACE FUNCTION create_user_license(user_uuid UUID, license_type_param TEXT DEFAULT 'pro')
RETURNS TEXT AS $$
DECLARE
    new_license_key TEXT;
    license_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate unique license key
    LOOP
        new_license_key := generate_license_key();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.licenses WHERE license_key = new_license_key);
    END LOOP;
    
    -- Set expiration (1 year from now)
    license_expires_at := timezone('utc'::text, now()) + INTERVAL '1 year';
    
    -- Create license
    INSERT INTO public.licenses (user_id, license_key, license_type, expires_at)
    VALUES (user_uuid, new_license_key, license_type_param, license_expires_at);
    
    -- Update user subscription tier
    UPDATE public.users 
    SET subscription_tier = license_type_param, 
        subscription_status = 'active',
        updated_at = timezone('utc'::text, now())
    WHERE id = user_uuid;
    
    RETURN new_license_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;