const express = require('express');
const cors = require('cors');
const pool = require('./db'); // เรียกใช้ไฟล์ db.js ที่เชื่อมต่อ MySQL

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Root Route (Test) ---
app.get('/', (req, res) => {
    res.send('API is running...');
});

// =========================================================
// 🔐 SECTION 0: ระบบ Login
// =========================================================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // เช็คว่ากรอกข้อมูลมาครบไหม
        if (!username || !password) {
            return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
        }

        // ค้นหาใน Database
        const sql = 'SELECT user_id, username, role FROM users WHERE username = ? AND password = ?';
        const [rows] = await pool.query(sql, [username, password]);

        if (rows.length > 0) {
            // เจอผู้ใช้ = ล็อคอินสำเร็จ (ส่งข้อมูลกลับไปแต่ไม่ส่งรหัสผ่าน)
            res.json({ 
                success: true, 
                message: 'เข้าสู่ระบบสำเร็จ', 
                user: rows[0] 
            });
        } else {
            // ไม่เจอ = รหัสผิด
            res.status(401).json({ 
                success: false, 
                message: 'ชื่อผู้ใช้ หรือ รหัสผ่านไม่ถูกต้อง!' 
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// 🟢 SECTION 1: CRUD จัดการสารเคมี (Active Ingredient)
// =========================================================

// ดึงรายชื่อสารเคมีทั้งหมด (พร้อมกลุ่ม IRAC)
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

app.delete('/api/ingredients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM active_ingredient WHERE c_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Ingredient not found' });
        res.json({ message: 'Ingredient deleted successfully' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Cannot delete: used in products or pest control.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// 🔵 SECTION 2: CRUD จัดการสินค้าและยี่ห้อ (Product Trade)
// =========================================================

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

app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { p_name, formulation, concentration } = req.body;
        const sql = 'UPDATE product_trade SET p_name = ?, formulation = ?, concentration = ? WHERE p_id = ?';
        const [result] = await pool.query(sql, [p_name, formulation, concentration, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

// =========================================================
// 🟡 SECTION 3: CRUD จัดการแมลง (Pests)
// =========================================================

app.get('/api/pests', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM pest');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

app.delete('/api/pests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM pest WHERE pest_id = ?', [id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API แบบเก่า (ดึงยาทั้งหมดแบบไม่เช็คประวัติ) - เก็บไว้เผื่อใช้หน้าอื่น
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

// =========================================================
// 🌟 SECTION 4: SMART FARM DOCTOR (ระบบแนะนำยา + เช็คประวัติใหม่)
// =========================================================

// 4.1 ดึงกลุ่ม MoA ที่แนะนำและห้ามใช้ (เช็คประวัติ 3 ครั้งล่าสุด)
app.get('/api/users/:user_id/plots/:plot_name/pests/:pest_id/moa-recommendations', async (req, res) => {
    try {
        const { user_id, plot_name, pest_id } = req.params;

        // 🟢 จุดสำคัญ: เพิ่ม "AND user_id = ?" เพื่อเช็คเฉพาะประวัติของผู้ใช้นั้นๆ
        const [historyRows] = await pool.query(
            'SELECT g_id FROM usage_history WHERE user_id = ? AND plot_name = ? AND pest_id = ? ORDER BY applied_date DESC LIMIT 3',
            [user_id, plot_name, pest_id]
        );
        const usedGroups = historyRows.map(row => row.g_id.trim()); 

        // ดึงกลุ่มยาทั้งหมดที่ฆ่าแมลงตัวนี้ได้ (ส่วนนี้ไม่ต้องกรอง user_id เพราะเป็นข้อมูลวิชาการ)
        const sqlAllMoa = `
            SELECT DISTINCT g.g_id, g.g_name, g.moa_summary 
            FROM ingredient_pest_control ipc
            JOIN active_ingredient ai ON ipc.c_id = ai.c_id
            JOIN irac_moa_group g ON ai.g_id = g.g_id
            WHERE ipc.pest_id = ?
        `;
        const [allMoaRows] = await pool.query(sqlAllMoa, [pest_id]);

        const result = allMoaRows.map(moa => ({
            g_id: moa.g_id.trim(),
            g_name: moa.g_name,
            moa_summary: moa.moa_summary,
            status: usedGroups.includes(moa.g_id.trim()) ? 'BLOCKED' : 'RECOMMENDED'
        }));

        res.json({
            recent_history: usedGroups, 
            recommendations: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4.2 ดึงรายชื่อสารสามัญ (Active Ingredient) ตามกลุ่ม MoA และ แมลงที่เลือก
app.get('/api/moa/:g_id/pests/:pest_id/ingredients', async (req, res) => {
    try {
        const { g_id, pest_id } = req.params;
        const sql = `
            SELECT ai.c_id, ai.c_name, ipc.efficacy_level 
            FROM active_ingredient ai
            JOIN ingredient_pest_control ipc ON ai.c_id = ipc.c_id
            WHERE ai.g_id = ? AND ipc.pest_id = ?
            ORDER BY FIELD(ipc.efficacy_level, 'high', 'medium', 'low', 'unknown')
        `;
        const [rows] = await pool.query(sql, [g_id, pest_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4.3 ดึงรายชื่อสินค้า (Product) ตามสารสามัญที่เลือก
app.get('/api/ingredients/:c_id/products', async (req, res) => {
    try {
        // 🟢 แปลง c_id เป็นตัวเลขก่อนนำไปใช้
        const c_id = parseInt(req.params.c_id); 
        
        if (isNaN(c_id)) {
            return res.status(400).json({ message: 'Invalid Ingredient ID' });
        }

        const [rows] = await pool.query(
  'SELECT p_id, p_name, formulation FROM product_trade WHERE c_id = ? ORDER BY p_name ASC',
  [c_id]
);
        
        console.log(`Searching for products with c_id: ${c_id}, found: ${rows.length}`); // เช็คใน Terminal
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4.4 บันทึกประวัติการใช้ยาลงตาราง usage_history
app.post('/api/usage-history', async (req, res) => {
    try {
        const { user_id, plot_name, pest_id, g_id, c_id, p_id } = req.body;
        // เพิ่ม user_id เข้าไปในคำสั่ง INSERT
        const sql = 'INSERT INTO usage_history (user_id, plot_name, pest_id, g_id, c_id, p_id) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await pool.query(sql, [user_id, plot_name, pest_id, g_id, c_id, p_id]);
        res.status(201).json({ message: 'บันทึกสำเร็จ', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/usage-history/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const sql = `
            SELECT u.*, p.pest_name, a.c_name, pt.p_name
            FROM usage_history u
            JOIN pest p ON u.pest_id = p.pest_id
            JOIN active_ingredient a ON u.c_id = a.c_id
            JOIN product_trade pt ON u.p_id = pt.p_id
            WHERE u.user_id = ? 
            ORDER BY u.applied_date DESC`;
        const [rows] = await pool.query(sql, [user_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =========================================================
// 🚀 START SERVER (บรรทัดสุดท้ายเสมอ)
// =========================================================
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});