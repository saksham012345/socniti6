#!/usr/bin/env node

/**
 * Database Seeding Script
 * Seeds demo data including admin user for testing
 * 
 * Usage: node seed.js
 */

require('dotenv').config({ path: '../../.env' });
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { query } = require('./src/db');

const DEMO_USERS = [
  {
    fullName: 'Admin User',
    username: 'admin',
    email: 'admin@socniti.com',
    password: 'admin123',
    role: 'admin',
    verified: true
  },
  {
    fullName: 'John Organizer',
    username: 'johndoe',
    email: 'john@socniti.com',
    password: 'john123',
    role: 'organizer',
    verified: true
  },
  {
    fullName: 'Agent User',
    username: 'agent',
    email: 'agent@socniti.com',
    password: 'agent123',
    role: 'agent',
    verified: true
  },
  {
    fullName: 'Regular User',
    username: 'user',
    email: 'user@socniti.com',
    password: 'user123',
    role: 'user',
    verified: true
  }
];

async function seedDatabase() {
  try {
    console.log('');
    console.log('🌱 Database Seeding Script');
    console.log('================================');
    console.log('');
    
    console.log('🔄 Clearing existing demo users...');
    await query('DELETE FROM users WHERE username IN ($1, $2, $3, $4)', 
      ['admin', 'johndoe', 'agent', 'user']
    );
    console.log('✅ Cleared existing demo users');
    console.log('');
    
    console.log('📝 Creating demo users...');
    console.log('');
    
    for (const user of DEMO_USERS) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await query(
        `INSERT INTO users (full_name, username, email, password, role, verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [user.fullName, user.username, user.email, hashedPassword, user.role, user.verified]
      );
      
      console.log(`✅ Created ${user.role}: ${user.username}`);
    }
    
    console.log('');
    console.log('================================');
    console.log('✨ Seeding complete!');
    console.log('================================');
    console.log('');
    console.log('📝 Demo Credentials:');
    console.log('');
    
    DEMO_USERS.forEach(user => {
      console.log(`🔑 ${user.role.toUpperCase()}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log('');
    });
    
    console.log('🌐 Access the application at: http://localhost:3000');
    console.log('📊 Admin Dashboard at: http://localhost:3000/admin');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
}

seedDatabase();
