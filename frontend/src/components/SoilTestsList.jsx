import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SoilTestsList() {
  const [soilTests, setSoilTests] = useState([]);
  const [soilZones, setSoilZones] = useState([]);
  const [farms, setFarms] = useState([]);
  const [farmBlocks, setFarmBlocks] = useState([]);
  const [crops, setCrops] = useState([]);
  const [yields, setYields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTest, setSelectedTest] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [formData, setFormData] = useState({
    nitrogen_ppm: '',
    phosphorus_ppm: '',
    potassium_ppm: '',
    test_date: '',
    test_cost_ngn: '',
    lab_name: '',
    soil_zones_id: ''
  });
  
  const { token } = useAuth();
  const COLORS = ['#28a745', '#17a2b8', '#ffc107', '#dc3545'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching soil tests data...');
        const [testsRes, zonesRes, farmsRes, blocksRes] = await Promise.all([
          api.get('/soiltests/'),
          api.get('/soilzones/'),
          api.get('/farms/'),
          api.get('/farmblocks/')
        ]);
        
        setSoilTests(Array.isArray(testsRes.data) ? testsRes.data : (testsRes.data?.results || []));
        setSoilZones(Array.isArray(zonesRes.data) ? zonesRes.data : (zonesRes.data?.results || []));
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
        setFarmBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : (blocksRes.data?.results || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load soil tests data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Enrich soil tests with related data
  const enrichedTests = soilTests.map(test => {
    const zone = soilZones.find(z => z.soil_zones_id === test.soil_zones_id?.soil_zones_id);
    const block = zone ? farmBlocks.find(b => b.farm_blocks_id === zone.farm_blocks_id?.farm_blocks_id) : null;
    const farm = block ? farms.find(f => f.farms_id === block.farms_id?.farms_id) : null;
    
    const nutrientScore = (
      ((test.nitrogen_ppm || 0) >= 40 ? 100 : (test.nitrogen_ppm || 0) >= 20 ? 60 : 30) +
      ((test.phosphorus_ppm || 0) >= 20 ? 100 : (test.phosphorus_ppm || 0) >= 10 ? 60 : 30) +
      ((test.potassium_ppm || 0) >= 150 ? 100 : (test.potassium_ppm || 0) >= 100 ? 60 : 30)
    ) / 3;
    
    let overallHealth = '';
    let healthColor = '';
    if (nutrientScore >= 80) {
      overallHealth = 'Excellent';
      healthColor = 'success';
    } else if (nutrientScore >= 60) {
      overallHealth = 'Good';
      healthColor = 'info';
    } else if (nutrientScore >= 40) {
      overallHealth = 'Fair';
      healthColor = 'warning';
    } else {
      overallHealth = 'Poor';
      healthColor = 'danger';
    }
    
    return {
      ...test,
      zone,
      block,
      farm,
      nutrientScore,
      overallHealth,
      healthColor
    };
  });

  // Filter tests
  const filteredTests = enrichedTests.filter(test => {
    const matchesSearch = searchTerm === '' || 
      (test.lab_name && test.lab_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (test.farm?.farm_name && test.farm.farm_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesZone = selectedZone === '' || test.soil_zones_id?.soil_zones_id?.toString() === selectedZone;
    const matchesFarm = selectedFarm === '' || test.farm?.farms_id?.toString() === selectedFarm;
    
    const matchesDate = (!dateRange.start || (test.test_date && test.test_date >= dateRange.start)) &&
                        (!dateRange.end || (test.test_date && test.test_date <= dateRange.end));
    
    return matchesSearch && matchesZone && matchesFarm && matchesDate;
  });

  // Statistics
  const totalTests = soilTests.length;
  const avgNitrogen = soilTests.reduce((sum, t) => sum + (t.nitrogen_ppm || 0), 0) / (soilTests.length || 1);
  const avgPhosphorus = soilTests.reduce((sum, t) => sum + (t.phosphorus_ppm || 0), 0) / (soilTests.length || 1);
  const avgPotassium = soilTests.reduce((sum, t) => sum + (t.potassium_ppm || 0), 0) / (soilTests.length || 1);
  const totalCost = soilTests.reduce((sum, t) => sum + (parseFloat(t.test_cost_ngn) || 0), 0);
  
  const healthDistribution = {
    Excellent: enrichedTests.filter(t => t.overallHealth === 'Excellent').length,
    Good: enrichedTests.filter(t => t.overallHealth === 'Good').length,
    Fair: enrichedTests.filter(t => t.overallHealth === 'Fair').length,
    Poor: enrichedTests.filter(t => t.overallHealth === 'Poor').length
  };

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit soil tests');
      return;
    }
    
    try {
      if (editingTest) {
        await api.put(`/soiltests/${editingTest}/`, formData);
      } else {
        await api.post('/soiltests/', formData);
      }
      setShowAddModal(false);
      setEditingTest(null);
      setFormData({
        nitrogen_ppm: '',
        phosphorus_ppm: '',
        potassium_ppm: '',
        test_date: '',
        test_cost_ngn: '',
        lab_name: '',
        soil_zones_id: ''
      });
      const testsRes = await api.get('/soiltests/');
      setSoilTests(Array.isArray(testsRes.data) ? testsRes.data : (testsRes.data?.results || []));
    } catch (err) {
      console.error('Error saving soil test:', err);
      alert('Error saving soil test');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this soil test?')) return;
    try {
      await api.delete(`/soiltests/${id}/`);
      const testsRes = await api.get('/soiltests/');
      setSoilTests(Array.isArray(testsRes.data) ? testsRes.data : (testsRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting soil test:', err);
      alert('Error deleting soil test');
    }
  };

  const getNutrientBadge = (value, optimal, moderate) => {
    if (value >= optimal) return <span className="badge bg-success">Optimal</span>;
    if (value >= moderate) return <span className="badge bg-warning text-dark">Moderate</span>;
    return <span className="badge bg-danger">Low</span>;
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading soil tests data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Soil Tests</h4>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div>
          <h1 className="display-5 mb-0">🔬 Soil Test Analysis</h1>
          <p className="text-muted">Comprehensive soil nutrient analysis and fertility recommendations</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className={`btn ${showAnalytics ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'} 📊
          </button>
          {token && (
            <button className="btn btn-success" onClick={() => {
              setEditingTest(null);
              setFormData({
                nitrogen_ppm: '',
                phosphorus_ppm: '',
                potassium_ppm: '',
                test_date: new Date().toISOString().split('T')[0],
                test_cost_ngn: '',
                lab_name: '',
                soil_zones_id: ''
              });
              setShowAddModal(true);
            }}>
              + Add Soil Test
            </button>
          )}
        </div>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <>
          <div className="row mb-4 g-3">
            <div className="col-md-3">
              <div className="card text-white bg-primary h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Tests</h6>
                  <h2 className="mb-0">{totalTests}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-success h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Avg Nitrogen</h6>
                  <h2 className="mb-0">{avgNitrogen.toFixed(0)} ppm</h2>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-info h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Avg Phosphorus</h6>
                  <h2 className="mb-0">{avgPhosphorus.toFixed(0)} ppm</h2>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-warning h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Avg Potassium</h6>
                  <h2 className="mb-0">{avgPotassium.toFixed(0)} ppm</h2>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-4 g-3">
            <div className="col-md-4">
              <div className="card bg-light h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">💰 Total Testing Cost</h6>
                  <h3 className="mb-0">₦{(totalCost / 1000).toFixed(0)}K</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">🏆 Healthy Zones</h6>
                  <h3 className="mb-0 text-success">{healthDistribution.Excellent + healthDistribution.Good}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">⚠️ Need Attention</h6>
                  <h3 className="mb-0 text-danger">{healthDistribution.Fair + healthDistribution.Poor}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-4 g-3">
            <div className="col-md-12">
              <div className="card shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🏆 Soil Health Status</h5>
                </div>
                <div className="card-body">
                  {Object.values(healthDistribution).some(v => v > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={Object.entries(healthDistribution).map(([status, count]) => ({ name: status, value: count }))} 
                             dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {Object.entries(healthDistribution).map(([status, count], index) => (
                            <Cell key={`cell-${index}`} fill={
                              status === 'Excellent' ? '#28a745' :
                              status === 'Good' ? '#17a2b8' :
                              status === 'Fair' ? '#ffc107' : '#dc3545'
                            } />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No health data available</p>}
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
            <div className="col-md-3">
              <label className="form-label">🔍 Search</label>
              <input type="text" className="form-control" placeholder="Search by lab or farm..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">🧪 Soil Zone</label>
              <select className="form-select" value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)}>
                <option value="">All Zones</option>
                {soilZones.map(zone => {
                  const block = farmBlocks.find(b => b.farm_blocks_id === zone.farm_blocks_id?.farm_blocks_id);
                  return (
                    <option key={zone.soil_zones_id} value={zone.soil_zones_id}>
                      {block?.block_name || `Zone ${zone.soil_zones_id}`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">🏠 Farm</label>
              <select className="form-select" value={selectedFarm} onChange={(e) => setSelectedFarm(e.target.value)}>
                <option value="">All Farms</option>
                {farms.map(farm => (
                  <option key={farm.farms_id} value={farm.farms_id}>{farm.farm_name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              {(searchTerm || selectedZone || selectedFarm || dateRange.start || dateRange.end) && (
                <button className="btn btn-outline-secondary w-100" onClick={() => {
                  setSearchTerm('');
                  setSelectedZone('');
                  setSelectedFarm('');
                  setDateRange({ start: '', end: '' });
                }}>Clear Filters</button>
              )}
            </div>
          </div>
          <div className="row g-3 mt-2">
            <div className="col-md-3">
              <label className="form-label">📅 Test Date From</label>
              <input type="date" className="form-control" value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
            </div>
            <div className="col-md-3">
              <label className="form-label">📅 Test Date To</label>
              <input type="date" className="form-control" value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="alert alert-info mb-3">
        <strong>Showing {filteredTests.length}</strong> of {enrichedTests.length} soil tests
      </div>

      {/* Soil Tests Table */}
      {filteredTests.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No soil tests found</h5>
          <p>Try adjusting your search or filters, or add a new soil test.</p>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead className="table-success">
                  <tr>
                    <th>ID</th>
                    <th>Test Date</th>
                    <th>Zone / Block</th>
                    <th>Farm</th>
                    <th>N (ppm)</th>
                    <th>P (ppm)</th>
                    <th>K (ppm)</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Cost</th>
                    {token && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map(test => (
                    <tr key={test.tests_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTest(test)}>
                      <td>{test.tests_id}</td>
                      <td>{test.test_date}</td>
                      <td>{test.zone?.block?.block_name || 'Unknown'}</td>
                      <td>{test.farm?.farm_name || 'Unknown'}</td>
                      <td className={test.nitrogen_ppm >= 40 ? 'text-success' : test.nitrogen_ppm >= 20 ? 'text-warning' : 'text-danger'}>
                        {test.nitrogen_ppm || 0}
                      </td>
                      <td className={test.phosphorus_ppm >= 20 ? 'text-success' : test.phosphorus_ppm >= 10 ? 'text-warning' : 'text-danger'}>
                        {test.phosphorus_ppm || 0}
                      </td>
                      <td className={test.potassium_ppm >= 150 ? 'text-success' : test.potassium_ppm >= 100 ? 'text-warning' : 'text-danger'}>
                        {test.potassium_ppm || 0}
                      </td>
                      <td className="fw-bold">{test.nutrientScore.toFixed(0)}%</td>
                      <td><span className={`badge bg-${test.healthColor}`}>{test.overallHealth}</span></td>
                      <td>₦{(test.test_cost_ngn / 1000).toFixed(0)}K</td>
                      {token && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-warning" onClick={() => {
                              setEditingTest(test.tests_id);
                              setFormData({
                                nitrogen_ppm: test.nitrogen_ppm || '',
                                phosphorus_ppm: test.phosphorus_ppm || '',
                                potassium_ppm: test.potassium_ppm || '',
                                test_date: test.test_date || '',
                                test_cost_ngn: test.test_cost_ngn || '',
                                lab_name: test.lab_name || '',
                                soil_zones_id: test.soil_zones_id?.soil_zones_id || ''
                              });
                              setShowAddModal(true);
                            }}>Edit</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(test.tests_id)}>Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr className="fw-bold">
                    <td colSpan="4" className="text-end">Averages:</td>
                    <td>{(filteredTests.reduce((sum, t) => sum + (t.nitrogen_ppm || 0), 0) / filteredTests.length || 0).toFixed(0)} ppm</td>
                    <td>{(filteredTests.reduce((sum, t) => sum + (t.phosphorus_ppm || 0), 0) / filteredTests.length || 0).toFixed(0)} ppm</td>
                    <td>{(filteredTests.reduce((sum, t) => sum + (t.potassium_ppm || 0), 0) / filteredTests.length || 0).toFixed(0)} ppm</td>
                    <td colSpan={token ? 4 : 3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">{editingTest ? 'Edit Soil Test' : 'Add New Soil Test'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddEdit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Soil Zone *</label>
                    <select className="form-select" value={formData.soil_zones_id} onChange={(e) => setFormData({...formData, soil_zones_id: e.target.value})} required>
                      <option value="">Select Zone</option>
                      {soilZones.map(zone => {
                        const block = farmBlocks.find(b => b.farm_blocks_id === zone.farm_blocks_id?.farm_blocks_id);
                        return (
                          <option key={zone.soil_zones_id} value={zone.soil_zones_id}>
                            {block?.block_name || `Zone ${zone.soil_zones_id}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Nitrogen (ppm)</label>
                      <input type="number" className="form-control" value={formData.nitrogen_ppm}
                        onChange={(e) => setFormData({...formData, nitrogen_ppm: e.target.value})} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Phosphorus (ppm)</label>
                      <input type="number" className="form-control" value={formData.phosphorus_ppm}
                        onChange={(e) => setFormData({...formData, phosphorus_ppm: e.target.value})} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Potassium (ppm)</label>
                      <input type="number" className="form-control" value={formData.potassium_ppm}
                        onChange={(e) => setFormData({...formData, potassium_ppm: e.target.value})} />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Test Date *</label>
                      <input type="date" className="form-control" value={formData.test_date}
                        onChange={(e) => setFormData({...formData, test_date: e.target.value})} required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Test Cost (₦)</label>
                      <input type="number" step="0.01" className="form-control" value={formData.test_cost_ngn}
                        onChange={(e) => setFormData({...formData, test_cost_ngn: e.target.value})} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Laboratory Name</label>
                    <input type="text" className="form-control" value={formData.lab_name}
                      onChange={(e) => setFormData({...formData, lab_name: e.target.value})} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Save Test</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Soil Test Details Modal */}
      {selectedTest && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Soil Test Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedTest(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>📋 Test Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Test ID:</th><td>{selectedTest.tests_id}</td></tr>
                        <tr><th>Date:</th><td>{selectedTest.test_date}</td></tr>
                        <tr><th>Lab:</th><td>{selectedTest.lab_name || 'N/A'}</td></tr>
                        <tr><th>Cost:</th><td>₦{selectedTest.test_cost_ngn?.toLocaleString()}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>📍 Location</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Zone:</th><td>{selectedTest.zone?.soil_type || 'Unknown'}</td></tr>
                        <tr><th>Block:</th><td>{selectedTest.block?.block_name}</td></tr>
                        <tr><th>Farm:</th><td>{selectedTest.farm?.farm_name}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <hr />
                <h6>🧪 Nutrient Analysis</h6>
                <div className="row text-center">
                  <div className="col-4">
                    <div className="bg-light p-2 rounded">
                      <small>🌱 Nitrogen</small>
                      <h4 className={selectedTest.nitrogen_ppm >= 40 ? 'text-success' : selectedTest.nitrogen_ppm >= 20 ? 'text-warning' : 'text-danger'}>
                        {selectedTest.nitrogen_ppm || 0} ppm
                      </h4>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="bg-light p-2 rounded">
                      <small>🫘 Phosphorus</small>
                      <h4 className={selectedTest.phosphorus_ppm >= 20 ? 'text-success' : selectedTest.phosphorus_ppm >= 10 ? 'text-warning' : 'text-danger'}>
                        {selectedTest.phosphorus_ppm || 0} ppm
                      </h4>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="bg-light p-2 rounded">
                      <small>🍌 Potassium</small>
                      <h4 className={selectedTest.potassium_ppm >= 150 ? 'text-success' : selectedTest.potassium_ppm >= 100 ? 'text-warning' : 'text-danger'}>
                        {selectedTest.potassium_ppm || 0} ppm
                      </h4>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="progress" style={{ height: '20px' }}>
                    <div className={`progress-bar bg-${selectedTest.healthColor}`} style={{ width: `${selectedTest.nutrientScore}%` }}>
                      {selectedTest.nutrientScore.toFixed(0)}% - {selectedTest.overallHealth}
                    </div>
                  </div>
                </div>
                {selectedTest.farm && (
                  <>
                    <hr />
                    <h6>🏠 Farm Details</h6>
                    <Link to={`/farm/${selectedTest.farm.farms_id}`} className="text-decoration-none">
                      <div className="bg-light p-2 rounded">
                        <strong>{selectedTest.farm.farm_name}</strong><br />
                        {selectedTest.farm.state}, {selectedTest.farm.lga}
                      </div>
                    </Link>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedTest(null)}>Close</button>
                {selectedTest.farm && (
                  <Link to={`/farm/${selectedTest.farm.farms_id}`} className="btn btn-success">View Farm →</Link>
                )}
                {token && (
                  <button className="btn btn-warning" onClick={() => {
                    setSelectedTest(null);
                    setEditingTest(selectedTest.tests_id);
                    setFormData({
                      nitrogen_ppm: selectedTest.nitrogen_ppm || '',
                      phosphorus_ppm: selectedTest.phosphorus_ppm || '',
                      potassium_ppm: selectedTest.potassium_ppm || '',
                      test_date: selectedTest.test_date || '',
                      test_cost_ngn: selectedTest.test_cost_ngn || '',
                      lab_name: selectedTest.lab_name || '',
                      soil_zones_id: selectedTest.soil_zones_id?.soil_zones_id || ''
                    });
                    setShowAddModal(true);
                  }}>Edit Test</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}