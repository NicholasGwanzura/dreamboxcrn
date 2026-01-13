# Adding Users to Dreambox

## Manual Way: Using Supabase Console

### Step 1: Access Supabase Console
1. Go to https://app.supabase.com
2. Sign in with your account
3. Select your project "iiphiigaksyshionjhmt"

### Step 2: Navigate to Users
1. Click on **Authentication** in the left sidebar
2. Click on **Users** tab
3. Click the **"Add user"** button (top right)

### Step 3: Add New User
In the dialog that appears, fill in:
- **Email**: gwanzuranicholas@gmail.com
- **Password**: Admin123!
- **Auto confirm user**: Check this box (unless you want them to verify email first)

### Step 4: Add User Metadata
After creating the user, edit their metadata to include role and status:
1. Click on the user you just created
2. Click **"Edit user"**
3. In the **User metadata** section, add this JSON:
```json
{
  "firstName": "Nicholas",
  "lastName": "Gwanzura",
  "role": "Admin",
  "status": "Active"
}
```
4. Click **"Update user"**

### Step 5: Test Login
1. Open your Dreambox app at http://localhost:3000
2. Enter email: `gwanzuranicholas@gmail.com`
3. Enter password: `Admin123!`
4. Click "Sign In"

---

## User Metadata Reference

When adding users via Supabase, use this metadata template:

```json
{
  "firstName": "User's first name",
  "lastName": "User's last name",
  "role": "Admin|Manager|Staff",
  "status": "Active|Pending|Rejected"
}
```

### Role Levels:
- **Admin**: Full access to all features including user management
- **Manager**: Can manage clients, contracts, and reports
- **Staff**: Can view and manage billboards and basic tasks

### Status Levels:
- **Active**: User can log in immediately
- **Pending**: User account is awaiting approval
- **Rejected**: User cannot log in

---

## Pre-configured Users

For development, you can also use these credentials:

### Developer Backdoors (Always Available)
- Email: `dev@dreambox.com`
- Password: `dev123`
- Role: Admin

---

Additional User Example:
- Email: `nick@creamobmedia.co.zw`
- Password: `Nh@modzepasi9`
- Role: Admin

---

## Using the App's User Management

The Dreambox app has user management features accessible via the admin panel. Once enhanced, admins will be able to:
- Invite new users via email
- Assign roles and permissions
- Activate/deactivate user accounts
- Monitor user activity

For now, all user management must be done through the Supabase console.

---

## Common Issues

### User Can't Log In
- Verify email is correct (check for typos)
- Confirm password is correct
- Check that user status is "Active"
- Ensure Supabase URL and API key are configured in `.env.local`

### Email Confirmation Issues
- If "Auto confirm user" was not checked, the user must verify their email first
- Send them the verification link from Supabase

### Permissions Not Working
- Verify user metadata includes `role` and `status` fields
- Refresh the browser after metadata changes

---

## Next Steps

Once the User Management module is fully enhanced, you'll be able to invite users directly from the app's Settings page without accessing Supabase console.

