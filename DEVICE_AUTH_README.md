# Device-Bound Authentication Implementation

## Overview

FasalVaidya uses a **device-bound persistent identity system** for development/hackathon mode. This bypasses Supabase Auth rate limits (2 emails/hour on free tier) while maintaining stable user identity.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE APP                               │
├─────────────────────────────────────────────────────────────────┤
│  AsyncStorage                                                   │
│  ┌──────────────────┐  ┌──────────────────────────┐            │
│  │ @fasalvaidya_    │  │ @fasalvaidya:user_profile│            │
│  │ device_id        │  │ {name, phone, photo}     │            │
│  │ (UUID v4)        │  │                          │            │
│  └────────┬─────────┘  └──────────────────────────┘            │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ AuthContext                                               │  │
│  │ • userId = device_id (stable identity)                    │  │
│  │ • profile = {name, phone, profilePhoto, createdAt}        │  │
│  │ • isAuthenticated = true (always, after init)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ DeviceUserService                                         │  │
│  │ • Syncs profile to Supabase by device_id                  │  │
│  │ • Uses anonymous auth for RLS bypass                      │  │
│  │ • Anti-hijack: rejects phone if exists with diff user     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE                                  │
├─────────────────────────────────────────────────────────────────┤
│  users table:                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ id (uuid, server-generated)                               │  │
│  │ device_id (uuid, client-generated, UNIQUE)                │  │
│  │ phone (text, UNIQUE where not null)                       │  │
│  │ name (text)                                               │  │
│  │ profile_photo (text)                                      │  │
│  │ auth_user_id (uuid, nullable - for future real auth)      │  │
│  │ created_at, updated_at, last_active                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  RPC Functions:                                                 │
│  • upsert_device_user(device_id, phone, name, photo)           │
│  • get_user_by_device_id(device_id)                            │
│  • check_phone_hijack(device_id, phone)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. Device ID = User Identity
- UUID generated once on first app launch
- Stored in AsyncStorage (`@fasalvaidya_device_id`)
- Survives: app restarts, reloads, tab closes
- Resets ONLY when: user clears app cache/data manually

### 2. Phone Number = Optional Attribute (NOT Identity)
- Users can optionally add their phone number
- Phone must be unique across all users (anti-hijack protection)
- If phone exists with different device_id → rejected

### 3. No OTP Required
- Zero authentication friction
- Instant identity on first launch
- Profile info (name, phone) is optional

## File Structure

```
frontend/src/
├── contexts/
│   └── AuthContext.tsx          # Device-bound auth state management
├── services/
│   ├── deviceUserService.ts     # Supabase sync for device users
│   └── index.ts                 # Service exports
├── utils/
│   └── deviceId.ts              # UUID generation & persistence
└── screens/
    └── SettingsScreen.tsx       # Profile editing with auth integration

supabase_schema/
└── 04_device_auth_migration.sql # Database migration for device auth
```

## Usage

### In Components

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { 
    userId,           // Device UUID
    profile,          // {id, name, phone, profilePhoto, ...}
    isAuthenticated,  // Always true after init
    updateProfile,    // Update local + sync to server
    syncToServer,     // Force sync to Supabase
    getServerUserId,  // Get users.id from Supabase
  } = useAuth();

  // Use userId for all API calls
  const response = await api.getScans({ user_id: userId });
}
```

### Update Profile

```tsx
await updateProfile({
  name: 'Farmer Name',
  phone: '+91 9876543210',
});
// Automatically syncs to Supabase in background
```

## Supabase Migration

Run the migration in Supabase SQL Editor:

```sql
-- In supabase_schema/04_device_auth_migration.sql
```

This adds:
- `device_id` column to users table
- `phone` column with unique constraint
- `name` and `profile_photo` columns
- RPC functions for device-bound auth
- Updated RLS policies

## Migration Path to Production Auth

When ready to add real OTP authentication:

1. **Map device_id to auth.users**
   ```sql
   UPDATE users 
   SET auth_user_id = auth.uid() 
   WHERE device_id = 'current-device-id';
   ```

2. **Update RLS policies** to use `auth.uid()` instead of device_id

3. **Enable OTP in app** - link existing device user to new auth user

4. **Zero data loss** - all scans, diagnoses, chat history preserved

## Development Notes

### Testing Identity Reset

In Settings → Clear Cache will:
- Clear all AsyncStorage
- Generate new device_id on next launch
- Create new user identity

### Debugging

Device ID is displayed in Settings screen under profile info:
```
🆔 Device ID: abc12345...xyz9
```

Full device ID visible in console logs:
```
🔐 [DeviceAuth] Initializing device-bound identity...
🆔 [DeviceAuth] Device ID: abc12345-1234-1234-1234-xyz123456789
👤 [DeviceAuth] Created new user profile
✅ [DeviceAuth] Authentication complete
```
