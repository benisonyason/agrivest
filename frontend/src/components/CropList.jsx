import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CropList() {
  const [crops, setCrops] = useState([]);
  const [farms, setFarms] = useState([]);
  const [farmBlocks, setFarmBlocks] = useState([]);
  const [plantings, setPlantings] = useState([]);
  const [yields, setYields] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [showStats, setShowStats] = useState(true);
  const [formData, setFormData] = useState({
    crop_name: '',
    season: '',
    avg_yield_ton_ha: '',
    seed_cost_ngn_per_kg: '',
    farms_id: '',
    farm_blocks_id: ''
  });
  
  const { token } = useAuth();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching crop data...');
        const [
          cropsRes,
          farmsRes,
          blocksRes,
          plantingsRes,
          yieldsRes,
          varietiesRes,
          diseasesRes
        ] = await Promise.all([
          api.get('/crops/'),
          api.get('/farms/'),
          api.get('/farmblocks/'),
          api.get('/plantings/'),
          api.get('/yields/'),
          api.get('/cropvarieties/').catch(() => ({ data: [] })),
          api.get('/cropdiseases/').catch(() => ({ data: [] }))
        ]);
        
        setCrops(Array.isArray(cropsRes.data) ? cropsRes.data : (cropsRes.data?.results || []));
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
        setFarmBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : (blocksRes.data?.results || []));
        setPlantings(Array.isArray(plantingsRes.data) ? plantingsRes.data : (plantingsRes.data?.results || []));
        setYields(Array.isArray(yieldsRes.data) ? yieldsRes.data : (yieldsRes.data?.results || []));
        setVarieties(Array.isArray(varietiesRes.data) ? varietiesRes.data : (varietiesRes.data?.results || []));
        setDiseases(Array.isArray(diseasesRes.data) ? diseasesRes.data : (diseasesRes.data?.results || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load crop data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Calculate statistics for each crop
  const cropsWithStats = crops.map(crop => {
    const cropPlantings = plantings.filter(p => p.crops_id?.crops_id === crop.crops_id);
    const cropYields = yields.filter(y => cropPlantings.some(p => p.plantings_id === y.plantings_id?.plantings_id));
    const totalYield = cropYields.reduce((sum, y) => sum + (y.yield_tons || 0), 0);
    const totalPlantings = cropPlantings.length;
    const avgYield = totalPlantings > 0 ? totalYield / totalPlantings : 0;
    const totalRevenue = cropYields.reduce((sum, y) => sum + ((y.yield_tons || 0) * 300000), 0);
    const varietiesCount = varieties.filter(v => v.crops_id?.crops_id === crop.crops_id).length;
    const diseasesCount = diseases.filter(d => d.crops_id?.crops_id === crop.crops_id).length;
    
    return {
      ...crop,
      totalYield,
      totalPlantings,
      avgYield,
      totalRevenue,
      varietiesCount,
      diseasesCount,
      harvestCount: cropYields.length
    };
  });

  // Filter crops
  const filteredCrops = cropsWithStats.filter(crop => {
    const matchesSearch = searchTerm === '' || 
      (crop.crop_name && crop.crop_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFarm = selectedFarm === '' || crop.farms_id?.farms_id?.toString() === selectedFarm;
    const matchesSeason = selectedSeason === '' || crop.season === selectedSeason;
    
    return matchesSearch && matchesFarm && matchesSeason;
  });

  // Statistics for dashboard
  const totalCrops = crops.length;
  const totalPlantingsCount = plantings.length;
  const totalYieldAll = yields.reduce((sum, y) => sum + (y.yield_tons || 0), 0);
  const totalRevenueAll = yields.reduce((sum, y) => sum + ((y.yield_tons || 0) * 300000), 0);
  const avgYieldPerCrop = totalCrops > 0 ? totalYieldAll / totalCrops : 0;
  
  const cropsBySeason = {
    WET: crops.filter(c => c.season === 'WET').length,
    DRY: crops.filter(c => c.season === 'DRY').length,
    PERENNIAL: crops.filter(c => c.season === 'PERENNIAL').length
  };
  
  const seasonChartData = [
    { name: 'Wet Season', value: cropsBySeason.WET },
    { name: 'Dry Season', value: cropsBySeason.DRY },
    { name: 'Perennial', value: cropsBySeason.PERENNIAL }
  ].filter(s => s.value > 0);

  // Top yielding crops
  const topYieldingCrops = [...cropsWithStats]
    .sort((a, b) => b.totalYield - a.totalYield)
    .slice(0, 5);

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit crops');
      return;
    }
    
    try {
      if (editingCrop) {
        await api.put(`/crops/${editingCrop}/`, formData);
      } else {
        await api.post('/crops/', formData);
      }
      setShowAddModal(false);
      setEditingCrop(null);
      setFormData({
        crop_name: '',
        season: '',
        avg_yield_ton_ha: '',
        seed_cost_ngn_per_kg: '',
        farms_id: '',
        farm_blocks_id: ''
      });
      // Refresh data
      const cropsRes = await api.get('/crops/');
      setCrops(Array.isArray(cropsRes.data) ? cropsRes.data : (cropsRes.data?.results || []));
    } catch (err) {
      console.error('Error saving crop:', err);
      alert('Error saving crop');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this crop? This will affect all related plantings and yields.')) return;
    try {
      await api.delete(`/crops/${id}/`);
      const cropsRes = await api.get('/crops/');
      setCrops(Array.isArray(cropsRes.data) ? cropsRes.data : (cropsRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting crop:', err);
      alert('Error deleting crop. It may have associated plantings.');
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading crop data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Crops</h4>
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
          <h1 className="display-5 mb-0">🌱 Crops</h1>
          <p className="text-muted">Manage and view all crops with planting and yield statistics</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className={`btn ${showStats ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? 'Hide Stats' : 'Show Stats'} 📊
          </button>
          {token && (
            <button className="btn btn-success" onClick={() => {
              setEditingCrop(null);
              setFormData({
                crop_name: '',
                season: '',
                avg_yield_ton_ha: '',
                seed_cost_ngn_per_kg: '',
                farms_id: '',
                farm_blocks_id: ''
              });
              setShowAddModal(true);
            }}>
              + Add New Crop
            </button>
          )}
        </div>
      </div>

      {/* Statistics Dashboard */}
      {showStats && (
        <>
          <div className="row mb-4 g-3">
            <div className="col-md-3">
              <div className="card bg-success text-white shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Crops</h6>
                  <h2 className="mb-0">{totalCrops}</h2>
                  <small>{cropsBySeason.WET} Wet, {cropsBySeason.DRY} Dry, {cropsBySeason.PERENNIAL} Perennial</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-primary text-white shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Plantings</h6>
                  <h2 className="mb-0">{totalPlantingsCount}</h2>
                  <small>planting events</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-warning text-white shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Yield</h6>
                  <h2 className="mb-0">{totalYieldAll.toFixed(1)} tons</h2>
                  <small>{avgYieldPerCrop.toFixed(1)} tons/crop avg</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info text-white shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Revenue</h6>
                  <h2 className="mb-0">₦{(totalRevenueAll / 1000000).toFixed(1)}M</h2>
                  <small>estimated value</small>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🌾 Crop Season Distribution</h5>
                </div>
                <div className="card-body">
                  {seasonChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={seasonChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {seasonChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted">No season data available</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🏆 Top 5 Highest Yielding Crops</h5>
                </div>
                <div className="card-body">
                  {topYieldingCrops.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={topYieldingCrops}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="crop_name" angle={-45} textAnchor="end" height={60} />
                        <YAxis label={{ value: 'Tons', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => `${value} tons`} />
                        <Bar dataKey="totalYield" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted">No yield data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Search and Filter Bar */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">🔍 Search Crops</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by crop name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
            <div className="col-md-3">
              <label className="form-label">🌦️ Filter by Season</label>
              <select
                className="form-select"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
              >
                <option value="">All Seasons</option>
                <option value="WET">Wet Season</option>
                <option value="DRY">Dry Season</option>
                <option value="PERENNIAL">Perennial</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              {(searchTerm || selectedFarm || selectedSeason) && (
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedFarm('');
                    setSelectedSeason('');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Crops Grid */}
      {filteredCrops.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No crops found</h5>
          <p>Try adjusting your search or filters, or add a new crop.</p>
        </div>
      ) : (
        <div className="row g-4">
          {filteredCrops.map(crop => (
            <div key={crop.crops_id} className="col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm hover-shadow">
                <div className="card-header bg-warning text-dark">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{crop.crop_name || `Crop ${crop.crops_id}`}</h5>
                    <span className="badge bg-dark">ID: {crop.crops_id}</span>
                  </div>
                </div>
                <div className="card-body">
                  {/* Basic Info */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">🌦️ Season:</span>
                      <span className="fw-bold">
                        {crop.season === 'WET' ? '🌧️ Wet Season' : 
                         crop.season === 'DRY' ? '☀️ Dry Season' : '🌿 Perennial'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">📊 Avg Yield:</span>
                      <span className="fw-bold">{crop.avg_yield_ton_ha || 0} t/ha</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">💰 Seed Cost:</span>
                      <span className="fw-bold text-success">
                        ₦{crop.seed_cost_ngn_per_kg?.toLocaleString() || 0}/kg
                      </span>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="bg-light p-2 rounded mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Total Yield:</small>
                      <strong>{crop.totalYield.toFixed(1)} tons</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Plantings:</small>
                      <strong>{crop.totalPlantings}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Harvests:</small>
                      <strong>{crop.harvestCount}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <small className="text-muted">Revenue:</small>
                      <strong className="text-success">₦{(crop.totalRevenue / 1000000).toFixed(1)}M</strong>
                    </div>
                  </div>

                  {/* Related Info */}
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {crop.varietiesCount > 0 && (
                      <span className="badge bg-info">🌱 {crop.varietiesCount} Varieties</span>
                    )}
                    {crop.diseasesCount > 0 && (
                      <span className="badge bg-danger">🦠 {crop.diseasesCount} Diseases</span>
                    )}
                    {crop.farms_id && (
                      <span className="badge bg-secondary">🏠 {crop.farms_id.farm_name}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-outline-warning btn-sm flex-grow-1"
                      onClick={() => setSelectedCrop(crop)}
                    >
                      View Details
                    </button>
                    {crop.farms_id && (
                      <Link 
                        to={`/farm/${crop.farms_id.farms_id}`} 
                        className="btn btn-outline-info btn-sm"
                      >
                        Farm
                      </Link>
                    )}
                    {token && (
                      <>
                        <button 
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                            setEditingCrop(crop.crops_id);
                            setFormData({
                              crop_name: crop.crop_name || '',
                              season: crop.season || '',
                              avg_yield_ton_ha: crop.avg_yield_ton_ha || '',
                              seed_cost_ngn_per_kg: crop.seed_cost_ngn_per_kg || '',
                              farms_id: crop.farms_id?.farms_id || '',
                              farm_blocks_id: crop.farm_blocks_id?.farm_blocks_id || ''
                            });
                            setShowAddModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDelete(crop.crops_id)}
                        >
                          Del
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">{editingCrop ? 'Edit Crop' : 'Add New Crop'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddEdit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Crop Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.crop_name}
                      onChange={(e) => setFormData({...formData, crop_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Season</label>
                    <select
                      className="form-select"
                      value={formData.season}
                      onChange={(e) => setFormData({...formData, season: e.target.value})}
                    >
                      <option value="">Select Season</option>
                      <option value="WET">Wet Season</option>
                      <option value="DRY">Dry Season</option>
                      <option value="PERENNIAL">Perennial</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Average Yield (tons/hectare)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={formData.avg_yield_ton_ha}
                      onChange={(e) => setFormData({...formData, avg_yield_ton_ha: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Seed Cost (₦/kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.seed_cost_ngn_per_kg}
                      onChange={(e) => setFormData({...formData, seed_cost_ngn_per_kg: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Associated Farm</label>
                    <select
                      className="form-select"
                      value={formData.farms_id}
                      onChange={(e) => setFormData({...formData, farms_id: e.target.value})}
                    >
                      <option value="">Select Farm</option>
                      {farms.map(farm => (
                        <option key={farm.farms_id} value={farm.farms_id}>
                          {farm.farm_name || `Farm ${farm.farms_id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-warning">Save Crop</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Crop Details Modal */}
      {selectedCrop && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">Crop Details: {selectedCrop.crop_name}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedCrop(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>📋 Basic Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Crop ID:</th><td>{selectedCrop.crops_id}</td></tr>
                        <tr><th>Season:</th><td>{selectedCrop.season || 'N/A'}</td></tr>
                        <tr><th>Avg Yield:</th><td>{selectedCrop.avg_yield_ton_ha || 0} t/ha</td></tr>
                        <tr><th>Seed Cost:</th><td>₦{selectedCrop.seed_cost_ngn_per_kg?.toLocaleString() || 0}/kg</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>📊 Production Statistics</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Total Yield:</th><td className="fw-bold">{selectedCrop.totalYield.toFixed(1)} tons</td></tr>
                        <tr><th>Total Plantings:</th><td>{selectedCrop.totalPlantings}</td></tr>
                        <tr><th>Harvests:</th><td>{selectedCrop.harvestCount}</td></tr>
                        <tr><th>Est. Revenue:</th><td className="text-success">₦{(selectedCrop.totalRevenue / 1000000).toFixed(2)}M</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedCrop.farms_id && (
                  <>
                    <hr />
                    <h6>🏠 Associated Farm</h6>
                    <Link to={`/farm/${selectedCrop.farms_id.farms_id}`} className="text-decoration-none">
                      <div className="bg-light p-2 rounded">
                        <strong>{selectedCrop.farms_id.farm_name}</strong><br />
                        {selectedCrop.farms_id.state}, {selectedCrop.farms_id.lga}<br />
                        {selectedCrop.farms_id.area_hectares} hectares
                      </div>
                    </Link>
                  </>
                )}

                {selectedCrop.varietiesCount > 0 && (
                  <>
                    <hr />
                    <h6>🌱 Crop Varieties ({selectedCrop.varietiesCount})</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {varieties.filter(v => v.crops_id?.crops_id === selectedCrop.crops_id).map(variety => (
                        <span key={variety.crop_varieties_id} className="badge bg-info">
                          {variety.variety_name} ({variety.maturity_days} days)
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {selectedCrop.diseasesCount > 0 && (
                  <>
                    <hr />
                    <h6>🦠 Common Diseases ({selectedCrop.diseasesCount})</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {diseases.filter(d => d.crops_id?.crops_id === selectedCrop.crops_id).map(disease => (
                        <span key={disease.crop_diseases_id} className="badge bg-danger">
                          {disease.disease_name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedCrop(null)}>Close</button>
                {token && (
                  <button 
                    className="btn btn-warning"
                    onClick={() => {
                      setSelectedCrop(null);
                      setEditingCrop(selectedCrop.crops_id);
                      setFormData({
                        crop_name: selectedCrop.crop_name || '',
                        season: selectedCrop.season || '',
                        avg_yield_ton_ha: selectedCrop.avg_yield_ton_ha || '',
                        seed_cost_ngn_per_kg: selectedCrop.seed_cost_ngn_per_kg || '',
                        farms_id: selectedCrop.farms_id?.farms_id || '',
                        farm_blocks_id: selectedCrop.farm_blocks_id?.farm_blocks_id || ''
                      });
                      setShowAddModal(true);
                    }}
                  >
                    Edit Crop
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