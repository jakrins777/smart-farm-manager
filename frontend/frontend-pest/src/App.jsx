import { useState, useEffect } from 'react';
import { 
  getPests, deletePest, createPest, getPestSolutions, 
  getProducts, createProduct, deleteProduct, getIngredients 
} from './api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('pests');
  const [loading, setLoading] = useState(false);

  // --- State แมลง ---
  const [pests, setPests] = useState([]);
  const [selectedPest, setSelectedPest] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [newPestName, setNewPestName] = useState('');

  // --- State สินค้า/ยา ---
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]); // เก็บรายชื่อสารเคมีไว้ทำ Dropdown
  
  // Form เพิ่มสินค้าใหม่
  const [newProduct, setNewProduct] = useState({
    p_name: '',
    c_id: '', // เก็บ ID ของสารสามัญที่เลือก
    formulation: '',
    concentration: ''
  });

  // Load Data ครั้งแรก
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // โหลดข้อมูลทุกอย่างพร้อมกัน
      const [pestData, productData, ingredientData] = await Promise.all([
        getPests(),
        getProducts(),
        getIngredients()
      ]);

      setPests(Array.isArray(pestData) ? pestData : []);
      setProducts(Array.isArray(productData) ? productData : []);
      setIngredients(Array.isArray(ingredientData) ? ingredientData : []);

    } catch (error) {
      console.error("Error loading data:", error);
      alert("ไม่สามารถเชื่อมต่อ Server ได้ (ตรวจสอบ Backend)");
    } finally {
      setLoading(false);
    }
  };

  // ================= ฟังก์ชันจัดการแมลง =================
  const handleAddPest = async (e) => {
    e.preventDefault();
    if (!newPestName) return;
    try {
      await createPest({ pest_name: newPestName, pest_type: 'insect' });
      setNewPestName('');
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleDeletePest = async (id) => {
    if (confirm('ยืนยันลบแมลง?')) {
      await deletePest(id);
      fetchData();
    }
  };

  const handleViewSolutions = async (pest) => {
    setSelectedPest(pest);
    try {
      const data = await getPestSolutions(pest.pest_id);
      setSolutions(Array.isArray(data) ? data : []);
    } catch (err) { setSolutions([]); }
  };

  // ================= ฟังก์ชันจัดการสินค้า (CRUD ยา) =================
  const handleAddProduct = async (e) => {
    e.preventDefault();
    // ตรวจสอบค่าว่าง
    if (!newProduct.p_name || !newProduct.c_id) {
      alert("กรุณากรอกชื่อการค้า และเลือกชื่อสามัญ");
      return;
    }

    try {
      await createProduct(newProduct);
      // Reset Form
      setNewProduct({ p_name: '', c_id: '', formulation: '', concentration: '' });
      fetchData(); // โหลดข้อมูลใหม่
      alert("เพิ่มสินค้าเรียบร้อย!");
    } catch (err) {
      alert("บันทึกไม่สำเร็จ: " + err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('ยืนยันลบสินค้านี้?')) {
      try {
        await deleteProduct(id);
        fetchData();
      } catch (err) { alert(err.message); }
    }
  };

  if (loading) return <div style={{textAlign:'center', padding:'50px'}}>⏳ กำลังโหลด...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Sarabun, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>🌱 Smart Farm Manager</h1>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', gap: '10px' }}>
        <button onClick={() => setActiveTab('pests')} style={tabStyle(activeTab === 'pests', '#27ae60')}>🐛 จัดการแมลง</button>
        <button onClick={() => setActiveTab('products')} style={tabStyle(activeTab === 'products', '#2980b9')}>💊 คลังสินค้า/ยา</button>
      </div>

      {/* ================= TAB 1: แมลง ================= */}
      {activeTab === 'pests' && (
        <div>
          <div style={cardStyle}>
            <h3>➕ เพิ่มแมลงใหม่</h3>
            <form onSubmit={handleAddPest} style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="ชื่อแมลง" value={newPestName} onChange={(e) => setNewPestName(e.target.value)} style={inputStyle} />
              <button type="submit" style={btnStyle('#27ae60')}>บันทึก</button>
            </form>
          </div>

          {selectedPest && (
            <div style={{...cardStyle, border: '2px solid #27ae60', backgroundColor: '#e8f6f3'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, color: '#16a085' }}>ยาแนะนำสำหรับ: {selectedPest.pest_name}</h3>
                <button onClick={() => setSelectedPest(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2em' }}>❌</button>
              </div>
              <hr style={{ borderColor: '#a3e4d7' }}/>
              {solutions.length === 0 ? <p>ยังไม่มีข้อมูลยา</p> : (
                <ul style={{ paddingLeft: '20px' }}>
                  {solutions.map((sol, index) => (
                    <li key={index} style={{ marginBottom: '8px' }}>
                      <strong>{sol.c_name}</strong> (กลุ่ม {sol.irac_group}) 
                      <span style={{ fontSize: '0.9em', color: '#666', marginLeft: '10px' }}>
                         ตัวอย่าง: {sol.example_product || '-'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                <th style={{ padding: '10px' }}>ชื่อแมลง</th>
                <th style={{ padding: '10px' }}>ประเภท</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {pests.map((pest) => (
                <tr key={pest.pest_id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{pest.pest_name}</td>
                  <td style={{ padding: '10px' }}>{pest.pest_type}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button onClick={() => handleViewSolutions(pest)} style={{...btnStyle('#f39c12'), marginRight:'5px'}}>🔍 ดูยา</button>
                    <button onClick={() => handleDeletePest(pest.pest_id)} style={btnStyle('#c0392b')}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 2: สินค้า (CRUD ยา) ================= */}
      {activeTab === 'products' && (
        <div>
          {/* ฟอร์มเพิ่มสินค้า (CRUD: Create) */}
          <div style={{...cardStyle, backgroundColor: '#d6eaf8', border: '1px solid #a9cce3'}}>
            <h3 style={{color: '#2980b9'}}>➕ เพิ่มสินค้า/ยาใหม่</h3>
            <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              
              {/* ชื่อการค้า */}
              <div>
                <label>ชื่อการค้า:</label>
                <input 
                  type="text" 
                  placeholder="เช่น อะวอนท์"
                  value={newProduct.p_name}
                  onChange={(e) => setNewProduct({...newProduct, p_name: e.target.value})}
                  style={inputStyle}
                />
              </div>

              {/* Dropdown เลือกสารสามัญ (สำคัญมาก!) */}
              <div>
                <label>ชื่อสามัญ (Active Ingredient):</label>
                <select 
                  value={newProduct.c_id}
                  onChange={(e) => setNewProduct({...newProduct, c_id: e.target.value})}
                  style={inputStyle}
                >
                  <option value="">-- กรุณาเลือกสาร --</option>
                  {ingredients.map((ing) => (
                    <option key={ing.c_id} value={ing.c_id}>
                      {ing.c_name} (กลุ่ม {ing.g_name?.replace('Group ', '')})
                    </option>
                  ))}
                </select>
              </div>

              {/* สูตร */}
              <div>
                <label>สูตร (Formulation):</label>
                <input 
                  type="text" 
                  placeholder="เช่น SC, EC, SL"
                  value={newProduct.formulation}
                  onChange={(e) => setNewProduct({...newProduct, formulation: e.target.value})}
                  style={inputStyle}
                />
              </div>

              {/* ความเข้มข้น */}
              <div>
                <label>ความเข้มข้น:</label>
                <input 
                  type="text" 
                  placeholder="เช่น 1.8%"
                  value={newProduct.concentration}
                  onChange={(e) => setNewProduct({...newProduct, concentration: e.target.value})}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                <button type="submit" style={{...btnStyle('#2980b9'), width: '100%', padding: '10px'}}>บันทึกสินค้าใหม่</button>
              </div>
            </form>
          </div>

          {/* ตารางสินค้า (CRUD: Read & Delete) */}
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#2980b9', color: 'white' }}>
                <th style={{ padding: '10px' }}>ชื่อการค้า</th>
                <th style={{ padding: '10px' }}>ชื่อสามัญ</th>
                <th style={{ padding: '10px' }}>สูตร</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>กลุ่ม IRAC</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>ไม่พบสินค้า</td></tr> : 
               products.map((prod) => (
                <tr key={prod.p_id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{prod.p_name}</td>
                  <td style={{ padding: '10px' }}>{prod.c_name}</td>
                  <td style={{ padding: '10px' }}>{prod.formulation || '-'}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#f1c40f', padding: '3px 8px', borderRadius: '10px', fontSize: '0.9em', fontWeight: 'bold' }}>
                      {prod.irac_group}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button onClick={() => handleDeleteProduct(prod.p_id)} style={btnStyle('#e74c3c')}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- CSS Styles แบบ Inline (จะได้ไม่ต้องแก้ไฟล์ CSS) ---
const tabStyle = (isActive, color) => ({
  backgroundColor: isActive ? color : '#bdc3c7',
  color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px'
});
const cardStyle = { backgroundColor: '#ecf0f1', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const btnStyle = (bg) => ({ backgroundColor: bg, color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' });
const tableStyle = { width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' };

export default App;