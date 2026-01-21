<div align="center">

# 🎯 Dreambox Deluxe

**Premium Billboard Rental Management System**

Version 2.3.0 | Production Release

</div>

---

## 📋 Overview

Dreambox Deluxe is a comprehensive billboard rental management platform featuring inventory tracking, financial operations, client management, and real-time analytics. Built for production with Supabase backend integration.

## ✨ Features

- **Billboard Inventory** - Manage static and LED billboards with location tracking
- **Client Management** - Full CRM with notes, billing preferences, and portal links
- **Contract Management** - Track rentals, slots, and sides with automatic status updates
- **Financial Operations** - Invoicing, quotations, receipts, and expense tracking
- **Maintenance Logs** - Schedule and track billboard maintenance
- **Task Management** - Assign and track work across your team
- **Audit Trail** - Complete activity logging synced to Supabase
- **User Management** - Role-based access (Admin, Manager, Staff)
- **Real-time Sync** - Supabase integration with automatic cloud backup
- **Weekly Backups** - Automated Friday backup reminders with downloadable exports
- **Toast Notifications** - Visual feedback on all save operations
- **Google Drive Integration** - Connect and backup to Google Drive cloud storage
- **Excel Export** - Download backups as formatted Excel workbooks

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (required for production)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local`:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

## 📦 Release Notes

### v2.3.0 - Google Drive & Excel Export (January 21, 2026)
**☁️ Cloud Backup & Excel Export Integration**

#### Google Drive Integration
- ✅ OAuth 2.0 authentication flow with Google
- ✅ Connect/disconnect Google Drive from Settings
- ✅ Manual backup to Google Drive
- ✅ Auto-backup toggle for weekly cloud backups
- ✅ Creates dedicated "DreamboxDeluxe_Backups" folder
- ✅ User info display when connected

#### Excel Export
- ✅ Full system backup as Excel workbook (.xlsx)
- ✅ Multiple sheets: Billboards, Clients, Contracts, Invoices, Expenses, Tasks, Maintenance, Users, Audit Logs
- ✅ Summary sheet with counts and backup timestamp
- ✅ Available from Settings and Friday reminder modal

#### Enhanced Friday Reminder
- ✅ Three backup options: Google Drive, JSON, Excel
- ✅ Shows Google Drive status in reminder
- ✅ Loading states for all backup operations

---

### v2.2.1 - Password Reset Flow (January 21, 2026)
**🔐 Complete Password Recovery**

- ✅ New `/reset-password` page to handle email reset links
- ✅ Automatic detection of Supabase recovery tokens
- ✅ New password form with confirmation
- ✅ Session validation and error handling
- ✅ Auto-redirect to login after successful reset

---

### v2.2.0 - Backup & Notifications (January 21, 2026)
**💾 Data Protection & User Feedback**

#### Weekly Backup System
- ✅ Automated Friday backup reminders
- ✅ One-click backup download to JSON
- ✅ Backup status tracking (last backup, days ago)
- ✅ Modal reminder with backup status display

#### Toast Notifications
- ✅ Visual success notifications on all save operations
- ✅ Error notifications for failed operations
- ✅ Warning and info notification types
- ✅ Auto-dismiss with manual close option

#### Technical
- ✅ New notification service (`notificationService.ts`)
- ✅ Toast container component with animations
- ✅ Friday reminder modal with backup download

---

### v2.1.0 - UI Revamp (January 21, 2026)
**🎨 Dashboard & Navigation Overhaul**

#### Dashboard
- ✅ Completely redesigned dashboard with cleaner layout
- ✅ Compact KPI cards with better data density
- ✅ Streamlined charts and visualizations
- ✅ New "Quick Stats" dark card for key metrics
- ✅ Personalized welcome message with user's name

#### Navigation
- ✅ Reorganized sidebar with grouped navigation
- ✅ Leaner admin panel structure (Overview → Operations → Finance → Management)
- ✅ Removed redundant "Receipts" page (merged into Invoices)
- ✅ Cleaner user profile section

#### Typography
- ✅ Updated to Mona Sans font (GitHub's custom typeface)
- ✅ Improved font weights and readability

---

### v2.0.1 - Audit Trail Fix (January 21, 2026)
- ✅ Fixed audit trail to capture actual logged-in user name
- ✅ `logAction()` now auto-detects user from session
- ✅ Shows "System" for automated/background operations

### v2.0.0 - Production Release (January 21, 2026)
**🎉 Major Release - Production Ready**

#### Security & Authentication
- ✅ Removed all mock/demo user accounts
- ✅ Removed developer backdoor logins (dev@dreambox.com, etc.)
- ✅ Authentication now requires Supabase configuration
- ✅ No hardcoded credentials in codebase

#### Data Cleanup
- ✅ Removed sample tasks and demo data
- ✅ Empty initialization for all data arrays
- ✅ Supabase is now the single source of truth

#### New Features
- ✅ Client notes field for internal documentation
- ✅ Full audit trail with Supabase sync

---

### v1.9.28 - Pre-release Verification (January 21, 2026)
- Build verification and testing
- Version bump for release preparation

### v1.9.27 - Client Notes Feature (January 21, 2026)
- Added `notes` field to Client interface
- Client notes display on cards and edit modal
- Notes sync to Supabase automatically

### v1.9.26 - Audit Trail Enhancement
- Full CRUD for audit logs
- Supabase sync for activity tracking
- Clear all logs functionality (Admin only)

---

## 🔒 Security

- All authentication handled via Supabase Auth
- Service role keys only used in Edge Functions (server-side)
- Row Level Security (RLS) recommended for all tables
- No sensitive data stored in frontend code

## 📊 Database Schema

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for complete database setup instructions.

## 📄 License

Proprietary - Dreambox Advertising © 2026
