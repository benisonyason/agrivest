import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, ComposedChart, Line
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PlantingsList() {
  const [plantings, setPlantings] = useState([]);
  const [crops, setCrops] = useState([]);
  const [farmBlocks, setFarmBlocks] = useState([]);
  const [farms, setFarms] = useState([]);
  const [yields, setYields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedPlanting, setSelectedPlanting] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [formData, setFormData] = useState({
    planting_date: '',
    expected_harvest: '',
    seed_quantity_kg: '',
    planting_cost_ngn: '',
    plant_spacing_cm: '',
    row_spacing_cm: '',
    farm_blocks_id: '',
    crops_id: ''
  });
  
  const { token } = useAuth();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching plantings data...');
        const [plantingsRes, cropsRes, blocksRes, farmsRes, yieldsRes] = await Promise.all([
          api.get('/plantings/'),
          api.get('/crops/'),
          api.get('/farmblocks/'),
          api.get('/farms/'),
          api.get('/yields/')
        ]);
        
        setPlantings(Array.isArray(plantingsRes.data) ? plantingsRes.data : (plantingsRes.data?.results || []));
        setCrops(Array.isArray(cropsRes.data) ? cropsRes.data : (cropsRes.data?.results || []));
        setFarmBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : (blocksRes.data?.results || []));
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
        setYields(Array.isArray(yieldsRes.data) ? yieldsRes.data : (yieldsRes.data?.results || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load plantings data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Enrich plantings with related data
  const enrichedPlantings = plantings.map(planting => {
    const crop = crops.find(c => c.crops_id === planting.crops_id?.crops_id);
    const block = farmBlocks.find(b => b.farm_blocks_id === planting.farm_blocks_id?.farm_blocks_id);
    const farm = block ? farms.find(f => f.farms_id === block.farms_id?.farms_id) : null;
    
    const plantingYields = yields.filter(y => y.plantings_id?.plantings_id === planting.plantings_id);
    const totalYield = plantingYields.reduce((sum, y) => sum + (y.yield_tons || 0), 0);
    const harvestCount = plantingYields.length;
    const hasHarvested = harvestCount > 0;
    
    const today = new Date();
    const expectedDate = planting.expected_harvest ? new Date(planting.expected_harvest) : null;
    const daysToHarvest = expectedDate ? Math.ceil((expectedDate - today) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue = expectedDate && expectedDate < today && !hasHarvested;
    const daysOverdue = isOverdue ? Math.abs(daysToHarvest) : 0;
    
    let progressStatus = '';
    let progressColor = '';
    if (hasHarvested) {
      progressStatus = 'Harvested';
      progressColor = 'success';
    } else if (isOverdue) {
      progressStatus = 'Overdue';
      progressColor = 'danger';
    } else if (daysToHarvest && daysToHarvest <= 7) {
      progressStatus = 'Ready Soon';
      progressColor = 'warning';
    } else {
      progressStatus = 'Growing';
      progressColor = 'info';
    }
    
    const estimatedRevenue = totalYield > 0 ? totalYield * 300000 : 0;
    
    return {
      ...planting,
      crop,
      block,
      farm,
      totalYield,
      harvestCount,
      hasHarvested,
      daysToHarvest,
      isOverdue,
      daysOverdue,
      progressStatus,
      progressColor,
      estimatedRevenue
    };
  });

  // Filter plantings
  const filteredPlantings = enrichedPlantings.filter(planting => {
    const matchesSearch = searchTerm === '' || 
      (planting.crop?.crop_name && planting.crop.crop_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (planting.block?.block_name && planting.block.block_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (planting.farm?.farm_name && planting.farm.farm_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCrop = selectedCrop === '' || planting.crops_id?.crops_id?.toString() === selectedCrop;
    const matchesFarm = selectedFarm === '' || planting.farm?.farms_id?.toString() === selectedFarm;
    const matchesBlock = selectedBlock === '' || planting.farm_blocks_id?.farm_blocks_id?.toString() === selectedBlock;
    
    const matchesDate = (!dateRange.start || (planting.planting_date && planting.planting_date >= dateRange.start)) &&
                        (!dateRange.end || (planting.planting_date && planting.planting_date <= dateRange.end));
    
    return matchesSearch && matchesCrop && matchesFarm && matchesBlock && matchesDate;
  });

  // Statistics
  const totalPlantings = plantings.length;
  const harvestedPlantings = enrichedPlantings.filter(p => p.hasHarvested).length;
  const activePlantings = totalPlantings - harvestedPlantings;
  const overduePlantings = enrichedPlantings.filter(p => p.isOverdue && !p.hasHarvested).length;
  
  const totalSeedQuantity = plantings.reduce((sum, p) => sum + (p.seed_quantity_kg || 0), 0);
  const totalPlantingCost = plantings.reduce((sum, p) => sum + (p.planting_cost_ngn || 0), 0);
  const totalYieldAll = enrichedPlantings.reduce((sum, p) => sum + p.totalYield, 0);
  
  // Plantings by crop
  const plantingsByCrop = {};
  enrichedPlantings.forEach(p => {
    const cropName = p.crop?.crop_name || 'Unknown';
    plantingsByCrop[cropName] = (plantingsByCrop[cropName] || 0) + 1;
  });
  const cropChartData = Object.entries(plantingsByCrop)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Monthly planting trends
  const monthlyPlantings = {};
  plantings.forEach(p => {
    if (p.planting_date) {
      const month = p.planting_date.slice(0, 7);
      if (!monthlyPlantings[month]) {
        monthlyPlantings[month] = { month, count: 0, cost: 0 };
      }
      monthlyPlantings[month].count += 1;
      monthlyPlantings[month].cost += p.planting_cost_ngn || 0;
    }
  });
  const monthlyData = Object.values(monthlyPlantings)
    .map(m => ({ ...m, cost: m.cost / 1000000 }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit plantings');
      return;
    }
    
    try {
      if (editingPlanting) {
        await api.put(`/plantings/${editingPlanting}/`, formData);
      } else {
        await api.post('/plantings/', formData);
      }
      setShowAddModal(false);
      setEditingPlanting(null);
      setFormData({
        planting_date: '',
        expected_harvest: '',
        seed_quantity_kg: '',
        planting_cost_ngn: '',
        plant_spacing_cm: '',
        row_spacing_cm: '',
        farm_blocks_id: '',
        crops_id: ''
      });
      const plantingsRes = await api.get('/plantings/');
      setPlantings(Array.isArray(plantingsRes.data) ? plantingsRes.data : (plantingsRes.data?.results || []));
    } catch (err) {
      console.error('Error saving planting:', err);
      alert('Error saving planting');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this planting record?')) return;
    try {
      await api.delete(`/plantings/${id}/`);
      const plantingsRes = await api.get('/plantings/');
      setPlantings(Array.isArray(plantingsRes.data) ? plantingsRes.data : (plantingsRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting planting:', err);
      alert('Error deleting planting');
    }
  };

  const getProgressBadge = (planting) => {
    const { progressStatus, progressColor } = planting;
    const icons = {
      Harvested: '✅',
      Overdue: '⚠️',
      'Ready Soon': '🔔',
      Growing: '🌱'
    };
    return (
      <span className={`badge bg-${progressColor}`}>
        {icons[progressStatus] || '🌱'} {progressStatus}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading plantings data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Plantings</h4>
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
          <h1 className="display-5 mb-0">🌱 Crop Plantings</h1>
          <p className="text-muted">Track all planting events, monitor growth progress, and forecast harvests</p>
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
              setEditingPlanting(null);
              setFormData({
                planting_date: new Date().toISOString().split('T')[0],
                expected_harvest: '',
                seed_quantity_kg: '',
                planting_cost_ngn: '',
                plant_spacing_cm: '',
                row_spacing_cm: '',
                farm_blocks_id: '',
                crops_id: ''
              });
              setShowAddModal(true);
            }}>
              + Record Planting
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
                  <h6 className="card-title">Total Plantings</h6>
                  <h2 className="mb-0">{totalPlantings}</h2>
                  <small>{activePlantings} active • {harvestedPlantings} harvested</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-success h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Yield</h6>
                  <h2 className="mb-0">{totalYieldAll.toFixed(1)} tons</h2>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-warning h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Seed Used</h6>
                  <h2 className="mb-0">{totalSeedQuantity.toFixed(0)} kg</h2>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-danger h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Overdue Harvests</h6>
                  <h2 className="mb-0">{overduePlantings}</h2>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🌾 Plantings by Crop</h5>
                </div>
                <div className="card-body">
                  {cropChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={cropChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {cropChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No planting data available</p>}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">📈 Monthly Planting Trends</h5>
                </div>
                <div className="card-body">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" label={{ value: 'Plantings', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Cost (₦M)', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="count" fill="#82ca9d" name="Number of Plantings" />
                        <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#8884d8" name="Planting Cost (₦M)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No monthly data available</p>}
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
              <input type="text" className="form-control" placeholder="Search by crop, block, or farm..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">🌱 Crop</label>
              <select className="form-select" value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
                <option value="">All Crops</option>
                {crops.map(crop => (
                  <option key={crop.crops_id} value={crop.crops_id}>{crop.crop_name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">🏠 Farm</label>
              <select className="form-select" value={selectedFarm} onChange={(e) => setSelectedFarm(e.target.value)}>
                <option value="">All Farms</option>
                {farms.map(farm => (
                  <option key={farm.farms_id} value={farm.farms_id}>{farm.farm_name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">📦 Block</label>
              <select className="form-select" value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)}>
                <option value="">All Blocks</option>
                {farmBlocks.map(block => (
                  <option key={block.farm_blocks_id} value={block.farm_blocks_id}>{block.block_name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              {(searchTerm || selectedCrop || selectedFarm || selectedBlock || dateRange.start || dateRange.end) && (
                <button className="btn btn-outline-secondary w-100" onClick={() => {
                  setSearchTerm('');
                  setSelectedCrop('');
                  setSelectedFarm('');
                  setSelectedBlock('');
                  setDateRange({ start: '', end: '' });
                }}>Clear Filters</button>
              )}
            </div>
          </div>
          <div className="row g-3 mt-2">
            <div className="col-md-3">
              <label className="form-label">📅 Planting Date From</label>
              <input type="date" className="form-control" value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
            </div>
            <div className="col-md-3">
              <label className="form-label">📅 Planting Date To</label>
              <input type="date" className="form-control" value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="alert alert-info mb-3">
        <strong>Showing {filteredPlantings.length}</strong> of {enrichedPlantings.length} plantings
        <span className="ms-3">🌱 {filteredPlantings.filter(p => !p.hasHarvested).length} active</span>
        <span className="ms-3">✅ {filteredPlantings.filter(p => p.hasHarvested).length} harvested</span>
      </div>

      {/* Plantings Table */}
      {filteredPlantings.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No plantings found</h5>
          <p>Try adjusting your search or filters, or record a new planting.</p>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead className="table-success">
                  <tr>
                    <th>ID</th>
                    <th>Planting Date</th>
                    <th>Crop</th>
                    <th>Farm / Block</th>
                    <th>Seed (kg)</th>
                    <th>Planting Cost</th>
                    <th>Expected Harvest</th>
                    <th>Yield (tons)</th>
                    <th>Status</th>
                    {token && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredPlantings.map(planting => (
                    <tr key={planting.plantings_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPlanting(planting)}>
                      <td>{planting.plantings_id}</td>
                      <td>{planting.planting_date}</td>
                      <td><strong>{planting.crop?.crop_name || 'Unknown'}</strong></td>
                      <td>
                        {planting.block?.block_name}<br />
                        <small className="text-muted">{planting.farm?.farm_name}</small>
                      </td>
                      <td>{planting.seed_quantity_kg || 0} kg</td>
                      <td>₦{(planting.planting_cost_ngn / 1000).toFixed(0)}K</td>
                      <td className={planting.isOverdue ? 'text-danger fw-bold' : ''}>
                        {planting.expected_harvest}
                        {planting.daysToHarvest && !planting.hasHarvested && planting.daysToHarvest > 0 && (
                          <><br/><small>{planting.daysToHarvest} days left</small></>
                        )}
                        {planting.isOverdue && (
                          <><br/><small className="text-danger">Overdue by {planting.daysOverdue} days</small></>
                        )}
                      </td>
                      <td className="text-success fw-bold">
                        {planting.totalYield > 0 ? `${planting.totalYield.toFixed(1)} tons` : '—'}
                      </td>
                      <td>{getProgressBadge(planting)}</td>
                      {token && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-warning" onClick={() => {
                              setEditingPlanting(planting.plantings_id);
                              setFormData({
                                planting_date: planting.planting_date || '',
                                expected_harvest: planting.expected_harvest || '',
                                seed_quantity_kg: planting.seed_quantity_kg || '',
                                planting_cost_ngn: planting.planting_cost_ngn || '',
                                plant_spacing_cm: planting.plant_spacing_cm || '',
                                row_spacing_cm: planting.row_spacing_cm || '',
                                farm_blocks_id: planting.farm_blocks_id?.farm_blocks_id || '',
                                crops_id: planting.crops_id?.crops_id || ''
                              });
                              setShowAddModal(true);
                            }}>Edit</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(planting.plantings_id)}>Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr className="fw-bold">
                    <td colSpan="4" className="text-end">Totals:</td>
                    <td>{filteredPlantings.reduce((sum, p) => sum + (p.seed_quantity_kg || 0), 0).toFixed(0)} kg</td>
                    <td>₦{(filteredPlantings.reduce((sum, p) => sum + (p.planting_cost_ngn || 0), 0) / 1000000).toFixed(2)}M</td>
                    <td colSpan="2">{filteredPlantings.reduce((sum, p) => sum + p.totalYield, 0).toFixed(1)} tons</td>
                    <td colSpan={token ? 2 : 1}></td>
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
                <h5 className="modal-title">{editingPlanting ? 'Edit Planting' : 'Record New Planting'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddEdit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Farm Block *</label>
                    <select className="form-select" value={formData.farm_blocks_id} onChange={(e) => setFormData({...formData, farm_blocks_id: e.target.value})} required>
                      <option value="">Select Block</option>
                      {farmBlocks.map(block => {
                        const farm = farms.find(f => f.farms_id === block.farms_id?.farms_id);
                        return (
                          <option key={block.farm_blocks_id} value={block.farm_blocks_id}>
                            {block.block_name} ({farm?.farm_name}) - {block.area_hectares} ha
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Crop *</label>
                    <select className="form-select" value={formData.crops_id} onChange={(e) => setFormData({...formData, crops_id: e.target.value})} required>
                      <option value="">Select Crop</option>
                      {crops.map(crop => (
                        <option key={crop.crops_id} value={crop.crops_id}>
                          {crop.crop_name} ({crop.season}) - {crop.avg_yield_ton_ha} t/ha avg
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Planting Date *</label>
                      <input type="date" className="form-control" value={formData.planting_date}
                        onChange={(e) => setFormData({...formData, planting_date: e.target.value})} required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Expected Harvest</label>
                      <input type="date" className="form-control" value={formData.expected_harvest}
                        onChange={(e) => setFormData({...formData, expected_harvest: e.target.value})} />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Seed Quantity (kg)</label>
                      <input type="number" step="0.1" className="form-control" value={formData.seed_quantity_kg}
                        onChange={(e) => setFormData({...formData, seed_quantity_kg: e.target.value})} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Planting Cost (₦)</label>
                      <input type="number" step="0.01" className="form-control" value={formData.planting_cost_ngn}
                        onChange={(e) => setFormData({...formData, planting_cost_ngn: e.target.value})} />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Plant Spacing (cm)</label>
                      <input type="number" className="form-control" placeholder="e.g., 25" value={formData.plant_spacing_cm}
                        onChange={(e) => setFormData({...formData, plant_spacing_cm: e.target.value})} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Row Spacing (cm)</label>
                      <input type="number" className="form-control" placeholder="e.g., 75" value={formData.row_spacing_cm}
                        onChange={(e) => setFormData({...formData, row_spacing_cm: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Save Planting</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Planting Details Modal */}
      {selectedPlanting && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Planting Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedPlanting(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>📋 Planting Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Planting ID:</th><td>{selectedPlanting.plantings_id}</td></tr>
                        <tr><th>Planting Date:</th><td>{selectedPlanting.planting_date}</td></tr>
                        <tr><th>Expected Harvest:</th><td>{selectedPlanting.expected_harvest}</td></tr>
                        <tr><th>Seed Quantity:</th><td>{selectedPlanting.seed_quantity_kg} kg</td></tr>
                        <tr><th>Planting Cost:</th><td>₦{selectedPlanting.planting_cost_ngn?.toLocaleString()}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>🌱 Crop & Location</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Crop:</th><td><strong>{selectedPlanting.crop?.crop_name}</strong></td></tr>
                        <tr><th>Block:</th><td>{selectedPlanting.block?.block_name}</td></tr>
                        <tr><th>Farm:</th><td>{selectedPlanting.farm?.farm_name}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <hr />
                <h6>📊 Harvest & Performance</h6>
                <div className="row">
                  <div className="col-md-6">
                    <div className="bg-light p-2 rounded text-center">
                      <small>Total Yield</small>
                      <h4 className="text-success mb-0">{selectedPlanting.totalYield.toFixed(1)} tons</h4>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="bg-light p-2 rounded text-center">
                      <small>Harvest Count</small>
                      <h4 className="mb-0">{selectedPlanting.harvestCount}</h4>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="progress" style={{ height: '20px' }}>
                    <div 
                      className={`progress-bar bg-${selectedPlanting.hasHarvested ? 'success' : (selectedPlanting.isOverdue ? 'danger' : 'info')}`} 
                      style={{ width: `${selectedPlanting.hasHarvested ? 100 : 50}%` }}
                    >
                      {selectedPlanting.hasHarvested ? 'Harvested' : (selectedPlanting.isOverdue ? 'Overdue' : 'In Progress')}
                    </div>
                  </div>
                </div>

                {selectedPlanting.farm && (
                  <>
                    <hr />
                    <h6>🏠 Farm Details</h6>
                    <Link to={`/farm/${selectedPlanting.farm.farms_id}`} className="text-decoration-none">
                      <div className="bg-light p-2 rounded">
                        <strong>{selectedPlanting.farm.farm_name}</strong><br />
                        {selectedPlanting.farm.state}, {selectedPlanting.farm.lga}<br />
                        {selectedPlanting.farm.area_hectares} hectares
                      </div>
                    </Link>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedPlanting(null)}>Close</button>
                {selectedPlanting.farm && (
                  <Link to={`/farm/${selectedPlanting.farm.farms_id}`} className="btn btn-success">View Farm →</Link>
                )}
                {token && (
                  <button className="btn btn-warning" onClick={() => {
                    setSelectedPlanting(null);
                    setEditingPlanting(selectedPlanting.plantings_id);
                    setFormData({
                      planting_date: selectedPlanting.planting_date || '',
                      expected_harvest: selectedPlanting.expected_harvest || '',
                      seed_quantity_kg: selectedPlanting.seed_quantity_kg || '',
                      planting_cost_ngn: selectedPlanting.planting_cost_ngn || '',
                      plant_spacing_cm: selectedPlanting.plant_spacing_cm || '',
                      row_spacing_cm: selectedPlanting.row_spacing_cm || '',
                      farm_blocks_id: selectedPlanting.farm_blocks_id?.farm_blocks_id || '',
                      crops_id: selectedPlanting.crops_id?.crops_id || ''
                    });
                    setShowAddModal(true);
                  }}>Edit Planting</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}