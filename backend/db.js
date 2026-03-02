const mysql = require('mysql2');

const pool = mysql.createPool({
  // 🟢 ดึงข้อมูลการเชื่อมต่อจากหน้า Environment Variables ของ Render
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // ถ้าไม่ระบุ จะใช้ 3306 เป็นค่าเริ่มต้น
  
  // 🟢 การตั้งค่าประสิทธิภาพการเชื่อมต่อ
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // 🔵 สำคัญมาก: สำหรับ Aiven หรือ Cloud Database ต้องเปิด SSL
  ssl: {
    rejectUnauthorized: false 
  }
}).promise(); // ใช้ .promise() เพื่อให้เขียนโค้ดแบบ async/await ได้ง่ายขึ้น

module.exports = pool;