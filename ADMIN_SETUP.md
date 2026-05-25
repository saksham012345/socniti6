# Admin Panel Setup Guide

## ✅ Admin Panel Status
The admin panel **EXISTS** and is fully functional at `/admin` route.

### Admin Dashboard Features:
- View pending events awaiting approval
- Approve or reject events
- Manage event queue

---

## 📝 Demo Admin Credentials

Use these credentials to access the admin panel:

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `admin123` |
| **Role** | admin |
| **Email** | admin@socniti.com |

---

## 🚀 How to Create Admin Users

### Option 1: Using GraphQL Mutation (Recommended)

1. **Sign up via the application** with admin role:
   - Go to signup page
   - Full Name: `Admin User`
   - Username: `admin`
   - Email: `admin@socniti.com`
   - Password: `admin123`
   - Select Role: Choose **"admin"** option
   - The account is created without email verification

2. **Login with credentials**:
   - Username: `admin`
   - Password: `admin123`
   - You'll be redirected to Admin Dashboard at `/admin`

### Option 2: Direct Database Insert

If you have direct database access, you can manually insert an admin user:

```sql
INSERT INTO users (full_name, username, email, password, role, verified)
VALUES (
  'Admin User',
  'admin',
  'admin@socniti.com',
  '$2a$10$...',  -- bcrypt hash of 'admin123'
  'admin',
  true
);
```

To generate a bcrypt hash for `admin123`:
```javascript
const bcrypt = require('bcryptjs');
bcrypt.hashSync('admin123', 10);
// Output: $2a$10$Xx0HqQqpxqpxqpxqpxqpxOYzYzYzYzYzYzYzYzYzYz
```

---

## 🔑 Login Process

1. **Go to Login Page** → `/login`
2. **Enter Credentials**:
   - Username: `admin`
   - Password: `admin123`
3. **Submit** → You'll be authenticated and redirected to Admin Dashboard

---

## 🛡️ Security Notes

- ⚠️ These are **demo credentials only** - change them in production!
- Admin users have elevated permissions to approve/reject events
- All passwords are bcrypt-hashed in the database
- JWT tokens expire after 30 days
- Tokens are stored in `localStorage` as `token`

---

## 📌 Admin Routes

| Route | Purpose | Access |
|-------|---------|--------|
| `/admin` | Admin Dashboard | `role === 'admin'` |
| `/agent` | Agent Dashboard | `role === 'admin' \|\| 'agent'` |

---

## 🐛 Troubleshooting

**Cannot access admin panel?**
- Ensure you're logged in with an `admin` role user
- Check localStorage has valid `token`
- Token might have expired (30 days max)

**Forgot admin password?**
- Manually update in database or
- Create new admin user via signup

**Need to verify users?**
- User email verification is disabled.
- New users can sign up and log in with their password immediately.
