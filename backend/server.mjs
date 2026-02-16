// server.mjs
import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. GET (Read): ดึงข้อมูลพื้นฐาน
// ==========================================

// [GET] ดึงรายชื่อแมลงทั้งหมด (เอาไปทำ Dropdown ใน React)
app.get('/api/pests', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT pest_id, pest_name, pest_type FROM pest');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// [GET] ดึงรายชื่อสินค้า (ชื่อการค้า) พร้อมชื่อสามัญและกลุ่ม IRAC (JOIN Table)
app.get('/api/products', async (req, res) => {
    try {
        const sql = `
            SELECT p.p_id, p.p_name, a.c_name, g.g_id as irac_group
            FROM product_trade p
            JOIN active_ingredient a ON p.c_id = a.c_id
            JOIN irac_moa_group g ON a.g_id = g.g_id
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ⭐ [Feature สำคัญ] ค้นหายาตามชนิดแมลง (Pest -> Effective Chemicals)
app.get('/api/pests/:id/solutions', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `
            SELECT a.c_name, g.g_id as irac_group, ipc.efficacy_level, p.p_name as example_product
            FROM ingredient_pest_control ipc
            JOIN active_ingredient a ON ipc.c_id = a.c_id
            JOIN irac_moa_group g ON a.g_id = g.g_id
            LEFT JOIN product_trade p ON a.c_id = p.c_id
            WHERE ipc.pest_id = ?
            ORDER BY ipc.efficacy_level DESC
        `;
        const [rows] = await db.query(sql, [id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 2. POST (Create): เพิ่มข้อมูลใหม่
// ==========================================

// [POST] เพิ่มสินค้าใหม่ (ชื่อการค้า)
app.post('/api/products', async (req, res) => {
    // รับค่าจากหน้าบ้าน (React Form)
    const { p_name, c_id, formulation } = req.body; 
    
    try {
        const sql = 'INSERT INTO product_trade (p_name, c_id, formulation) VALUES (?, ?, ?)';
        const [result] = await db.query(sql, [p_name, c_id, formulation]);
        
        res.status(201).json({ 
            message: 'Product added successfully', 
            productId: result.insertId 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 3. PUT (Update): แก้ไขข้อมูล
// ==========================================

// [PUT] แก้ไขชื่อสินค้า หรือสูตร
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { p_name, formulation } = req.body;

    try {
        const sql = 'UPDATE product_trade SET p_name = ?, formulation = ? WHERE p_id = ?';
        const [result] = await db.query(sql, [p_name, formulation, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 4. DELETE (Delete): ลบข้อมูล
// ==========================================

// [DELETE] ลบสินค้า
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM product_trade WHERE p_id = ?', [id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});