import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AddFarm() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    farm_name: '',
    state: '',
    lga: '',
    area_hectares: '',
    lat: '',
    lon: '',
    land_cost_ngn: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setMessage('Please login first');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/farms/', form);
      setMessage('Farm added successfully!');
      setTimeout(() => navigate('/farms'), 1500);
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div className="alert alert-warning">Please log in to add a farm.</div>;
  }

  return (
    <div className="card">
      <div className="card-header bg-success text-white">➕ Add New Farm</div>
      <div className="card-body">
        {message && (
          <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-danger'}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Farm Name *</label>
              <input
                type="text"
                name="farm_name"
                className="form-control"
                value={form.farm_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">State</label>
              <input
                type="text"
                name="state"
                className="form-control"
                value={form.state}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">LGA</label>
              <input
                type="text"
                name="lga"
                className="form-control"
                value={form.lga}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Area (hectares)</label>
              <input
                type="number"
                step="0.1"
                name="area_hectares"
                className="form-control"
                value={form.area_hectares}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Latitude</label>
              <input
                type="number"
                step="0.0001"
                name="lat"
                className="form-control"
                value={form.lat}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Longitude</label>
              <input
                type="number"
                step="0.0001"
                name="lon"
                className="form-control"
                value={form.lon}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-12 mb-3">
              <label className="form-label">Land Cost (₦)</label>
              <input
                type="number"
                step="0.01"
                name="land_cost_ngn"
                className="form-control"
                value={form.land_cost_ngn}
                onChange={handleChange}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Saving...' : 'Save Farm'}
          </button>
        </form>
      </div>
    </div>
  );
}