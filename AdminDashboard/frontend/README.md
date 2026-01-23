# FasalVaidya Admin Dashboard

Next.js-based admin dashboard for the FasalVaidya AI-powered agriculture health monitoring system.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v4.1 (CSS-first configuration)
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth with email/password
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase project with schema deployed

### Installation

```bash
# Navigate to frontend directory
cd AdminDashboard/frontend

# Install dependencies
npm install

# Copy environment file and configure
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Database Setup

Run the SQL migrations in order:

1. `supabase_schema/01_remote_schema.sql` - Core tables
2. `supabase_schema/02_rpc_functions.sql` - Sync functions
3. `supabase_schema/04_admin_schema.sql` - Admin tables and analytics functions

### Create Admin User

1. Create a user in Supabase Auth Dashboard
2. Run this SQL to grant admin access:

```sql
INSERT INTO public.admin_users (auth_user_id, email, full_name, role)
VALUES ('your-auth-user-uuid', 'admin@example.com', 'Admin Name', 'super_admin');
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── feedback/  # Feedback submission & review
│   │   │   ├── scans/     # Scan management
│   │   │   └── stats/     # Dashboard statistics
│   │   ├── auth/          # Auth callbacks
│   │   ├── dashboard/     # Dashboard pages
│   │   │   ├── components/  # Dashboard-specific components
│   │   │   ├── reports/     # Reports page
│   │   │   ├── crops/       # Crops management
│   │   │   ├── ai-engine/   # AI model management
│   │   │   └── settings/    # Settings page
│   │   └── login/         # Login page
│   ├── components/
│   │   ├── layout/        # Sidebar, Header
│   │   └── ui/            # Reusable UI components
│   └── lib/
│       ├── supabase/      # Supabase client setup
│       ├── types.ts       # TypeScript types
│       └── utils.ts       # Utility functions
├── .env.local             # Environment variables
└── package.json
```

## Features

### Dashboard Overview
- User statistics (total, active)
- Scan metrics (total, today)
- AI accuracy from feedback
- Critical alerts
- Scan activity chart (7 days)
- Crop distribution pie chart
- Recent scans table

### Feedback Loop
- Mobile app submits thumbs up/down
- High-confidence incorrect predictions are flagged
- Admin can review flagged feedback
- Accuracy calculated from feedback ratio

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/feedback` | POST | Submit feedback from mobile |
| `/api/feedback` | GET | List feedback (admin) |
| `/api/feedback/[id]` | PATCH | Mark as reviewed |
| `/api/scans` | GET | Paginated scan list |
| `/api/scans/[id]` | GET | Single scan details |
| `/api/scans/[id]` | DELETE | Soft delete scan |
| `/api/stats` | GET | Dashboard statistics |

## Design System

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#4C763B` | Buttons, links, highlights |
| Secondary | `#043915` | Sidebar, dark accents |
| Success | `#BEE4D0` | Positive states |
| Warning | `#FA8112` | Alerts, attention |
| Danger | `#FF6363` | Errors, critical |

## Security

- **RLS**: Row Level Security on all user tables
- **Service Role**: Admin operations use service role key (server-side only)
- **Middleware**: Protected routes redirect to login
- **Soft Deletes**: Data preserved for audit trail

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm start

# Lint code
npm run lint
```

## Deployment

Designed for Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## MVP Limitations

- Analytics data is partially mocked
- Model management UI is display-only
- No real-time updates (polling required)
- Single admin role enforcement

## License

Private - FasalVaidya Team
