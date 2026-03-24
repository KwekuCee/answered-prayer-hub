-- CREATE TESTIMONIALS TABLE
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    author_name TEXT NOT NULL,
    church_name TEXT,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Allow public read access to approved testimonials
CREATE POLICY "Public can view approved testimonials" ON public.testimonials
    FOR SELECT
    USING (is_approved = true);

-- Allow super admins full access to testimonials
CREATE POLICY "Super admins can manage testimonials" ON public.testimonials
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
        )
    );

-- Insert some initial data
INSERT INTO public.testimonials (author_name, church_name, content, is_approved) VALUES 
('Sarah J.', 'Grace Chapel', 'My family was completely restored after praying together at the hub!', true),
('David M.', 'Faith Ministries', 'I found my dream job after 2 years of searching. God is so good!', true),
('Elena R.', 'Hope Community', 'We witnessed a miraculous healing for my mother! The doctors were shocked.', true),
('Michael T.', 'Victory Church', 'My massive debt was completely cancelled, 100% answered prayer.', true);
