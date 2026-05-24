#!/usr/bin/env node

/**
 * Admin User Creation Script
 * Creates an admin user directly in the database
 * 
 * Usage: node create-admin.js [username] [email] [password]
 * 
 * Example:
 *   node create-admin.js admin admin@socniti.com admin123
 *   node create-admin.js
 */

require('dotenv').config({ path: '../../.env' });
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { query } = require('./src/db');

const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@socniti.com',
  password: 'admin123',
  fullName: 'Admin User'
};

async function createAdminUser(username, email, password, fullName) {
  try {
    console.log('🔧 Creating admin user...');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user already exists
    const existing = await query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username.toLowerCase().trim(), email.toLowerCase().trim()]
    );
    
    if (existing.rows.length > 0) {
      console.error('❌ User already exists:', existing.rows[0].username);
      process.exit(1);
    }
    
    // Insert admin user
    const result = await query(
      `INSERT INTO users (full_name, username, email, password, role, verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING id, username, email, role`,
      [fullName, username.toLowerCase().trim(), email.toLowerCase().trim(), hashedPassword, 'admin']
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Admin user created successfully!');
      console.log('');
      console.log('📝 Login Credentials:');
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
      console.log('🌐 Access admin panel at: http://localhost:3000/admin');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

// Get arguments from CLI
const args = process.argv.slice(2);
const username = args[0] || DEFAULT_ADMIN.username;
const email = args[1] || DEFAULT_ADMIN.email;
const password = args[2] || DEFAULT_ADMIN.password;
const fullName = args[3] || DEFAULT_ADMIN.fullName;

console.log('');
console.log('🚀 Admin User Creation Script');
console.log('================================');
console.log('');

createAdminUser(username, email, password, fullName);
