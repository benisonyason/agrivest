import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  AreaChart, Area, ComposedChart, Scatter
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function YieldList() {
  const [yields, setYields] = useState([]);
  const [plantings, setPlantings] = useState([]);
  const [crops, setCrops] = useState([]);
  const [farms, setFarms] = useState([]);
  const [farmBlocks, setFarmBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedYield, setSelectedYield] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingYield, setEditingYield] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [chartType, setChartType] = useState('bar');
  const [formData, setFormData] = useState({
    harvest_date: '',
    yield_tons: '',
    harvest_cost_ngn: '',
    quality_grade: '',
    notes: '',
    plantings_id: ''
  });
  
  const { token } = useAuth();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching yield data...');
        const [
          yieldsRes,
          plantingsRes,
          cropsRes,
          farmsRes,
          blocksRes
        ] = await Promise.all([
          api.get('/yields/'),
          api.get('/plantings/'),
          api.get('/crops/'),
          api.get('/farms/'),
          api.get('/farmblocks/')
        ]);
        
        setYields(Array.isArray(yieldsRes.data) ? yieldsRes.data : (yieldsRes.data?.results || []));
        setPlantings(Array.isArray(plantingsRes.data) ? plantingsRes.data : (plantingsRes.data?.results || []));
        setCrops(Array.isArray(cropsRes.data) ? cropsRes.data : (cropsRes.data?.results || []));
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
        setFarmBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : (blocksRes.data?.results || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load yield data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Enrich yields with related data
  const enrichedYields = yields.map(yieldRecord => {
    const planting = plantings.find(p => p.plantings_id === yieldRecord.plantings_id?.plantings_id);
    const crop = planting ? crops.find(c => c.crops_id === planting.crops_id?.crops_id) : null;
    const block = planting ? farmBlocks.find(b => b.farm_blocks_id === planting.farm_blocks_id?.farm_blocks_id) : null;
    const farm = block ? farms.find(f => f.farms_id === block.farms_id?.farms_id) : null;
    
    return {
      ...yieldRecord,
      planting,
      crop,
      block,
      farm,
      revenue: (yieldRecord.yield_tons || 0) * 300000,
      profit: ((yieldRecord.yield_tons || 0) * 300000) - (yieldRecord.harvest_cost_ngn || 0)
    };
  });

  // Filter yields
  const filteredYields = enrichedYields.filter(y => {
    const matchesSearch = searchTerm === '' || 
      (y.crop?.crop_name && y.crop.crop_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (y.farm?.farm_name && y.farm.farm_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFarm = selectedFarm === '' || y.farm?.farms_id?.toString() === selectedFarm;
    const matchesCrop = selectedCrop === '' || y.crop?.crops_id?.toString() === selectedCrop;
    const matchesQuality = selectedQuality === '' || y.quality_grade === selectedQuality;
    
    const matchesDate = (!dateRange.start || (y.harvest_date && y.harvest_date >= dateRange.start)) &&
                        (!dateRange.end || (y.harvest_date && y.harvest_date <= dateRange.end));
    
    return matchesSearch && matchesFarm && matchesCrop && matchesQuality && matchesDate;
  });

  // Analytics Calculations
  const totalYield = enrichedYields.reduce((sum, y) => sum + (y.yield_tons || 0), 0);
  const totalHarvestCost = enrichedYields.reduce((sum, y) => sum + (y.harvest_cost_ngn || 0), 0);
  const totalRevenue = enrichedYields.reduce((sum, y) => sum + y.revenue, 0);
  const totalProfit = enrichedYields.reduce((sum, y) => sum + y.profit, 0);
  const avgYield = enrichedYields.length > 0 ? totalYield / enrichedYields.length : 0;
  const avgProfitPerHarvest = enrichedYields.length > 0 ? totalProfit / enrichedYields.length : 0;
  
  // Yield by crop
  const yieldByCrop = {};
  enrichedYields.forEach(y => {
    const cropName = y.crop?.crop_name || 'Unknown';
    yieldByCrop[cropName] = (yieldByCrop[cropName] || 0) + (y.yield_tons || 0);
  });
  const yieldByCropData = Object.entries(yieldByCrop).map(([name, tons]) => ({ name, tons }));
  
  // Revenue by farm
  const revenueByFarm = {};
  enrichedYields.forEach(y => {
    const farmName = y.farm?.farm_name || 'Unknown';
    revenueByFarm[farmName] = (revenueByFarm[farmName] || 0) + y.revenue;
  });
  const revenueByFarmData = Object.entries(revenueByFarm).map(([name, revenue]) => ({ name, revenue: revenue / 1000000 }));
  
  // Monthly yield trend
  const monthlyData = {};
  enrichedYields.forEach(y => {
    if (y.harvest_date) {
      const month = y.harvest_date.slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { month, yield: 0, revenue: 0, profit: 0, count: 0 };
      }
      monthlyData[month].yield += y.yield_tons || 0;
      monthlyData[month].revenue += y.revenue;
      monthlyData[month].profit += y.profit;
      monthlyData[month].count += 1;
    }
  });
  const monthlyTrendData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  
  // Quality distribution
  const qualityData = {
    PREMIUM: enrichedYields.filter(y => y.quality_grade === 'PREMIUM').length,
    STANDARD: enrichedYields.filter(y => y.quality_grade === 'STANDARD').length,
    BASIC: enrichedYields.filter(y => y.quality_grade === 'BASIC').length,
    REJECT: enrichedYields.filter(y => y.quality_grade === 'REJECT').length
  };
  const qualityChartData = Object.entries(qualityData).map(([grade, count]) => ({ grade, count }));
  
  // Top performing crops
  const topCrops = Object.entries(yieldByCrop)
    .map(([name, tons]) => ({ name, tons }))
    .sort((a, b) => b.tons - a.tons)
    .slice(0, 5);
  
  // Profit margin by crop
  const profitByCrop = {};
  enrichedYields.forEach(y => {
    const cropName = y.crop?.crop_name || 'Unknown';
    if (!profitByCrop[cropName]) {
      profitByCrop[cropName] = { revenue: 0, cost: 0, profit: 0 };
    }
    profitByCrop[cropName].revenue += y.revenue;
    profitByCrop[cropName].cost += y.harvest_cost_ngn || 0;
    profitByCrop[cropName].profit += y.profit;
  });
  const profitMarginData = Object.entries(profitByCrop).map(([name, data]) => ({
    name,
    profit: data.profit / 1000000,
    margin: data.revenue > 0 ? (data.profit / data.revenue * 100).toFixed(1) : 0
  })).sort((a, b) => b.profit - a.profit).slice(0, 5);
  
  // Best harvest month
  const bestMonth = monthlyTrendData.reduce((best, current) => 
    current.yield > best.yield ? current : best, { yield: 0 });
  
  // Recent yields
  const recentYields = [...enrichedYields]
    .sort((a, b) => new Date(b.harvest_date) - new Date(a.harvest_date))
    .slice(0, 10);

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit yields');
      return;
    }
    
    try {
      if (editingYield) {
        await api.put(`/yields/${editingYield}/`, formData);
      } else {
        await api.post('/yields/', formData);
      }
      setShowAddModal(false);
      setEditingYield(null);
      setFormData({
        harvest_date: '',
        yield_tons: '',
        harvest_cost_ngn: '',
        quality_grade: '',
        notes: '',
        plantings_id: ''
      });
      // Refresh data
      const yieldsRes = await api.get('/yields/');
      setYields(Array.isArray(yieldsRes.data) ? yieldsRes.data : (yieldsRes.data?.results || []));
    } catch (err) {
      console.error('Error saving yield:', err);
      alert('Error saving yield');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this yield record?')) return;
    try {
      await api.delete(`/yields/${id}/`);
      const yieldsRes = await api.get('/yields/');
      setYields(Array.isArray(yieldsRes.data) ? yieldsRes.data : (yieldsRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting yield:', err);
      alert('Error deleting yield');
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading yield data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Yields</h4>
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
          <h1 className="display-5 mb-0">📊 Yields & Harvest Analysis</h1>
          <p className="text-muted">Comprehensive harvest tracking with advanced analytics</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className={`btn ${showAnalytics ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'} 📈
          </button>
          {token && (
            <button className="btn btn-success" onClick={() => {
              setEditingYield(null);
              setFormData({
                harvest_date: new Date().toISOString().split('T')[0],
                yield_tons: '',
                harvest_cost_ngn: '',
                quality_grade: 'STANDARD',
                notes: '',
                plantings_id: ''
              });
              setShowAddModal(true);
            }}>
              + Add Harvest Record
            </button>
          )}
        </div>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <>
          {/* Key Metrics Cards */}
          <div className="row mb-4 g-3">
            <div className="col-md-3">
              <div className="card bg-success text-white shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Yield</h6>
                  <h2 className="mb-0">{totalYield.toFixed(1)} tons</h2>
                  <small>from {enrichedYields.length} harvests</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-primary text-white shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Revenue</h6>
                  <h2 className="mb-0">₦{(totalRevenue / 1000000).toFixed(1)}M</h2>
                  <small>₦{(totalRevenue / totalYield).toFixed(0)}/ton avg</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-warning text-white shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Profit</h6>
                  <h2 className="mb-0">₦{(totalProfit / 1000000).toFixed(1)}M</h2>
                  <small>{(totalProfit / totalRevenue * 100).toFixed(1)}% margin</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info text-white shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Avg Yield/Harvest</h6>
                  <h2 className="mb-0">{avgYield.toFixed(1)} tons</h2>
                  <small>₦{(avgProfitPerHarvest / 1000000).toFixed(2)}M avg profit</small>
                </div>
              </div>
            </div>
          </div>

          {/* Key Insight Cards */}
          <div className="row mb-4 g-3">
            <div className="col-md-4">
              <div className="card bg-light shadow-sm">
                <div className="card-body">
                  <h6 className="text-muted">🏆 Best Month</h6>
                  <h3 className="mb-0">{bestMonth.month || 'N/A'}</h3>
                  <span>{bestMonth.yield?.toFixed(1) || 0} tons harvested</span>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light shadow-sm">
                <div className="card-body">
                  <h6 className="text-muted">⭐ Top Quality</h6>
                  <h3 className="mb-0">{qualityData.PREMIUM}</h3>
                  <span>Premium grade harvests</span>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light shadow-sm">
                <div className="card-body">
                  <h6 className="text-muted">💰 Profit per Ton</h6>
                  <h3 className="mb-0">₦{totalYield > 0 ? ((totalProfit / totalYield)).toFixed(0) : 0}</h3>
                  <span>average profit per ton</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">🌽 Yield by Crop</h5>
                  <div className="btn-group btn-group-sm">
                    <button className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setChartType('bar')}>Bar</button>
                    <button className={`btn ${chartType === 'pie' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setChartType('pie')}>Pie</button>
                  </div>
                </div>
                <div className="card-body">
                  {yieldByCropData.length > 0 ? (
                    chartType === 'bar' ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={yieldByCropData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis label={{ value: 'Tons', angle: -90, position: 'insideLeft' }} />
                          <Tooltip formatter={(value) => `${value} tons`} />
                          <Bar dataKey="tons" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={yieldByCropData} dataKey="tons" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {yieldByCropData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} tons`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )
                  ) : (
                    <p className="text-center text-muted">No yield data available</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">💰 Revenue by Farm</h5>
                </div>
                <div className="card-body">
                  {revenueByFarmData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueByFarmData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis label={{ value: 'Millions (₦)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => `₦${value}M`} />
                        <Bar dataKey="revenue" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted">No revenue data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="row mb-4 g-3">
            <div className="col-md-8">
              <div className="card shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">📈 Monthly Harvest Trend</h5>
                </div>
                <div className="card-body">
                  {monthlyTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" label={{ value: 'Tons', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Millions (₦)', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="yield" fill="#82ca9d" name="Yield (tons)" />
                        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue (₦M)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted">No monthly data available</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">⭐ Quality Distribution</h5>
                </div>
                <div className="card-body">
                  {qualityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={qualityChartData} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={80} label>
                          {qualityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted">No quality data</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 3 */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🏆 Top 5 Crops by Yield</h5>
                </div>
                <div className="card-body">
                  {topCrops.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={topCrops} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" label={{ value: 'Tons', position: 'insideBottom' }} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip formatter={(value) => `${value} tons`} />
                        <Bar dataKey="tons" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted">No crop data</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">📊 Profit Margin by Crop</h5>
                </div>
                <div className="card-body">
                  {profitMarginData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={profitMarginData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis yAxisId="left" label={{ value: 'Profit (₦M)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Margin %', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="profit" fill="#82ca9d" name="Profit (₦M)" />
                        <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#ff7300" name="Margin %" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted">No profit data</p>
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
            <div className="col-md-3">
              <label className="form-label">🔍 Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by crop or farm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
              <label className="form-label">🌱 Crop</label>
              <select className="form-select" value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
                <option value="">All Crops</option>
                {crops.map(crop => (
                  <option key={crop.crops_id} value={crop.crops_id}>{crop.crop_name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">⭐ Quality</label>
              <select className="form-select" value={selectedQuality} onChange={(e) => setSelectedQuality(e.target.value)}>
                <option value="">All Grades</option>
                <option value="PREMIUM">Premium</option>
                <option value="STANDARD">Standard</option>
                <option value="BASIC">Basic</option>
                <option value="REJECT">Rejected</option>
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              {(searchTerm || selectedFarm || selectedCrop || selectedQuality || dateRange.start || dateRange.end) && (
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedFarm('');
                    setSelectedCrop('');
                    setSelectedQuality('');
                    setDateRange({ start: '', end: '' });
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          <div className="row g-3 mt-2">
            <div className="col-md-3">
              <label className="form-label">📅 Date From</label>
              <input type="date" className="form-control" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
            </div>
            <div className="col-md-3">
              <label className="form-label">📅 Date To</label>
              <input type="date" className="form-control" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
            </div>
          </div>
        </div>
      </div>

      {/* Filtered Results Summary */}
      <div className="alert alert-info mb-3">
        <strong>Showing {filteredYields.length}</strong> of {enrichedYields.length} harvest records
        {selectedFarm && ` • Farm: ${farms.find(f => f.farms_id?.toString() === selectedFarm)?.farm_name}`}
        {selectedCrop && ` • Crop: ${crops.find(c => c.crops_id?.toString() === selectedCrop)?.crop_name}`}
        {selectedQuality && ` • Quality: ${selectedQuality}`}
      </div>

      {/* Yields Table */}
      {filteredYields.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No harvest records found</h5>
          <p>Try adjusting your search or filters, or add a new harvest record.</p>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead className="table-success">
                  <tr>
                    <th>Date</th>
                    <th>Crop</th>
                    <th>Farm</th>
                    <th>Block</th>
                    <th>Yield (tons)</th>
                    <th>Cost (₦)</th>
                    <th>Revenue (₦)</th>
                    <th>Profit (₦)</th>
                    <th>Quality</th>
                    {token && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredYields.map(yieldRecord => (
                    <tr key={yieldRecord.yields_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedYield(yieldRecord)}>
                      <td>{yieldRecord.harvest_date}</td>
                      <td><strong>{yieldRecord.crop?.crop_name || 'Unknown'}</strong></td>
                      <td>{yieldRecord.farm?.farm_name || 'Unknown'}</td>
                      <td>{yieldRecord.block?.block_name || 'Unknown'}</td>
                      <td className="fw-bold">{yieldRecord.yield_tons?.toFixed(1) || 0}</td>
                      <td>₦{yieldRecord.harvest_cost_ngn?.toLocaleString() || 0}</td>
                      <td className="text-success">₦{(yieldRecord.revenue / 1000000).toFixed(2)}M</td>
                      <td className="text-primary">₦{(yieldRecord.profit / 1000000).toFixed(2)}M</td>
                      <td>
                        <span className={`badge ${yieldRecord.quality_grade === 'PREMIUM' ? 'bg-success' : 
                          yieldRecord.quality_grade === 'STANDARD' ? 'bg-info' : 
                          yieldRecord.quality_grade === 'BASIC' ? 'bg-warning' : 'bg-danger'}`}>
                          {yieldRecord.quality_grade || 'N/A'}
                        </span>
                      </td>
                      {token && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex gap-1">
                            <button 
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => {
                                setEditingYield(yieldRecord.yields_id);
                                setFormData({
                                  harvest_date: yieldRecord.harvest_date || '',
                                  yield_tons: yieldRecord.yield_tons || '',
                                  harvest_cost_ngn: yieldRecord.harvest_cost_ngn || '',
                                  quality_grade: yieldRecord.quality_grade || 'STANDARD',
                                  notes: yieldRecord.notes || '',
                                  plantings_id: yieldRecord.plantings_id?.plantings_id || ''
                                });
                                setShowAddModal(true);
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(yieldRecord.yields_id)}
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr className="fw-bold">
                    <td colSpan="4" className="text-end">Totals:</td>
                    <td>{filteredYields.reduce((sum, y) => sum + (y.yield_tons || 0), 0).toFixed(1)} tons</td>
                    <td>₦{(filteredYields.reduce((sum, y) => sum + (y.harvest_cost_ngn || 0), 0) / 1000000).toFixed(2)}M</td>
                    <td className="text-success">₦{(filteredYields.reduce((sum, y) => sum + y.revenue, 0) / 1000000).toFixed(2)}M</td>
                    <td className="text-primary">₦{(filteredYields.reduce((sum, y) => sum + y.profit, 0) / 1000000).toFixed(2)}M</td>
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
                <h5 className="modal-title">{editingYield ? 'Edit Harvest Record' : 'Add New Harvest Record'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddEdit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Planting *</label>
                    <select
                      className="form-select"
                      value={formData.plantings_id}
                      onChange={(e) => setFormData({...formData, plantings_id: e.target.value})}
                      required
                    >
                      <option value="">Select Planting</option>
                      {plantings.map(planting => {
                        const crop = crops.find(c => c.crops_id === planting.crops_id?.crops_id);
                        const block = farmBlocks.find(b => b.farm_blocks_id === planting.farm_blocks_id?.farm_blocks_id);
                        return (
                          <option key={planting.plantings_id} value={planting.plantings_id}>
                            {crop?.crop_name} - {block?.block_name} ({planting.planting_date})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Harvest Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.harvest_date}
                      onChange={(e) => setFormData({...formData, harvest_date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Yield (tons) *</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={formData.yield_tons}
                      onChange={(e) => setFormData({...formData, yield_tons: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Harvest Cost (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.harvest_cost_ngn}
                      onChange={(e) => setFormData({...formData, harvest_cost_ngn: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Quality Grade</label>
                    <select
                      className="form-select"
                      value={formData.quality_grade}
                      onChange={(e) => setFormData({...formData, quality_grade: e.target.value})}
                    >
                      <option value="PREMIUM">Premium</option>
                      <option value="STANDARD">Standard</option>
                      <option value="BASIC">Basic</option>
                      <option value="REJECT">Rejected</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Save Record</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Yield Details Modal */}
      {selectedYield && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Harvest Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedYield(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>📋 Harvest Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Harvest ID:</th><td>{selectedYield.yields_id}</td></tr>
                        <tr><th>Date:</th><td>{selectedYield.harvest_date}</td></tr>
                        <tr><th>Yield:</th><td className="fw-bold">{selectedYield.yield_tons} tons</td></tr>
                        <tr><th>Cost:</th><td>₦{selectedYield.harvest_cost_ngn?.toLocaleString()}</td></tr>
                        <tr><th>Revenue:</th><td className="text-success">₦{(selectedYield.revenue / 1000000).toFixed(2)}M</td></tr>
                        <tr><th>Profit:</th><td className="text-primary">₦{(selectedYield.profit / 1000000).toFixed(2)}M</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>🌱 Crop Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Crop:</th><td><strong>{selectedYield.crop?.crop_name}</strong></td></tr>
                        <tr><th>Season:</th><td>{selectedYield.crop?.season}</td></tr>
                        <tr><th>Avg Yield:</th><td>{selectedYield.crop?.avg_yield_ton_ha} t/ha</td></tr>
                        <tr><th>Quality:</th><td>
                          <span className={`badge ${selectedYield.quality_grade === 'PREMIUM' ? 'bg-success' : 'bg-secondary'}`}>
                            {selectedYield.quality_grade}
                          </span>
                        </td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <hr />
                <div className="row">
                  <div className="col-md-6">
                    <h6>🏠 Farm Details</h6>
                    <Link to={`/farm/${selectedYield.farm?.farms_id}`} className="text-decoration-none">
                      <div className="bg-light p-2 rounded">
                        <strong>{selectedYield.farm?.farm_name}</strong><br />
                        {selectedYield.farm?.state}, {selectedYield.farm?.lga}<br />
                        {selectedYield.farm?.area_hectares} hectares
                      </div>
                    </Link>
                  </div>
                  <div className="col-md-6">
                    <h6>📦 Block Details</h6>
                    <div className="bg-light p-2 rounded">
                      <strong>{selectedYield.block?.block_name}</strong><br />
                      Area: {selectedYield.block?.area_hectares} hectares<br />
                      Soil Prep: ₦{selectedYield.block?.soil_preparation_cost_ngn?.toLocaleString()}
                    </div>
                  </div>
                </div>
                {selectedYield.notes && (
                  <>
                    <hr />
                    <h6>📝 Notes</h6>
                    <p>{selectedYield.notes}</p>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedYield(null)}>Close</button>
                {selectedYield.farm && (
                  <Link to={`/farm/${selectedYield.farm.farms_id}`} className="btn btn-success">
                    View Farm Details →
                  </Link>
                )}
                {token && (
                  <button 
                    className="btn btn-warning"
                    onClick={() => {
                      setSelectedYield(null);
                      setEditingYield(selectedYield.yields_id);
                      setFormData({
                        harvest_date: selectedYield.harvest_date || '',
                        yield_tons: selectedYield.yield_tons || '',
                        harvest_cost_ngn: selectedYield.harvest_cost_ngn || '',
                        quality_grade: selectedYield.quality_grade || 'STANDARD',
                        notes: selectedYield.notes || '',
                        plantings_id: selectedYield.plantings_id?.plantings_id || ''
                      });
                      setShowAddModal(true);
                    }}
                  >
                    Edit Record
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