import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// --- แมลง (Pests) ---
export const getPests = async () => {
  const response = await axios.get(`${API_URL}/pests`);
  return response.data;
};

export const createPest = async (data) => {
  const response = await axios.post(`${API_URL}/pests`, data);
  return response.data;
};

export const deletePest = async (id) => {
  await axios.delete(`${API_URL}/pests/${id}`);
};

export const getPestSolutions = async (id) => {
  const response = await axios.get(`${API_URL}/pests/${id}/solutions`);
  return response.data;
};

// --- สินค้า/ยา (Products) ---
export const getProducts = async () => {
  const response = await axios.get(`${API_URL}/products`);
  return response.data;
};

export const createProduct = async (data) => {
  const response = await axios.post(`${API_URL}/products`, data);
  return response.data;
};

export const deleteProduct = async (id) => {
  await axios.delete(`${API_URL}/products/${id}`);
};

// --- สารสามัญ (Active Ingredients) - เอาไว้ทำ Dropdown เลือกสาร ---
export const getIngredients = async () => {
  const response = await axios.get(`${API_URL}/ingredients`);
  return response.data;
};