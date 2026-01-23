# Creating Admin User for FasalVaidya Dashboard

## Method 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Open: https://jtefnnlcikvyswmuowxd.supabase.co

2. **Navigate to Authentication**
   - Click "Authentication" in the left sidebar
   - Click "Users" tab

3. **Create New User**
   - Click "Add User" button
   - Select "Create new user"
   - Enter your email: `admin@fasalvaidya.com` (or your email)
   - Enter a password you'll remember: e.g., `Admin@123456`
   - Click "Create User"

4. **Test Login**
   - Go to: http://localhost:3001 (or http://localhost:3000)
   - Click "Login"
   - Enter your email and password
   - You should be redirected to the dashboard!

---

## Method 2: Reset Password via Email

If a user already exists but you don't know the password:

1. **In Supabase Dashboard**
   - Go to Authentication → Users
   - Find your user
   - Click the "..." menu
   - Select "Send Password Reset Email"
   - Check your email inbox

---

## Method 3: Use the Registration Page

The dashboard has a registration page, but it requires a secret key:

1. **Go to**: http://localhost:3000/register
2. **You'll need to set a secret key** in your environment

**Add this to `.env.local`:**
```env
ADMIN_SECRET_KEY=your-secret-key-here
```

Then register with:
- Email: your@email.com
- Password: (choose one)
- Full Name: Your Name
- Secret Key: your-secret-key-here

---

## Quick Test Credentials

For quick testing, create a user in Supabase with:
- **Email**: `admin@fasalvaidya.com`
- **Password**: `Admin@123456`

Then login at: http://localhost:3000/login

---

## Need Help?

If none of these work, let me know and I can:
1. Create a script to set up admin users automatically
2. Bypass authentication for development
3. Help you debug specific authentication issues
