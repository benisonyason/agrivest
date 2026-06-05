import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FarmerList() {
  const [farmers, setFarmers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState(null);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    state: '',
    lga: '',
    farms_id: '',
    registration_date: ''
  });
  
  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching farmers...');
        const [farmersRes, farmsRes] = await Promise.all([
          api.get('/farmers/'),
          api.get('/farms/')
        ]);
        
        let farmersData = [];
        if (Array.isArray(farmersRes.data)) {
          farmersData = farmersRes.data;
        } else if (farmersRes.data && farmersRes.data.results) {
          farmersData = farmersRes.data.results;
        }
        
        let farmsData = [];
        if (Array.isArray(farmsRes.data)) {
          farmsData = farmsRes.data;
        } else if (farmsRes.data && farmsRes.data.results) {
          farmsData = farmsRes.data.results;
        }
        
        setFarmers(farmersData);
        setFarms(farmsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load farmers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter farmers
  const filteredFarmers = farmers.filter(farmer => {
    const matchesSearch = searchTerm === '' || 
      (farmer.first_name && farmer.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (farmer.last_name && farmer.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (farmer.email && farmer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (farmer.phone && farmer.phone.includes(searchTerm));
    
    const matchesState = selectedState === '' || farmer.state === selectedState;
    const matchesFarm = selectedFarm === '' || farmer.farms_id?.farms_id?.toString() === selectedFarm;
    
    return matchesSearch && matchesState && matchesFarm;
  });

  // Get unique states
  const uniqueStates = [...new Set(farmers.map(f => f.state).filter(Boolean))];

  // Statistics
  const totalFarmers = farmers.length;
  const totalFarmsOwned = farmers.reduce((sum, f) => sum + (f.farms_id ? 1 : 0), 0);
  const farmersWithEmail = farmers.filter(f => f.email).length;
  const farmersWithPhone = farmers.filter(f => f.phone).length;

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit farmers');
      return;
    }
    
    try {
      if (editingFarmer) {
        await api.put(`/farmers/${editingFarmer}/`, formData);
      } else {
        await api.post('/farmers/', formData);
      }
      setShowAddModal(false);
      setEditingFarmer(null);
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        state: '',
        lga: '',
        farms_id: '',
        registration_date: ''
      });
      // Refresh data
      const farmersRes = await api.get('/farmers/');
      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : (farmersRes.data?.results || []));
    } catch (err) {
      console.error('Error saving farmer:', err);
      alert('Error saving farmer');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this farmer? This may affect related farms.')) return;
    try {
      await api.delete(`/farmers/${id}/`);
      const farmersRes = await api.get('/farmers/');
      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : (farmersRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting farmer:', err);
      alert('Error deleting farmer. They may have associated farms.');
    }
  };

  const openEditModal = (farmer) => {
    setEditingFarmer(farmer.farmers_id);
    setFormData({
      first_name: farmer.first_name || '',
      last_name: farmer.last_name || '',
      phone: farmer.phone || '',
      email: farmer.email || '',
      state: farmer.state || '',
      lga: farmer.lga || '',
      farms_id: farmer.farms_id?.farms_id || '',
      registration_date: farmer.registration_date || ''
    });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading farmers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Farmers</h4>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div>
          <h1 className="display-5 mb-0">👨‍🌾 Farmers</h1>
          <p className="text-muted">Manage and view all registered farmers</p>
        </div>
        {token && (
          <button className="btn btn-success" onClick={() => {
            setEditingFarmer(null);
            setFormData({
              first_name: '',
              last_name: '',
              phone: '',
              email: '',
              state: '',
              lga: '',
              farms_id: '',
              registration_date: new Date().toISOString().split('T')[0]
            });
            setShowAddModal(true);
          }}>
            + Add New Farmer
          </button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">🔍 Search Farmers</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">📍 Filter by State</label>
              <select
                className="form-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                <option value="">All States</option>
                {uniqueStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">🏠 Filter by Farm</label>
              <select
                className="form-select"
                value={selectedFarm}
                onChange={(e) => setSelectedFarm(e.target.value)}
              >
                <option value="">All Farms</option>
                {farms.map(farm => (
                  <option key={farm.farms_id} value={farm.farms_id}>
                    {farm.farm_name || `Farm ${farm.farms_id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              {(searchTerm || selectedState || selectedFarm) && (
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedState('');
                    setSelectedFarm('');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="row mb-4 g-3">
        <div className="col-md-3">
          <div className="card bg-success text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Total Farmers</h6>
              <h2 className="mb-0">{totalFarmers}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-primary text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Farm Owners</h6>
              <h2 className="mb-0">{totalFarmsOwned}</h2>
              <small>with registered farms</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Contact Info</h6>
              <h2 className="mb-0">{farmersWithEmail}</h2>
              <small>have email</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Phone Numbers</h6>
              <h2 className="mb-0">{farmersWithPhone}</h2>
              <small>have phone</small>
            </div>
          </div>
        </div>
      </div>

      {/* Farmers Table */}
      {filteredFarmers.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No farmers found</h5>
          <p>Try adjusting your search or filters, or add a new farmer.</p>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead className="table-success">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Farm</th>
                    <th>Registration Date</th>
                    {token && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredFarmers.map(farmer => (
                    <tr key={farmer.farmers_id} style={{ cursor: 'pointer' }}>
                      <td onClick={() => setSelectedFarmer(farmer)}>{farmer.farmers_id}</td>
                      <td onClick={() => setSelectedFarmer(farmer)}>
                        <strong>{farmer.first_name} {farmer.last_name}</strong>
                      </td>
                      <td onClick={() => setSelectedFarmer(farmer)}>
                        <div className="small">
                          {farmer.phone && <div>📞 {farmer.phone}</div>}
                          {farmer.email && <div>✉️ {farmer.email}</div>}
                        </div>
                      </td>
                      <td onClick={() => setSelectedFarmer(farmer)}>
                        {farmer.state}, {farmer.lga}
                      </td>
                      <td onClick={() => setSelectedFarmer(farmer)}>
                        {farmer.farms_id ? (
                          <Link 
                            to={`/farm/${farmer.farms_id.farms_id}`} 
                            className="text-decoration-none"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {farmer.farms_id.farm_name}
                          </Link>
                        ) : (
                          <span className="text-muted">No farm assigned</span>
                        )}
                      </td>
                      <td onClick={() => setSelectedFarmer(farmer)}>{farmer.registration_date || 'N/A'}</td>
                      {token && (
                        <td>
                          <div className="d-flex gap-1">
                            <button 
                              className="btn btn-sm btn-outline-warning"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(farmer);
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(farmer.farmers_id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">{editingFarmer ? 'Edit Farmer' : 'Add New Farmer'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddEdit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="+234XXXXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="farmer@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">State</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">LGA</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Local Government Area"
                        value={formData.lga}
                        onChange={(e) => setFormData({...formData, lga: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Associated Farm</label>
                      <select
                        className="form-select"
                        value={formData.farms_id}
                        onChange={(e) => setFormData({...formData, farms_id: e.target.value})}
                      >
                        <option value="">Select Farm (optional)</option>
                        {farms.map(farm => (
                          <option key={farm.farms_id} value={farm.farms_id}>
                            {farm.farm_name || `Farm ${farm.farms_id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Registration Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.registration_date}
                        onChange={(e) => setFormData({...formData, registration_date: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Save Farmer</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Farmer Details Modal */}
      {selectedFarmer && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Farmer Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedFarmer(null)}></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-3">
                  <div className="display-1">👨‍🌾</div>
                  <h3>{selectedFarmer.first_name} {selectedFarmer.last_name}</h3>
                  <span className="badge bg-success">ID: {selectedFarmer.farmers_id}</span>
                </div>
                <hr />
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>📞 Phone:</strong><br/>{selectedFarmer.phone || 'N/A'}</p>
                    <p><strong>✉️ Email:</strong><br/>{selectedFarmer.email || 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>📍 Location:</strong><br/>{selectedFarmer.state}, {selectedFarmer.lga}</p>
                    <p><strong>📅 Registered:</strong><br/>{selectedFarmer.registration_date || 'N/A'}</p>
                  </div>
                </div>
                {selectedFarmer.farms_id && (
                  <>
                    <hr />
                    <p><strong>🏠 Associated Farm:</strong><br/>
                      <Link to={`/farm/${selectedFarmer.farms_id.farms_id}`} className="text-decoration-none">
                        {selectedFarmer.farms_id.farm_name}
                      </Link>
                    </p>
                    <p><strong>📍 Farm Location:</strong><br/>{selectedFarmer.farms_id.state}, {selectedFarmer.farms_id.lga}</p>
                    <p><strong>📐 Farm Area:</strong><br/>{selectedFarmer.farms_id.area_hectares || 0} hectares</p>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedFarmer(null)}>Close</button>
                {selectedFarmer.farms_id && (
                  <Link to={`/farm/${selectedFarmer.farms_id.farms_id}`} className="btn btn-success">
                    View Farm →
                  </Link>
                )}
                {token && (
                  <button 
                    className="btn btn-warning"
                    onClick={() => {
                      setSelectedFarmer(null);
                      openEditModal(selectedFarmer);
                    }}
                  >
                    Edit Farmer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}