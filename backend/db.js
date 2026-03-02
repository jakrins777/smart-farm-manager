const mysql = require('mysql2');

const pool = mysql.createPool({
  // 🟢 ดึงค่าจาก Environment Variables ที่เราจะไปตั้งใน Render
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 🟢 สำคัญมาก: Cloud Database ส่วนใหญ่บังคับใช้ SSL
  ssl: {
    rejectUnauthorized: false 
  }
}).promise();

module.exports = pool;