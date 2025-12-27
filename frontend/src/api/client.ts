import axios from 'axios';

// Use your computer's LAN IP for mobile device access
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.70.22.235:5000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for image uploads
});

export async function getHealth(): Promise<string> {
  const res = await client.get('/api/health');
  return res.data?.message || 'ok';
}

export type Crop = { id: number; name: string; name_hi?: string };

export async function getCrops(): Promise<Crop[]> {
  const res = await client.get('/api/crops');
  return res.data?.crops || [];
}

export type Scan = {
  scan_id: number;
  crop_id: number;
  crop_name?: string;
  image_path?: string;
  created_at: string;
  status: string;
  n_score?: number;
  p_score?: number;
  k_score?: number;
  n_confidence?: number;
  p_confidence?: number;
  k_confidence?: number;
  recommendation?: string;
};

export async function uploadScan(uri: string, cropId: number) {
  const formData = new FormData();
  formData.append('crop_id', String(cropId));
  formData.append('image', {
    uri,
    name: 'leaf.jpg',
    type: 'image/jpeg',
  } as any);

  const res = await client.post('/api/scans', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getScans(): Promise<Scan[]> {
  const res = await client.get('/api/scans');
  return res.data?.scans || [];
}

export { client };
