// Developer: jakrins777 (rayzera)
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://smart-farm-manager.onrender.com/api';

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // --- States ควบคุมระบบ ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('doctor'); 
  
  // --- States ข้อมูล ---
  const [pests, setPests] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [moaData, setMoaData] = useState({ recent_history: [], recommendations: [] });
  const [ingredients, setIngredients] = useState([]);
  const [products, setProducts] = useState([]);

  // --- States ฟอร์ม ---
  const [plotName, setPlotName] = useState('แปลงกะหล่ำ A');
  const [selectedPest, setSelectedPest] = useState('');
  const [selectedMoa, setSelectedMoa] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  // ==========================================
  // 🔐 ระบบ Login & Logout
  // ==========================================
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setPests([]); setHistoryData([]);
    setMoaData({ recent_history: [], recommendations: [] });
    setIngredients([]); setProducts([]);
    setSelectedPest(''); setSelectedMoa(''); setSelectedIngredient(''); setSelectedProduct('');
    setUsername(''); setPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      if (res.data.success) {
        setCurrentUser(res.data.user);
        setIsLoggedIn(true);
        fetchPests(); 
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ'));
    }
  };

  // ==========================================
  // 🔗 ฟังก์ชันดึงข้อมูล (API Requests)
  // ==========================================
  const fetchPests = async () => {
    try {
      const res = await axios.get(`${API_URL}/pests`);
      setPests(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/usage-history/${currentUser.user_id}`);
      setHistoryData(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchMoaRecommendations = async (pestId) => {
    try {
      const res = await axios.get(
        `${API_URL}/users/${currentUser.user_id}/plots/${plotName}/pests/${pestId}/moa-recommendations`
      );
      setMoaData(res.data);
    } catch (err) { console.error("Error loading MoA", err); }
  };

  // ==========================================
  // 🖱️ Event Handlers (จุดที่แก้ไขเรื่องข้อมูลไม่ขึ้น)
  // ==========================================
  const handlePestSelect = (e) => {
    const pestId = e.target.value;
    setSelectedPest(pestId);
    setSelectedMoa(''); setSelectedIngredient(''); setSelectedProduct('');
    setIngredients([]); setProducts([]);
    if (pestId) fetchMoaRecommendations(pestId);
  };

  const handleMoaSelect = async (moaId, status) => {
    if (status === 'BLOCKED') return; 
    setSelectedMoa(moaId);
    setSelectedIngredient(''); setSelectedProduct('');
    setIngredients([]); setProducts([]);
    try {
      const res = await axios.get(`${API_URL}/moa/${moaId}/pests/${selectedPest}/ingredients`);
      setIngredients(res.data);
    } catch (err) { console.error(err); }
  };

  const handleIngredientSelect = async (e) => {
    const ingId = e.target.value;
    setSelectedIngredient(ingId);
    setSelectedProduct('');
    setProducts([]); 

    if (!ingId) return;

    try {
      const res = await axios.get(`${API_URL}/ingredients/${ingId}/products`);
      
      // 🟢 เพิ่มการตรวจสอบว่าข้อมูลที่ได้มาคืออะไร
      console.log(`📡 Data received for ingredient ID ${ingId}:`, res.data);
      
      // 🟢 ถ้า API ตอบมาเป็น Array แน่นอน ค่อย Set
      if(Array.isArray(res.data)) {
         setProducts(res.data);
      } else {
         console.warn("⚠️ Data format is not an array:", res.data);
         setProducts([]);
      }

    } catch (err) { 
      console.error("Error fetching products:", err);
      alert("ไม่สามารถดึงข้อมูลสินค้าได้");
    }
  };

  const handleSaveHistory = async () => {
    if (!selectedProduct) return alert('กรุณาเลือกสินค้า');
    try {
      await axios.post(`${API_URL}/usage-history`, {
        user_id: currentUser.user_id,
        plot_name: plotName, 
        pest_id: selectedPest, 
        g_id: selectedMoa, 
        c_id: selectedIngredient, 
        p_id: selectedProduct
      });
      alert('✅ บันทึกประวัติสำเร็จ!');
      setSelectedPest(''); setSelectedMoa(''); setSelectedIngredient(''); setSelectedProduct('');
      setIngredients([]); setProducts([]);
    } catch (err) { alert('❌ บันทึกไม่สำเร็จ'); }
  };

  // ==========================================
  // 🎨 UI: Render Logic
  // ==========================================
  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <h1 style={{ color: '#27ae60', textAlign: 'center' }}>🌱 Smart Farm</h1>
          <p style={{ textAlign: 'center', color: '#7f8c8d' }}>เข้าสู่ระบบผู้จัดการฟาร์ม</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <input 
              type="text" 
              placeholder="ชื่อผู้ใช้" 
              required 
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="รหัสผ่าน" 
              required 
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" style={styles.btnPrimary}>เข้าสู่ระบบ</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appBg}>
      <nav style={styles.navbar}>
        <div style={{ fontWeight: 'bold', fontSize: '20px', color: '#27ae60' }}>🌱 Smart Farm</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{fontSize: '14px', color: '#7f8c8d'}}>👤 {currentUser?.username}</span>
          <button 
            onClick={() => setActiveTab('doctor')} 
            style={activeTab === 'doctor' ? styles.navBtnActive : styles.navBtn}
          >💊 หมอพืช</button>
          <button 
            onClick={() => { setActiveTab('history'); fetchHistory(); }} 
            style={activeTab === 'history' ? styles.navBtnActive : styles.navBtn}
          >📋 ประวัติ</button>
          <button onClick={handleLogout} style={{...styles.navBtn, color: '#e74c3c'}}>🚪 ออก</button>
        </div>
      </nav>

      <div style={styles.container}>
        {activeTab === 'doctor' && (
          <div className="fade-in">
            <h2 style={{ color: '#2c3e50', marginBottom: '5px' }}>วิเคราะห์การใช้ยา</h2>
            <div style={styles.badge}>📍 แปลงปลูก: <strong>{plotName}</strong></div>

            <div style={styles.card}>
              <h3 style={styles.stepTitle}>1️⃣ ระบุศัตรูพืช</h3>
              <select value={selectedPest} onChange={handlePestSelect} style={styles.input}>
                <option value="">-- กรุณาเลือกแมลง --</option>
                {pests.map(p => <option key={p.pest_id} value={p.pest_id}>{p.pest_name}</option>)}
              </select>
            </div>

            {selectedPest && (
              <div style={styles.card}>
                <h3 style={styles.stepTitle}>2️⃣ เลือกกลุ่มยา (จัดการการดื้อยา)</h3>
                {moaData.recent_history.length > 0 && (
                  <div style={styles.alertWarning}>
                    ⚠️ ประวัติ 3 ครั้งล่าสุดของคุณ: <strong>กลุ่ม {moaData.recent_history.join(', ')}</strong>
                  </div>
                )}
                <div style={styles.grid}>
                  {moaData.recommendations.map(moa => {
                    const isBlocked = moa.status === 'BLOCKED';
                    return (
                      <div 
                        key={moa.g_id} 
                        onClick={() => handleMoaSelect(moa.g_id, moa.status)}
                        style={{
                          ...styles.moaCard,
                          backgroundColor: isBlocked ? '#fdedec' : (selectedMoa === moa.g_id ? '#d5f5e3' : '#fff'),
                          borderColor: isBlocked ? '#e74c3c' : (selectedMoa === moa.g_id ? '#27ae60' : '#bdc3c7'),
                          cursor: isBlocked ? 'not-allowed' : 'pointer',
                          opacity: isBlocked ? 0.6 : 1
                        }}
                      >
                        <div style={{ fontWeight: 'bold', color: isBlocked ? '#c0392b' : '#27ae60' }}>
                          {isBlocked ? '🔒 ห้ามใช้' : '✅ แนะนำ'}
                        </div>
                        <div style={{ fontSize: '20px', margin: '5px 0' }}>กลุ่ม {moa.g_id}</div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{moa.g_name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedMoa && (
              <div style={styles.card}>
                <h3 style={styles.stepTitle}>3️⃣ เลือกชื่อสามัญ</h3>
                <select value={selectedIngredient} onChange={handleIngredientSelect} style={styles.input}>
                  <option value="">-- เลือกสารเคมี --</option>
                  {ingredients.map(ing => <option key={ing.c_id} value={ing.c_id}>{ing.c_name}</option>)}
                </select>
              </div>
            )}

     {selectedIngredient && (
              <div style={styles.card}>
                <h3 style={styles.stepTitle}>4️⃣ เลือกยี่ห้อสินค้า</h3>
                <select 
                  value={selectedProduct} 
                  onChange={(e) => setSelectedProduct(e.target.value)} 
                  style={styles.input}
                  // 🟢 เพิ่ม disabled ถ้ากำลังรอโหลดข้อมูล หรือไม่มีข้อมูล
                  disabled={products.length === 0} 
                >
                  <option value="">
                     {products.length === 0 ? "-- ไม่มีสินค้าที่ตรงกัน --" : "-- เลือกสินค้า --"}
                  </option>
                  
                  {/* 🟢 Render เฉพาะเมื่อมีข้อมูลใน products Array */}
                  {products.length > 0 && products.map(prod => (
                    <option key={prod.p_id} value={prod.p_id}>
                      {prod.p_name} {prod.formulation ? `(${prod.formulation})` : ''}
                    </option>
                  ))}
                </select>

                {selectedProduct && (
                  <button onClick={handleSaveHistory} style={{...styles.btnPrimary, marginTop: '15px'}}>💾 บันทึกการพ่นยา</button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="fade-in">
            <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>📋 ประวัติการพ่นยาของคุณ</h2>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2c3e50', color: '#fff' }}>
                    <th style={styles.th}>วันที่</th>
                    <th style={styles.th}>แปลง</th>
                    <th style={styles.th}>เป้าหมาย</th>
                    <th style={styles.th}>กลุ่มยา</th>
                    <th style={styles.th}>สินค้า</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>ยังไม่มีประวัติในบัญชีนี้</td></tr> :
                   historyData.map((row) => (
                    <tr key={row.history_id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={styles.td}>{new Date(row.applied_date).toLocaleDateString('th-TH')}</td>
                      <td style={styles.td}>{row.plot_name}</td>
                      <td style={styles.td}>{row.pest_name}</td>
                      <td style={styles.td}><span style={styles.groupBadge}>{row.g_id}</span></td>
                      <td style={styles.td}><strong>{row.p_name}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Styles (เหมือนเดิมเพื่อความสวยงาม) ---
const styles = {
  loginBg: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)', fontFamily: '"Sarabun", sans-serif' },
  loginCard: { backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: '100%', maxWidth: '350px' },
  appBg: { backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: '"Sarabun", sans-serif', paddingBottom: '40px' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 100 },
  navBtn: { background: 'none', border: 'none', fontSize: '16px', color: '#7f8c8d', cursor: 'pointer', padding: '5px 10px' },
  navBtnActive: { background: 'none', border: 'none', fontSize: '16px', color: '#27ae60', cursor: 'pointer', padding: '5px 10px', fontWeight: 'bold', borderBottom: '2px solid #27ae60' },
  container: { maxWidth: '800px', margin: '20px auto', padding: '0 15px' },
  card: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '20px', borderLeft: '5px solid #2ecc71' },
  stepTitle: { margin: '0 0 15px 0', color: '#34495e', fontSize: '18px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #dcdde1', fontSize: '16px', outline: 'none', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '14px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  badge: { backgroundColor: '#3498db', color: '#fff', padding: '5px 12px', borderRadius: '20px', display: 'inline-block', marginBottom: '20px', fontSize: '14px' },
  alertWarning: { backgroundColor: '#fff3cd', color: '#856404', padding: '12px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #ffeeba' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' },
  moaCard: { padding: '15px', borderRadius: '10px', border: '2px solid', textAlign: 'center' },
  th: { padding: '12px 15px', borderBottom: '2px solid #ecf0f1' },
  td: { padding: '12px 15px', fontSize: '15px', color: '#2c3e50' },
  groupBadge: { backgroundColor: '#f39c12', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }
};