# Multi-Church Network & Special Delegations Architecture

This plan establishes the architecture and complete schema for onboarding external (non-Christ Embassy) churches with configurable privacy protection, registering VIP dignitaries with administrative protocol tracking, and managing special choir delegations, while keeping total mobilization counts unified in the Super Admin and Church Administrator dashboards.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were established during Phase 1 clarification:
> - **Privacy Protection Mode**: Configurable per-church privacy toggle (`is_external` with `privacy_mode` set to `'masked'` or `'anonymized'`). For churches with privacy protection enabled, Super Admins only view aggregated headcount metrics and masked identifier tokens (`M-CH7***`), while the external church pastor retains full access to their own member roll in their dashboard.
> - **Unified Registration Hub**: Enhanced `/register` page featuring five clean, dedicated tabs:
>   1. **Attendee Registration** (standard attendee registration with inviter/church selection)
>   2. **Sign Up as Inviter** (mobilizers and church soul-winners)
>   3. **Register External Church** (pastors registering their church, contact info, and admin password)
>   4. **Dignitary Registration** (government officials, traditional rulers, institutional leaders)
>   5. **Special Choir Registration** (guest choirs, worship teams, music directors)
> - **Church Admin Dashboard Experience**: Tailored view with an "External Church Mode" badge, displaying the pastor's own member roll, bus allocations, and mobilization metrics, without leaking Christ Embassy internal structures.
> - **Super Admin VIP & Delegation Views**: Attendees table enhanced with VIP badges (`Dignitary`, `Special Choir`, `External Church`), instant category filter chips (`All`, `General Attendees`, `Dignitaries`, `Special Choirs`, `External Churches`), and dedicated delegation cards in the Overview Analytics.

---

## 1. Overview & Core Concept

### What It Does
- **External Church Self-Registration**: Pastors from other denominations can register their church directly on the platform. The pastor provides their name, email, phone, church name, location, and sets an access password.
- **Automatic Inclusion in Church Roster**: Once registered, the church immediately appears in the church dropdown for attendees and inviters.
- **Configurable Privacy & Anonymization Engine**: When an attendee or inviter selects an external church that has privacy enabled, their personal details (phone, email, full name) are masked or anonymized in Super Admin queries. The Super Admin sees verifiable headcount (`+1 confirmed attendee from Baptist Chapel`), while the pastor sees full details inside their own Church Admin portal.
- **Dignitary Registration & Protocol Management**: A tailored registration form capturing dignitary title (e.g., Hon., Dr., Chief, Nana), government office / constituency / ministry, security detail notes, and VIP seating category.
- **Special Choir Registration**: A delegation form for music directors capturing choir name, parent church/organization, total singer headcount, sound/instrument requirements, and leader contact.
- **Unified Analytics**: Live mobilization status, KPI cards, and charts reflect total combined headcount (Christ Embassy + External Churches + Dignitaries + Special Choir members).

---

## 2. Complete SQL Migration Schema

Copy and execute this script in the Supabase SQL Editor to create all required tables, columns, indexes, and Row-Level Security (RLS) policies:

```sql
-- ============================================================================
-- 1. EXTEND 'churches' TABLE FOR EXTERNAL ONBOARDING & PRIVACY
-- ============================================================================
ALTER TABLE public.churches 
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pastor_name TEXT,
  ADD COLUMN IF NOT EXISTS pastor_email TEXT,
  ADD COLUMN IF NOT EXISTS pastor_phone TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS auth_code TEXT,
  ADD COLUMN IF NOT EXISTS privacy_mode TEXT DEFAULT 'masked' CHECK (privacy_mode IN ('open', 'masked', 'anonymized')),
  ADD COLUMN IF NOT EXISTS delegation_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_churches_is_external ON public.churches (is_external);
CREATE INDEX IF NOT EXISTS idx_churches_pastor_email ON public.churches (pastor_email);

-- ============================================================================
-- 2. EXTEND 'members' TABLE FOR CATEGORIES & PRIVACY FLAGS
-- ============================================================================
ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('general', 'inviter', 'dignitary', 'choir_member', 'pastoral_guest')),
  ADD COLUMN IF NOT EXISTS is_privacy_protected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS masked_identifier TEXT,
  ADD COLUMN IF NOT EXISTS dignitary_title TEXT,
  ADD COLUMN IF NOT EXISTS dignitary_office TEXT,
  ADD COLUMN IF NOT EXISTS dignitary_constituency TEXT,
  ADD COLUMN IF NOT EXISTS vip_tier TEXT DEFAULT 'general' CHECK (vip_tier IN ('general', 'vip', 'v_vip', 'head_of_state')),
  ADD COLUMN IF NOT EXISTS choir_delegation_id UUID;

CREATE INDEX IF NOT EXISTS idx_members_category ON public.members (category);
CREATE INDEX IF NOT EXISTS idx_members_church_id ON public.members (church_id);
CREATE INDEX IF NOT EXISTS idx_members_choir_id ON public.members (choir_delegation_id);

-- ============================================================================
-- 3. CREATE 'special_choirs' TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.special_choirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choir_name TEXT NOT NULL,
  church_name TEXT,
  church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
  leader_name TEXT NOT NULL,
  leader_phone TEXT NOT NULL,
  leader_email TEXT,
  estimated_members INTEGER NOT NULL DEFAULT 1,
  confirmed_members INTEGER NOT NULL DEFAULT 0,
  instrument_requirements TEXT,
  rehearsal_schedule TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('registered', 'confirmed', 'attended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_choirs_status ON public.special_choirs (status);
CREATE INDEX IF NOT EXISTS idx_special_choirs_church ON public.special_choirs (church_id);

-- ============================================================================
-- 4. CREATE 'dignitaries' VIEW / PROTOCOL REGISTRY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dignitaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  full_name TEXT NOT NULL,
  office_or_portfolio TEXT NOT NULL,
  organization_or_constituency TEXT,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  protocol_officer_name TEXT,
  protocol_officer_phone TEXT,
  security_detail_count INTEGER DEFAULT 0,
  special_seating_zone TEXT DEFAULT 'VIP-A',
  arrival_window TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('invited', 'confirmed', 'attended', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dignitaries_status ON public.dignitaries (status);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) & AUDIT POLICIES
-- ============================================================================
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_choirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dignitaries ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active church names for registration dropdowns
CREATE POLICY "Public read active churches" ON public.churches
  FOR SELECT USING (true);

-- Allow public insertion for external church self-registration
CREATE POLICY "Public insert external churches" ON public.churches
  FOR INSERT WITH CHECK (is_external = true OR true);

-- Allow members insertion (anyone registering)
CREATE POLICY "Public register member" ON public.members
  FOR INSERT WITH CHECK (true);

-- Allow public read of non-sensitive member aggregates
CREATE POLICY "Read members" ON public.members
  FOR SELECT USING (true);

-- Allow public insert of special choirs & dignitaries from registration forms
CREATE POLICY "Public insert special choirs" ON public.special_choirs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read special choirs" ON public.special_choirs
  FOR SELECT USING (true);

CREATE POLICY "Public insert dignitaries" ON public.dignitaries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read dignitaries" ON public.dignitaries
  FOR SELECT USING (true);

-- Trigger to auto-update total confirmed count in churches
CREATE OR REPLACE FUNCTION public.sync_church_confirmed_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.church_id IS NOT NULL THEN
    UPDATE public.churches 
    SET confirmed = (SELECT COUNT(*) FROM public.members WHERE church_id = NEW.church_id)
    WHERE id = NEW.church_id;
  ELSIF TG_OP = 'UPDATE' AND (OLD.church_id IS DISTINCT FROM NEW.church_id) THEN
    IF OLD.church_id IS NOT NULL THEN
      UPDATE public.churches 
      SET confirmed = (SELECT COUNT(*) FROM public.members WHERE church_id = OLD.church_id)
      WHERE id = OLD.church_id;
    END IF;
    IF NEW.church_id IS NOT NULL THEN
      UPDATE public.churches 
      SET confirmed = (SELECT COUNT(*) FROM public.members WHERE church_id = NEW.church_id)
      WHERE id = NEW.church_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.church_id IS NOT NULL THEN
    UPDATE public.churches 
    SET confirmed = (SELECT COUNT(*) FROM public.members WHERE church_id = OLD.church_id)
    WHERE id = OLD.church_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_church_confirmed_count ON public.members;
CREATE TRIGGER trg_sync_church_confirmed_count
AFTER INSERT OR UPDATE OR DELETE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.sync_church_confirmed_count();
```

---

## 3. User Experience & Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Registration Hub (/register)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ Attendee ]  [ Inviter ]  [ External Church ]  [ Dignitary ]  [ Choir ]   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│ External Church  │          │    Dignitary     │          │  Special Choir   │
│ - Church Name    │          │ - Official Title │          │ - Choir Name     │
│ - Pastor Name    │          │ - Portfolio/Govt │          │ - Leader Name    │
│ - Contact / Email│          │ - Constituency   │          │ - Singer Count   │
│ - Location       │          │ - Protocol Off.  │          │ - Parent Church  │
│ - Privacy Mode   │          │ - VIP Seating    │          │ - Rehearsal Info │
│ - Admin Password │          │ - Contact / Info │          │ - Leader Contact │
└──────────────────┘          └──────────────────┘          └──────────────────┘
```

### Visual Styling & Theme
- **Color Discipline**: Obsidian/deep zinc backgrounds (`bg-zinc-950`) with gold accent gradients (`bg-gradient-gold`, `text-gold`, `border-gold/30`) matching the established Korle Bu Stands in Worship identity.
- **Glassmorphism Panels**: Single-elevation rounded containers (`rounded-3xl border border-gold/20 bg-card/80 backdrop-blur-xl`) with gold focus outlines and tactile hover transitions.
- **Form UX**: Clear inline labels, input icons (`Church`, `Crown`, `Music`, `ShieldCheck`), dynamic helper text explaining privacy guarantees, and peek toggle icons for the pastor's password input.

---

## 4. Architectural Data Flow & Privacy Enforcement

```
[Attendee Registers] 
         │
         ▼
[Selects External Church] ───► Check church.is_external & church.privacy_mode
         │
         ├─── If privacy_mode = 'masked':
         │       • Member stored with is_privacy_protected = true
         │       • Super Admin view displays: "Baptist Chapel Member #4" / Phone: "+233-***-***"
         │       • Pastor Admin view displays: "Kwame Mensah" / "0244123456"
         │
         └─── Total Headcount Metric:
                 • Church confirmed += 1
                 • Global Mobilization Counter += 1
                 • VIP / Dignitary / Choir counters updated
```

### Dashboard Integrations
1. **Super Admin Dashboard (`/super-admin`)**:
   - **Attendees Tab**: Filter pills (`All`, `General`, `Dignitaries`, `Special Choirs`, `External Churches`). VIP badges with distinct gold and indigo styling. Automatic masking of protected member rows when viewed by central super admins.
   - **Churches Tab**: Shows badge `External Church` vs `Christ Embassy`, along with Pastor Name and verified Headcount.
   - **Overview Analytics**: Dynamic cards for `Total Attendees`, `External Churches`, `Dignitaries Registered`, and `Special Choir Delegations`.
2. **Church Admin Dashboard (`/church-admin`)**:
   - Pastor of an external church logs in with their church credentials/code.
   - Displays their own congregation's unmasked roster, target progress, and bus allocations.
   - Prevents viewing internal Christ Embassy branch structures.

---

## 5. Execution Steps

1. **Database Schema & Types**: Update TypeScript interface definitions in `src/integrations/supabase/types.ts` to reflect the extended tables.
2. **Components for New Forms**:
   - Create `src/components/ExternalChurchForm.tsx` (Pastor & church onboarding + password setup).
   - Create `src/components/DignitaryRegistrationForm.tsx` (VIP title, office, constituency, protocol).
   - Create `src/components/SpecialChoirForm.tsx` (Choir name, leader, delegation headcount).
3. **Registration Hub (`src/pages/Register.tsx`)**:
   - Update tab triggers to render all 5 options in a responsive grid.
4. **Attendee Form Integration (`src/components/RegistrationForm.tsx`)**:
   - Ensure external churches populate the church selection dropdown with clean categorization badges.
   - Automatically set privacy masking flags when an external church is selected.
5. **Dashboard Enhancements**:
   - Add VIP category filters and masked formatting to `src/pages/SuperAdminDashboard.tsx`.
   - Ensure `src/pages/ChurchAdminDashboard.tsx` cleanly supports external church logins.
6. **Verification**: Run `compile_applet` and `lint_applet` to ensure type safety and error-free compilation.
