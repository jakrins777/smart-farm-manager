const express = require('express');
const cors = require('cors');
const pool = require('./db'); // เรียกใช้ไฟล์ db.js ที่เราทำไว้

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json()); // สำคัญ! ไว้อ่าน JSON ที่ส่งมา

// --- 1. Root Route (Test) ---
app.get('/', (req, res) => {
    res.send('API is running...');
});

// ==========================================
// 2. ส่วนจัดการสารเคมี (Active Ingredient)
// ==========================================

// GET: ดึงรายชื่อสารเคมี พร้อมชื่อกลุ่ม IRAC (Join Table)
app.get('/api/ingredients', async (req, res) => {
    try {
        const sql = `
            SELECT ai.c_id, ai.c_name, g.g_id, g.g_name, ai.action_type
            FROM active_ingredient ai
            JOIN irac_moa_group g ON ai.g_id = g.g_id
            ORDER BY ai.c_name ASC
        `;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: เพิ่มสารเคมีใหม่
app.post('/api/ingredients', async (req, res) => {
    try {
        const { c_name, g_id, action_type } = req.body;
        
        const [groups] = await pool.query('SELECT g_id FROM irac_moa_group WHERE g_id = ?', [g_id]);
        if (groups.length === 0) return res.status(400).json({ error: 'Invalid IRAC Group ID' });

        const sql = 'INSERT INTO active_ingredient (c_name, g_id, action_type) VALUES (?, ?, ?)';
        const [result] = await pool.query(sql, [c_name, g_id, action_type]);
        res.status(201).json({ message: 'Ingredient added', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT: แก้ไขสารเคมี
app.put('/api/ingredients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { c_name, g_id, action_type } = req.body;

        const sql = 'UPDATE active_ingredient SET c_name = ?, g_id = ?, action_type = ? WHERE c_id = ?';
        const [result] = await pool.query(sql, [c_name, g_id, action_type, id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Ingredient not found' });
        res.json({ message: 'Ingredient updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: ลบสารเคมี
app.delete('/api/ingredients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        try {
            const [result] = await pool.query('DELETE FROM active_ingredient WHERE c_id = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Ingredient not found' });
            res.json({ message: 'Ingredient deleted successfully' });
        } catch (deleteError) {
            if (deleteError.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({ message: 'Cannot delete: used in products or pest control.' });
            }
            throw deleteError;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. ส่วนจัดการสินค้า (Product Trade)
// ==========================================

// GET: ดึงสินค้าทั้งหมด (Inventory)
app.get('/api/products', async (req, res) => {
    try {
        const sql = `
            SELECT p.p_id, p.p_name, a.c_name, g.g_id as irac_group, p.formulation, p.concentration
            FROM product_trade p
            JOIN active_ingredient a ON p.c_id = a.c_id
            JOIN irac_moa_group g ON a.g_id = g.g_id
            ORDER BY p.p_name ASC
        `;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: เพิ่มสินค้าใหม่
app.post('/api/products', async (req, res) => {
    const { p_name, c_id, formulation, concentration } = req.body; 
    try {
        const sql = 'INSERT INTO product_trade (p_name, c_id, formulation, concentration) VALUES (?, ?, ?, ?)';
        const [result] = await pool.query(sql, [p_name, c_id, formulation, concentration]);
        res.status(201).json({ message: 'Product added successfully', productId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT: แก้ไขสินค้า
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { p_name, formulation, concentration } = req.body;
        if (!p_name) return res.status(400).json({ message: 'Product name is required' });

        const sql = 'UPDATE product_trade SET p_name = ?, formulation = ?, concentration = ? WHERE p_id = ?';
        const [result] = await pool.query(sql, [p_name, formulation, concentration, id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: ลบสินค้า
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM product_trade WHERE p_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. ส่วนจัดการแมลง (Pests)
// ==========================================

// GET: ดึงข้อมูลแมลงทั้งหมด
app.get('/api/pests', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM pest');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: ดึงข้อมูลแมลงตาม ID
app.get('/api/pests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM pest WHERE pest_id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Pest not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Pest Doctor (ดูยาตามแมลง)
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
        const [rows] = await pool.query(sql, [id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: เพิ่มแมลง
app.post('/api/pests', async (req, res) => {
    try {
        const { pest_name, pest_type, description } = req.body;
        const sql = 'INSERT INTO pest (pest_name, pest_type, description) VALUES (?, ?, ?)';
        const [result] = await pool.query(sql, [pest_name, pest_type, description]);
        res.status(201).json({ message: 'Added successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT: แก้ไขแมลง
app.put('/api/pests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { pest_name, pest_type, description } = req.body;
        const sql = 'UPDATE pest SET pest_name = ?, pest_type = ?, description = ? WHERE pest_id = ?';
        const [result] = await pool.query(sql, [pest_name, pest_type, description, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Pest not found' });
        res.json({ message: 'Updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: ลบแมลง
app.delete('/api/pests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM pest WHERE pest_id = ?', [id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// START SERVER (ต้องอยู่ล่างสุดเสมอ!)
// ==========================================
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});