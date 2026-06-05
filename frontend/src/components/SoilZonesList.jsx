import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SoilZonesList() {
  const [soilZones, setSoilZones] = useState([]);
  const [soilTests, setSoilTests] = useState([]);
  const [farms, setFarms] = useState([]);
  const [farmBlocks, setFarmBlocks] = useState([]);
  const [crops, setCrops] = useState([]);
  const [yields, setYields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSoilType, setSelectedSoilType] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [phRange, setPhRange] = useState('');
  const [selectedZone, setSelectedZone] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [formData, setFormData] = useState({
    soil_type: '',
    ph: '',
    organic_matter: '',
    farms_id: '',
    farm_blocks_id: ''
  });
  
  const { token } = useAuth();
  const COLORS = ['#d4a574', '#8B4513', '#654321', '#A0522D', '#CD853F', '#DEB887', '#D2B48C', '#BC8F8F'];
  const SOIL_TYPE_COLORS = {
    LOAMY: '#28a745',
    CLAY: '#dc3545',
    SANDY: '#ffc107',
    SILTY: '#17a2b8',
    PEATY: '#6c757d',
    CHALKY: '#fd7e14'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching soil zones data...');
        const [zonesRes, testsRes, farmsRes, blocksRes, cropsRes, yieldsRes] = await Promise.all([
          api.get('/soilzones/'),
          api.get('/soiltests/'),
          api.get('/farms/'),
          api.get('/farmblocks/'),
          api.get('/crops/'),
          api.get('/yields/')
        ]);
        
        setSoilZones(Array.isArray(zonesRes.data) ? zonesRes.data : (zonesRes.data?.results || []));
        setSoilTests(Array.isArray(testsRes.data) ? testsRes.data : (testsRes.data?.results || []));
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
        setFarmBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : (blocksRes.data?.results || []));
        setCrops(Array.isArray(cropsRes.data) ? cropsRes.data : (cropsRes.data?.results || []));
        setYields(Array.isArray(yieldsRes.data) ? yieldsRes.data : (yieldsRes.data?.results || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load soil zones data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Enrich soil zones with related data
  const enrichedZones = soilZones.map(zone => {
    const farm = farms.find(f => f.farms_id === zone.farms_id?.farms_id);
    const block = farmBlocks.find(b => b.farm_blocks_id === zone.farm_blocks_id?.farm_blocks_id);
    const tests = soilTests.filter(t => t.soil_zones_id?.soil_zones_id === zone.soil_zones_id);
    
    let fertilityScore = 0;
    let fertilityStatus = '';
    let fertilityColor = '';
    
    const ph = zone.ph || 0;
    if (ph >= 6.0 && ph <= 7.0) {
      fertilityScore += 40;
    } else if (ph >= 5.5 && ph <= 7.5) {
      fertilityScore += 20;
    } else {
      fertilityScore += 10;
    }
    
    const organicMatter = zone.organic_matter || 0;
    if (organicMatter >= 3) {
      fertilityScore += 40;
    } else if (organicMatter >= 2) {
      fertilityScore += 20;
    } else {
      fertilityScore += 10;
    }
    
    const latestTest = tests.sort((a, b) => new Date(b.test_date) - new Date(a.test_date))[0];
    if (latestTest) {
      const nitrogen = latestTest.nitrogen_ppm || 0;
      const phosphorus = latestTest.phosphorus_ppm || 0;
      const potassium = latestTest.potassium_ppm || 0;
      
      if (nitrogen >= 40) fertilityScore += 10;
      else if (nitrogen >= 20) fertilityScore += 5;
      
      if (phosphorus >= 20) fertilityScore += 10;
      else if (phosphorus >= 10) fertilityScore += 5;
      
      if (potassium >= 150) fertilityScore += 10;
      else if (potassium >= 100) fertilityScore += 5;
    }
    
    if (fertilityScore >= 80) {
      fertilityStatus = 'Excellent';
      fertilityColor = 'success';
    } else if (fertilityScore >= 60) {
      fertilityStatus = 'Good';
      fertilityColor = 'info';
    } else if (fertilityScore >= 40) {
      fertilityStatus = 'Fair';
      fertilityColor = 'warning';
    } else {
      fertilityStatus = 'Poor';
      fertilityColor = 'danger';
    }
    
    const zoneCrops = crops.filter(c => c.farm_blocks_id?.farm_blocks_id === zone.farm_blocks_id?.farm_blocks_id);
    const zoneYields = yields.filter(y => {
      const planting = y.plantings_id;
      return planting?.farm_blocks_id?.farm_blocks_id === zone.farm_blocks_id?.farm_blocks_id;
    });
    const totalYield = zoneYields.reduce((sum, y) => sum + (y.yield_tons || 0), 0);
    
    let phRecommendation = '';
    if (ph < 5.5) {
      phRecommendation = 'Add lime to increase pH';
    } else if (ph < 6.0) {
      phRecommendation = 'Slightly acidic - Consider liming';
    } else if (ph <= 7.0) {
      phRecommendation = 'Optimal range - Maintain current practices';
    } else if (ph <= 7.5) {
      phRecommendation = 'Slightly alkaline - Monitor sulfur levels';
    } else {
      phRecommendation = 'Alkaline - Add organic matter or sulfur';
    }
    
    let omRecommendation = '';
    if (organicMatter < 2) {
      omRecommendation = 'Low - Add compost or cover crops';
    } else if (organicMatter < 3) {
      omRecommendation = 'Moderate - Maintain with organic amendments';
    } else {
      omRecommendation = 'Good - Continue current practices';
    }
    
    const testCount = tests.length;
    const lastTestDate = tests[0]?.test_date;
    
    return {
      ...zone,
      farm,
      block,
      tests,
      testCount,
      lastTestDate,
      fertilityScore,
      fertilityStatus,
      fertilityColor,
      totalYield,
      zoneCrops: zoneCrops.length,
      phRecommendation,
      omRecommendation,
      latestTest
    };
  });

  const filteredZones = enrichedZones.filter(zone => {
    const matchesSearch = searchTerm === '' || 
      (zone.soil_type && zone.soil_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (zone.block?.block_name && zone.block.block_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (zone.farm?.farm_name && zone.farm.farm_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSoilType = selectedSoilType === '' || zone.soil_type === selectedSoilType;
    const matchesFarm = selectedFarm === '' || zone.farms_id?.farms_id?.toString() === selectedFarm;
    
    const matchesPh = phRange === '' || 
      (phRange === 'acidic' && zone.ph < 6.0) ||
      (phRange === 'optimal' && zone.ph >= 6.0 && zone.ph <= 7.0) ||
      (phRange === 'alkaline' && zone.ph > 7.0);
    
    return matchesSearch && matchesSoilType && matchesFarm && matchesPh;
  });

  const totalZones = soilZones.length;
  const totalFarmsWithZones = [...new Set(soilZones.map(z => z.farms_id?.farms_id).filter(Boolean))].length;
  const totalBlocksWithZones = [...new Set(soilZones.map(z => z.farm_blocks_id?.farm_blocks_id).filter(Boolean))].length;
  const totalTests = soilTests.length;
  
  const soilTypeDistribution = {};
  soilZones.forEach(z => {
    if (z.soil_type) {
      soilTypeDistribution[z.soil_type] = (soilTypeDistribution[z.soil_type] || 0) + 1;
    }
  });
  const soilTypeData = Object.entries(soilTypeDistribution).map(([type, count]) => ({ 
    type: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
    count 
  }));
  
  const phDistribution = {
    'Acidic (<6.0)': soilZones.filter(z => z.ph < 6.0).length,
    'Optimal (6.0-7.0)': soilZones.filter(z => z.ph >= 6.0 && z.ph <= 7.0).length,
    'Alkaline (>7.0)': soilZones.filter(z => z.ph > 7.0).length
  };
  const phData = Object.entries(phDistribution).map(([range, count]) => ({ range, count }));
  
  const omDistribution = {
    'Low (<2%)': soilZones.filter(z => z.organic_matter < 2).length,
    'Moderate (2-3%)': soilZones.filter(z => z.organic_matter >= 2 && z.organic_matter < 3).length,
    'Good (>3%)': soilZones.filter(z => z.organic_matter >= 3).length
  };
  const omData = Object.entries(omDistribution).map(([level, count]) => ({ level, count }));
  
  const avgPhByType = {};
  soilZones.forEach(z => {
    if (z.soil_type && z.ph) {
      if (!avgPhByType[z.soil_type]) {
        avgPhByType[z.soil_type] = { sum: 0, count: 0 };
      }
      avgPhByType[z.soil_type].sum += z.ph;
      avgPhByType[z.soil_type].count += 1;
    }
  });
  const avgPhData = Object.entries(avgPhByType).map(([type, data]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
    avgPh: (data.sum / data.count).toFixed(1)
  }));
  
  const fertilityDistribution = {
    Excellent: enrichedZones.filter(z => z.fertilityStatus === 'Excellent').length,
    Good: enrichedZones.filter(z => z.fertilityStatus === 'Good').length,
    Fair: enrichedZones.filter(z => z.fertilityStatus === 'Fair').length,
    Poor: enrichedZones.filter(z => z.fertilityStatus === 'Poor').length
  };
  const fertilityData = Object.entries(fertilityDistribution).map(([status, count]) => ({ status, count }));
  
  const zonesNeedingAttention = enrichedZones
    .filter(z => z.fertilityStatus === 'Poor' || z.fertilityStatus === 'Fair')
    .slice(0, 5);

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit soil zones');
      return;
    }
    
    try {
      if (editingZone) {
        await api.put(`/soilzones/${editingZone}/`, formData);
      } else {
        await api.post('/soilzones/', formData);
      }
      setShowAddModal(false);
      setEditingZone(null);
      setFormData({
        soil_type: '',
        ph: '',
        organic_matter: '',
        farms_id: '',
        farm_blocks_id: ''
      });
      const zonesRes = await api.get('/soilzones/');
      setSoilZones(Array.isArray(zonesRes.data) ? zonesRes.data : (zonesRes.data?.results || []));
    } catch (err) {
      console.error('Error saving soil zone:', err);
      alert('Error saving soil zone');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this soil zone?')) return;
    try {
      await api.delete(`/soilzones/${id}/`);
      const zonesRes = await api.get('/soilzones/');
      setSoilZones(Array.isArray(zonesRes.data) ? zonesRes.data : (zonesRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting soil zone:', err);
      alert('Error deleting soil zone');
    }
  };

  const getSoilTypeBadge = (type) => {
    const icons = {
      LOAMY: '🌱',
      CLAY: '🧱',
      SANDY: '🏜️',
      SILTY: '💧',
      PEATY: '🌿',
      CHALKY: '🪨'
    };
    return (
      <span className={`badge bg-secondary`}>
        {icons[type] || '🪴'} {type?.charAt(0).toUpperCase() + type?.slice(1).toLowerCase()}
      </span>
    );
  };

  const getPhStatusBadge = (ph) => {
    if (ph < 6.0) return <span className="badge bg-danger">🔴 Acidic (Needs Lime)</span>;
    if (ph <= 7.0) return <span className="badge bg-success">🟢 Optimal</span>;
    return <span className="badge bg-warning text-dark">🟡 Alkaline</span>;
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading soil zones data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Soil Zones</h4>
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
          <h1 className="display-5 mb-0">🧪 Soil Zones Analysis</h1>
          <p className="text-muted">Comprehensive soil health monitoring and fertility management</p>
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
              setEditingZone(null);
              setFormData({
                soil_type: '',
                ph: '',
                organic_matter: '',
                farms_id: '',
                farm_blocks_id: ''
              });
              setShowAddModal(true);
            }}>
              + Add Soil Zone
            </button>
          )}
        </div>
      </div>

      {/* Analytics Dashboard - Simplified for brevity, but functional */}
      {showAnalytics && (
        <div className="row mb-4 g-3">
          <div className="col-md-3">
            <div className="card text-white bg-primary h-100 shadow-sm">
              <div className="card-body">
                <h6 className="card-title">Total Soil Zones</h6>
                <h2 className="mb-0">{totalZones}</h2>
                <small>{totalFarmsWithZones} farms • {totalBlocksWithZones} blocks</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-success h-100 shadow-sm">
              <div className="card-body">
                <h6 className="card-title">Soil Tests</h6>
                <h2 className="mb-0">{totalTests}</h2>
                <small>laboratory analyses</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-info h-100 shadow-sm">
              <div className="card-body">
                <h6 className="card-title">Optimal pH Zones</h6>
                <h2 className="mb-0">{phDistribution['Optimal (6.0-7.0)']}</h2>
                <small>ideal soil conditions</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-warning h-100 shadow-sm">
              <div className="card-body">
                <h6 className="card-title">Need Attention</h6>
                <h2 className="mb-0">{fertilityDistribution.Poor + fertilityDistribution.Fair}</h2>
                <small>low fertility zones</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">🔍 Search</label>
              <input type="text" className="form-control" placeholder="Search by soil type, block, or farm..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">🌱 Soil Type</label>
              <select className="form-select" value={selectedSoilType} onChange={(e) => setSelectedSoilType(e.target.value)}>
                <option value="">All Types</option>
                <option value="LOAMY">Loamy</option>
                <option value="CLAY">Clay</option>
                <option value="SANDY">Sandy</option>
                <option value="SILTY">Silty</option>
                <option value="PEATY">Peaty</option>
                <option value="CHALKY">Chalky</option>
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
              <label className="form-label">⚖️ pH Range</label>
              <select className="form-select" value={phRange} onChange={(e) => setPhRange(e.target.value)}>
                <option value="">All</option>
                <option value="acidic">Acidic (&lt;6.0)</option>
                <option value="optimal">Optimal (6.0-7.0)</option>
                <option value="alkaline">Alkaline (&gt;7.0)</option>
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              {(searchTerm || selectedSoilType || selectedFarm || phRange) && (
                <button className="btn btn-outline-secondary w-100" onClick={() => {
                  setSearchTerm('');
                  setSelectedSoilType('');
                  setSelectedFarm('');
                  setPhRange('');
                }}>Clear Filters</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="alert alert-info mb-3">
        <strong>Showing {filteredZones.length}</strong> of {enrichedZones.length} soil zones
      </div>

      {/* Soil Zones Grid */}
      {filteredZones.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No soil zones found</h5>
          <p>Try adjusting your search or filters, or add a new soil zone.</p>
        </div>
      ) : (
        <div className="row g-4">
          {filteredZones.map(zone => (
            <div key={zone.soil_zones_id} className="col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm">
                <div className={`card-header bg-${zone.fertilityColor} text-white`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      {zone.block?.block_name || `Zone ${zone.soil_zones_id}`}
                    </h5>
                  </div>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">🏠 Farm:</span>
                      <span>{zone.farm?.farm_name || 'Unknown'}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">🌱 Soil Type:</span>
                      <span>{getSoilTypeBadge(zone.soil_type)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">⚖️ pH Level:</span>
                      <span>{getPhStatusBadge(zone.ph)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">🌿 Organic Matter:</span>
                      <span className="fw-bold">{zone.organic_matter}%</span>
                    </div>
                  </div>
                  <div className="bg-light p-2 rounded mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Fertility Score:</small>
                      <strong className={`text-${zone.fertilityColor}`}>{zone.fertilityScore}% - {zone.fertilityStatus}</strong>
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                      <div className={`progress-bar bg-${zone.fertilityColor}`} style={{ width: `${zone.fertilityScore}%` }}></div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-outline-primary btn-sm flex-grow-1"
                      onClick={() => setSelectedZone(zone)}
                    >
                      View Details
                    </button>
                    {zone.farm && (
                      <Link to={`/farm/${zone.farm.farms_id}`} className="btn btn-outline-info btn-sm">
                        Farm
                      </Link>
                    )}
                    {token && (
                      <>
                        <button className="btn btn-outline-warning btn-sm" onClick={() => {
                          setEditingZone(zone.soil_zones_id);
                          setFormData({
                            soil_type: zone.soil_type || '',
                            ph: zone.ph || '',
                            organic_matter: zone.organic_matter || '',
                            farms_id: zone.farms_id?.farms_id || '',
                            farm_blocks_id: zone.farm_blocks_id?.farm_blocks_id || ''
                          });
                          setShowAddModal(true);
                        }}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(zone.soil_zones_id)}>Del</button>
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
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">{editingZone ? 'Edit Soil Zone' : 'Add New Soil Zone'}</h5>
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
                    <label className="form-label">Soil Type</label>
                    <select className="form-select" value={formData.soil_type} onChange={(e) => setFormData({...formData, soil_type: e.target.value})}>
                      <option value="">Select Soil Type</option>
                      <option value="LOAMY">Loamy</option>
                      <option value="CLAY">Clay</option>
                      <option value="SANDY">Sandy</option>
                      <option value="SILTY">Silty</option>
                      <option value="PEATY">Peaty</option>
                      <option value="CHALKY">Chalky</option>
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">pH Level</label>
                      <input type="number" step="0.1" className="form-control" placeholder="e.g., 6.5" value={formData.ph}
                        onChange={(e) => setFormData({...formData, ph: e.target.value})} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Organic Matter (%)</label>
                      <input type="number" step="0.1" className="form-control" placeholder="e.g., 3.5" value={formData.organic_matter}
                        onChange={(e) => setFormData({...formData, organic_matter: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Save Soil Zone</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Soil Zone Details Modal */}
      {selectedZone && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className={`modal-header bg-${selectedZone.fertilityColor} text-white`}>
                <h5 className="modal-title">Soil Zone Details: {selectedZone.block?.block_name}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedZone(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>📋 Zone Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Zone ID:</th><td>{selectedZone.soil_zones_id}</td></tr>
                        <tr><th>Block:</th><td>{selectedZone.block?.block_name}</td></tr>
                        <tr><th>Farm:</th><td>{selectedZone.farm?.farm_name}</td></tr>
                        <tr><th>Soil Type:</th><td>{getSoilTypeBadge(selectedZone.soil_type)}</td></tr>
                        <tr><th>pH Level:</th><td>{getPhStatusBadge(selectedZone.ph)}</td></tr>
                        <tr><th>Organic Matter:</th><td className="fw-bold">{selectedZone.organic_matter}%</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>🧪 Fertility Analysis</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Fertility Score:</th><td className={`text-${selectedZone.fertilityColor} fw-bold`}>
                          {selectedZone.fertilityScore}% - {selectedZone.fertilityStatus}
                        </td></tr>
                        <tr><th>Soil Tests:</th><td>{selectedZone.testCount}</td></tr>
                        <tr><th>Last Test:</th><td>{selectedZone.lastTestDate || 'No tests'}</td></tr>
                        <tr><th>Crops Grown:</th><td>{selectedZone.zoneCrops}</td></tr>
                        <tr><th>Total Yield:</th><td className="text-success">{selectedZone.totalYield.toFixed(1)} tons</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <hr />
                <h6>📋 Recommendations</h6>
                <div className="alert alert-info">
                  <strong>pH Recommendation:</strong> {selectedZone.phRecommendation}<br />
                  <strong>Organic Matter Recommendation:</strong> {selectedZone.omRecommendation}
                </div>
                {selectedZone.latestTest && (
                  <>
                    <hr />
                    <h6>🔬 Latest Soil Test Results</h6>
                    <div className="row text-center">
                      <div className="col-4">
                        <div className="bg-light p-2 rounded">
                          <small>Nitrogen (ppm)</small>
                          <h5 className={selectedZone.latestTest.nitrogen_ppm >= 40 ? 'text-success' : 'text-warning'}>
                            {selectedZone.latestTest.nitrogen_ppm || 0}
                          </h5>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="bg-light p-2 rounded">
                          <small>Phosphorus (ppm)</small>
                          <h5 className={selectedZone.latestTest.phosphorus_ppm >= 20 ? 'text-success' : 'text-warning'}>
                            {selectedZone.latestTest.phosphorus_ppm || 0}
                          </h5>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="bg-light p-2 rounded">
                          <small>Potassium (ppm)</small>
                          <h5 className={selectedZone.latestTest.potassium_ppm >= 150 ? 'text-success' : 'text-warning'}>
                            {selectedZone.latestTest.potassium_ppm || 0}
                          </h5>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {selectedZone.farm && (
                  <>
                    <hr />
                    <h6>🏠 Farm Details</h6>
                    <Link to={`/farm/${selectedZone.farm.farms_id}`} className="text-decoration-none">
                      <div className="bg-light p-2 rounded">
                        <strong>{selectedZone.farm.farm_name}</strong><br />
                        {selectedZone.farm.state}, {selectedZone.farm.lga}<br />
                        {selectedZone.farm.area_hectares} hectares
                      </div>
                    </Link>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedZone(null)}>Close</button>
                {selectedZone.farm && (
                  <Link to={`/farm/${selectedZone.farm.farms_id}`} className="btn btn-success">View Farm →</Link>
                )}
                {token && (
                  <button className="btn btn-warning" onClick={() => {
                    setSelectedZone(null);
                    setEditingZone(selectedZone.soil_zones_id);
                    setFormData({
                      soil_type: selectedZone.soil_type || '',
                      ph: selectedZone.ph || '',
                      organic_matter: selectedZone.organic_matter || '',
                      farms_id: selectedZone.farms_id?.farms_id || '',
                      farm_blocks_id: selectedZone.farm_blocks_id?.farm_blocks_id || ''
                    });
                    setShowAddModal(true);
                  }}>Edit Zone</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}