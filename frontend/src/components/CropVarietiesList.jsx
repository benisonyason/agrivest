import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CropVarietiesList() {
  const [crops, setCrops] = useState([]);
  const [plantings, setPlantings] = useState([]);
  const [yields, setYields] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  
  const { token } = useAuth();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching crop data for variety analysis...');
        const [cropsRes, plantingsRes, yieldsRes, diseasesRes] = await Promise.all([
          api.get('/crops/'),
          api.get('/plantings/'),
          api.get('/yields/'),
          api.get('/cropdiseases/')
        ]);
        
        setCrops(Array.isArray(cropsRes.data) ? cropsRes.data : (cropsRes.data?.results || []));
        setPlantings(Array.isArray(plantingsRes.data) ? plantingsRes.data : (plantingsRes.data?.results || []));
        setYields(Array.isArray(yieldsRes.data) ? yieldsRes.data : (yieldsRes.data?.results || []));
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

  // Enrich crops with performance data
  const enrichedCrops = crops.map(crop => {
    const cropPlantings = plantings.filter(p => p.crops_id?.crops_id === crop.crops_id);
    const cropYields = yields.filter(y => cropPlantings.some(p => p.plantings_id === y.plantings_id?.plantings_id));
    
    const totalPlantings = cropPlantings.length;
    const totalYield = cropYields.reduce((sum, y) => sum + (y.yield_tons || 0), 0);
    const avgYield = totalPlantings > 0 ? totalYield / totalPlantings : crop.avg_yield_ton_ha || 0;
    const harvestCount = cropYields.length;
    const totalRevenue = cropYields.reduce((sum, y) => sum + ((y.yield_tons || 0) * 300000), 0);
    
    const cropDiseases = diseases.filter(d => d.crops_id?.crops_id === crop.crops_id);
    const diseaseCount = cropDiseases.length;
    
    let varietyType = '';
    let varietyColor = '';
    if (crop.avg_yield_ton_ha > 8) {
      varietyType = 'High Yield';
      varietyColor = 'success';
    } else if (crop.avg_yield_ton_ha > 5) {
      varietyType = 'Medium Yield';
      varietyColor = 'info';
    } else {
      varietyType = 'Standard Yield';
      varietyColor = 'warning';
    }
    
    let seasonType = '';
    let seasonColor = '';
    if (crop.season === 'WET') {
      seasonType = 'Wet Season';
      seasonColor = 'primary';
    } else if (crop.season === 'DRY') {
      seasonType = 'Dry Season';
      seasonColor = 'warning';
    } else {
      seasonType = 'Perennial';
      seasonColor = 'success';
    }
    
    return {
      ...crop,
      totalPlantings,
      totalYield,
      avgYield,
      harvestCount,
      totalRevenue,
      diseaseCount,
      varietyType,
      varietyColor,
      seasonType,
      seasonColor,
      performanceVsAvg: crop.avg_yield_ton_ha ? ((avgYield - crop.avg_yield_ton_ha) / crop.avg_yield_ton_ha * 100).toFixed(1) : 0
    };
  });

  // Filter crops
  const filteredCrops = enrichedCrops.filter(crop => {
    const matchesSearch = searchTerm === '' || 
      (crop.crop_name && crop.crop_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeason = selectedSeason === '' || crop.season === selectedSeason;
    return matchesSearch && matchesSeason;
  });

  // Statistics
  const totalCrops = crops.length;
  const totalPlantingsAll = plantings.length;
  const totalYieldAll = yields.reduce((sum, y) => sum + (y.yield_tons || 0), 0);
  const totalRevenueAll = yields.reduce((sum, y) => sum + ((y.yield_tons || 0) * 300000), 0);
  const avgYieldPerCrop = totalCrops > 0 ? totalYieldAll / totalCrops : 0;
  
  const cropsBySeason = {
    WET: crops.filter(c => c.season === 'WET').length,
    DRY: crops.filter(c => c.season === 'DRY').length,
    PERENNIAL: crops.filter(c => c.season === 'PERENNIAL').length
  };
  
  const seasonChartData = [
    { name: 'Wet Season', value: cropsBySeason.WET, color: '#007bff' },
    { name: 'Dry Season', value: cropsBySeason.DRY, color: '#ffc107' },
    { name: 'Perennial', value: cropsBySeason.PERENNIAL, color: '#28a745' }
  ].filter(s => s.value > 0);
  
  const topPerformingCrops = [...enrichedCrops]
    .sort((a, b) => b.avgYield - a.avgYield)
    .slice(0, 5);
  
  const mostPlantedCrops = [...enrichedCrops]
    .sort((a, b) => b.totalPlantings - a.totalPlantings)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading crop varieties data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Crop Varieties</h4>
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
          <h1 className="display-5 mb-0">🌱 Crop Varieties & Performance</h1>
          <p className="text-muted">Comprehensive analysis of crop varieties, yields, and performance metrics</p>
        </div>
        <button 
          className={`btn ${showAnalytics ? 'btn-success' : 'btn-outline-success'}`}
          onClick={() => setShowAnalytics(!showAnalytics)}
        >
          {showAnalytics ? 'Hide Analytics' : 'Show Analytics'} 📊
        </button>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <>
          <div className="row mb-4 g-3">
            <div className="col-md-3">
              <div className="card text-white bg-primary h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Crop Varieties</h6>
                  <h2 className="mb-0">{totalCrops}</h2>
                  <small>active varieties</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-success h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Plantings</h6>
                  <h2 className="mb-0">{totalPlantingsAll}</h2>
                  <small>planting events</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-warning h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Yield</h6>
                  <h2 className="mb-0">{totalYieldAll.toFixed(1)} tons</h2>
                  <small>{avgYieldPerCrop.toFixed(1)} t/crop avg</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-info h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Revenue</h6>
                  <h2 className="mb-0">₦{(totalRevenueAll / 1000000).toFixed(1)}M</h2>
                  <small>estimated value</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🌾 Crop Season Distribution</h5>
                </div>
                <div className="card-body">
                  {seasonChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={seasonChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {seasonChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No season data available</p>}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🏆 Top Performing Varieties (Yield)</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-success">
                        <tr><th>Rank</th><th>Variety</th><th>Season</th><th>Avg Yield (t/ha)</th><th>Total Yield</th></tr>
                      </thead>
                      <tbody>
                        {topPerformingCrops.map((crop, i) => (
                          <tr key={i}>
                            <td><span className="badge bg-success">{i + 1}</span></td>
                            <td><strong>{crop.crop_name}</strong></td>
                            <td>{crop.seasonType}</td>
                            <td className="fw-bold">{crop.avgYield.toFixed(1)} t/ha</td>
                            <td className="text-success">{crop.totalYield.toFixed(1)} tons</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-4 g-3">
            <div className="col-md-12">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🌱 Most Planted Varieties</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-success">
                        <tr><th>Variety</th><th>Plantings</th><th>Harvests</th><th>Total Yield</th><th>Avg Yield</th></tr>
                      </thead>
                      <tbody>
                        {mostPlantedCrops.map((crop, i) => (
                          <tr key={i}>
                            <td><strong>{crop.crop_name}</strong></td>
                            <td>{crop.totalPlantings}</td>
                            <td>{crop.harvestCount}</td>
                            <td className="text-success">{crop.totalYield.toFixed(1)} tons</td>
                            <td>{crop.avgYield.toFixed(1)} t/ha</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
            <div className="col-md-6">
              <label className="form-label">🔍 Search Varieties</label>
              <input type="text" className="form-control" placeholder="Search by crop/variety name..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">🌦️ Filter by Season</label>
              <select className="form-select" value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
                <option value="">All Seasons</option>
                <option value="WET">Wet Season</option>
                <option value="DRY">Dry Season</option>
                <option value="PERENNIAL">Perennial</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              {(searchTerm || selectedSeason) && (
                <button className="btn btn-outline-secondary w-100" onClick={() => {
                  setSearchTerm('');
                  setSelectedSeason('');
                }}>Clear Filters</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="alert alert-info mb-3">
        <strong>Showing {filteredCrops.length}</strong> of {enrichedCrops.length} crop varieties
      </div>

      {/* Crop Varieties Grid */}
      {filteredCrops.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No crop varieties found</h5>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="row g-4">
          {filteredCrops.map(crop => (
            <div key={crop.crops_id} className="col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm hover-shadow">
                <div className={`card-header bg-${crop.varietyColor} text-white`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="bi bi-flower1 me-2"></i>
                      {crop.crop_name}
                    </h5>
                    <span className="badge bg-light text-dark">ID: {crop.crops_id}</span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">🌦️ Season:</span>
                      <span className={`badge bg-${crop.seasonColor}`}>{crop.seasonType}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">📊 Variety Type:</span>
                      <span className={`badge bg-${crop.varietyColor}`}>{crop.varietyType}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">💰 Seed Cost:</span>
                      <span className="fw-bold">₦{crop.seed_cost_ngn_per_kg?.toLocaleString()}/kg</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">🦠 Disease Risk:</span>
                      <span>
                        {crop.diseaseCount > 0 ? (
                          <span className="badge bg-warning">{crop.diseaseCount} disease(s)</span>
                        ) : (
                          <span className="badge bg-success">Low Risk</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="bg-light p-2 rounded mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Standard Yield:</small>
                      <strong>{crop.avg_yield_ton_ha} t/ha</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Actual Avg Yield:</small>
                      <strong className="text-success">{crop.avgYield.toFixed(1)} t/ha</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Total Plantings:</small>
                      <strong>{crop.totalPlantings}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <small className="text-muted">Total Harvest:</small>
                      <strong className="text-success">{crop.totalYield.toFixed(1)} tons</strong>
                    </div>
                    {crop.performanceVsAvg !== 0 && (
                      <div className={`mt-2 small ${crop.performanceVsAvg >= 0 ? 'text-success' : 'text-danger'}`}>
                        {crop.performanceVsAvg >= 0 ? '↑' : '↓'} {Math.abs(crop.performanceVsAvg)}% vs standard
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-outline-primary btn-sm flex-grow-1"
                      onClick={() => setSelectedCrop(crop)}
                    >
                      View Details
                    </button>
                    {crop.farms_id && (
                      <Link to={`/farm/${crop.farms_id.farms_id}`} className="btn btn-outline-info btn-sm">
                        Farm
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Crop Details Modal */}
      {selectedCrop && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className={`modal-header bg-${selectedCrop.varietyColor} text-white`}>
                <h5 className="modal-title">Variety Details: {selectedCrop.crop_name}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedCrop(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>📋 Variety Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>ID:</th><td>{selectedCrop.crops_id}</td></tr>
                        <tr><th>Variety Name:</th><td><strong>{selectedCrop.crop_name}</strong></td></tr>
                        <tr><th>Season:</th><td>{selectedCrop.seasonType}</td></tr>
                        <tr><th>Seed Cost:</th><td>₦{selectedCrop.seed_cost_ngn_per_kg?.toLocaleString()}/kg</td></tr>
                        <tr><th>Standard Yield:</th><td>{selectedCrop.avg_yield_ton_ha} t/ha</td></tr>
                        <tr><th>Variety Type:</th><td>{selectedCrop.varietyType}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>📊 Performance Metrics</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Total Plantings:</th><td>{selectedCrop.totalPlantings}</td></tr>
                        <tr><th>Total Harvests:</th><td>{selectedCrop.harvestCount}</td></tr>
                        <tr><th>Total Yield:</th><td className="text-success">{selectedCrop.totalYield.toFixed(1)} tons</td></tr>
                        <tr><th>Average Yield:</th><td className="fw-bold">{selectedCrop.avgYield.toFixed(1)} t/ha</td></tr>
                        <tr><th>Total Revenue:</th><td className="text-success">₦{(selectedCrop.totalRevenue / 1000000).toFixed(2)}M</td></tr>
                        <tr><th>Performance:</th><td className={selectedCrop.performanceVsAvg >= 0 ? 'text-success' : 'text-danger'}>
                          {selectedCrop.performanceVsAvg >= 0 ? '+' : ''}{selectedCrop.performanceVsAvg}% vs standard
                        </td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {selectedCrop.diseaseCount > 0 && (
                  <>
                    <hr />
                    <h6>🦠 Disease Susceptibility</h6>
                    <div className="alert alert-warning">
                      <strong>{selectedCrop.diseaseCount} disease(s)</strong> associated with this variety
                    </div>
                  </>
                )}

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
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedCrop(null)}>Close</button>
                {selectedCrop.farms_id && (
                  <Link to={`/farm/${selectedCrop.farms_id.farms_id}`} className="btn btn-success">View Farm →</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}