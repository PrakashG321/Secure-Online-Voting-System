import bcrypt from 'bcrypt';
import pg from 'pg';
import 'dotenv/config';


const db = new pg.Client({
    user:process.env.User_name,
    host:process.env.Host_name,
    database:process.env.DB_name,
    password:process.env.Password,
    port:process.env.Port,
});

db.connect();

const saltRounds = 10; // Number of salt rounds (higher is more secure but slower)
const adminUsername = 'Admin'; // Replace with your desired admin username
const adminPassword = process.env.Admin_Password; // Replace with a strong admin password

bcrypt.hash(adminPassword, saltRounds, async (err, hashedPassword) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }

  try {
    await db.query('INSERT INTO admins (username, password) VALUES ($1, $2)', [
      adminUsername,
      hashedPassword,
    ]);
    console.log('Admin user created successfully');
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    db.end();
  }
});