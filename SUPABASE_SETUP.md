# Supabase Authentication Setup Guide

## Overview
This app now has full Supabase authentication integration. Users can sign up, log in, and reset passwords using Supabase's secure auth system.

## Prerequisites
- A Supabase account (free tier available at https://supabase.com)
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to [Supabase Console](https://app.supabase.com)
2. Click "New Project"
3. Enter a project name
4. Create a strong password (you'll need this)
5. Select a region closest to you
6. Click "Create new project"
7. Wait for the project to initialize (1-2 minutes)

## Step 2: Get Your Credentials

1. In the Supabase console, go to **Settings** > **API**
2. Copy your:
   - **Project URL** (under "Project Settings")
   - **Anon/Public API Key** (under "Project API keys")

## Step 3: Configure Environment Variables

1. Open `.env.local` in the root directory
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=your_actual_project_url_here
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

Example:
```env
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Configure Authentication (Optional but Recommended)

### Email/Password Authentication
This is enabled by default. Users can:
- Sign up with email and password
- Log in with email and password
- Reset password via email

To customize email templates:
1. In Supabase console, go to **Authentication** > **Email Templates**
2. Customize the email designs and content

### Additional Auth Methods (Optional)
In Supabase console, go to **Authentication** > **Providers** to enable:
- Google OAuth
- GitHub OAuth
- Microsoft OAuth
- Discord OAuth
- And many more...

## Step 5: Restart the Dev Server

```bash
npm run dev
```

The app will now use Supabase authentication instead of mock auth.

## Testing Authentication

### Test Scenario 1: New User Registration
1. Click "Create New Account"
2. Fill in first name, last name, and email
3. Create a password
4. Click "Register Account"
5. Check your email for a confirmation link (if email verification is enabled)

### Test Scenario 2: Login
1. Use the email and password you registered with
2. Click "Sign In"
3. You should be redirected to the dashboard

### Test Scenario 3: Password Reset
1. Click "Forgot password?"
2. Enter your email
3. Check your email for reset instructions
4. Follow the link to create a new password

## Fallback to Mock Authentication

If Supabase credentials are not configured, the app will automatically fall back to mock authentication. This allows local development without setting up Supabase.

To use mock auth:
- Leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as placeholder values
- Use the developer backdoors:
  - Email: `dev@dreambox.com` / Password: `dev123`
  - Email: `nick@creamobmedia.co.zw` / Password: `Nh@modzepasi9`

## Database Schema (User Profile)

When a user signs up, the following metadata is stored:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "role": "Staff",
  "status": "Active"
}
```

To extend the schema, modify the user metadata in `authService.ts` during signup.

## Enabling User Approval Workflow (Optional)

To implement admin approval before users can access the app:

1. In Supabase, create a `user_profiles` table with columns:
   - `id` (uuid, primary key)
   - `email` (text, unique)
   - `status` (enum: 'pending', 'approved', 'rejected')
   - `approved_by` (uuid, foreign key to auth.users)
   - `approved_at` (timestamp)

2. Create a function to check user status on login:
   - Query the `user_profiles` table
   - Only allow login if status is 'approved'

## Troubleshooting

### "Supabase credentials not configured"
- Check that `.env.local` has the correct URL and API key
- Make sure you're using `VITE_` prefix for Vite environment variables
- Restart the dev server after updating `.env.local`

### "Invalid Login Credentials"
- Double-check that the email and password are correct
- Make sure email verification is turned off (or verify your email)
- Check Supabase logs for specific error messages

### "Connection Failed"
- Verify that your Supabase project is active
- Check that the URL is correct (should start with `https://`)
- Check browser console for network errors
- Ensure CORS is properly configured in Supabase

### Session Not Persisting
- Check browser localStorage for `sb-auth-token`
- Verify cookies are enabled
- Check browser console for errors

## Production Deployment

Before deploying to production:

1. Enable email verification in Supabase
2. Set strong password requirements
3. Enable rate limiting on auth endpoints
4. Set up email domain verification
5. Configure allowed redirect URLs in Supabase settings
6. Use environment variables for production secrets

## Security Best Practices

1. **Never commit `.env.local`** - it contains secret keys
2. **Use Row Level Security (RLS)** in Supabase for data protection
3. **Enable MFA** for admin accounts
4. **Regularly rotate API keys** in production
5. **Monitor auth logs** for suspicious activity
6. **Use HTTPS** in production (automatic if hosted)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/auth-signup)

## Support

For issues with Supabase:
- Visit [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)
- Check [Supabase Discord](https://discord.supabase.com)
- Review [Supabase Status Page](https://status.supabase.com)
