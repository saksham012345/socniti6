# Admin Panel Quick Start

## ✅ Admin Panel Exists!

The admin panel is fully implemented and accessible at **`/admin`** route.

### Admin Dashboard Features:
- ✅ View pending events
- ✅ Approve events  
- ✅ Reject events
- ✅ Real-time event management

---

## 🚀 Quick Setup

### Step 1: Seed Demo Data (Recommended)
Run this command to create all demo users including admin:

```bash
cd apps/backend
npm run seed
```

This creates 4 demo users:
- **Admin**: `admin` / `admin123` (role: admin)
- **Organizer**: `johndoe` / `john123` (role: organizer)
- **Agent**: `agent` / `agent123` (role: agent)
- **User**: `user` / `user123` (role: user)

### Step 2: Login
1. Go to `http://localhost:3000/login`
2. Enter username: `admin`
3. Enter password: `admin123`
4. You'll be redirected to `/admin`

---

## 📝 Demo Admin Credentials

```
Username:  admin
Password:  admin123
Email:     admin@socniti.com
```

---

## 🔧 Alternative: Create Single Admin User

If you want to create just one admin user:

```bash
cd apps/backend
npm run create-admin

# Or with custom credentials:
npm run create-admin -- myadmin myadmin@email.com mypassword "My Admin Name"
```

---

## 📊 Routes

| Route | Purpose | Requires Role |
|-------|---------|---------------|
| `/admin` | Admin Dashboard | `admin` |
| `/agent` | Agent Dashboard | `admin` or `agent` |
| `/organizer` | Organizer Dashboard | `organizer` |
| `/dashboard` | User Dashboard | Any authenticated user |

---

## 📋 Database Schema

Users table supports these roles:
- `user` - Regular user
- `organizer` - Event organizer
- `admin` - Administrator
- `agent` - Support agent

---

## 📚 See Also

For detailed documentation, see [ADMIN_SETUP.md](./ADMIN_SETUP.md)
