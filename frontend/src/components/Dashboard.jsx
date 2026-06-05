import { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
  LineChart, Line, ComposedChart, Scatter, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
  // State for all data
  const [farms, setFarms] = useState([]);
  const [farmBlocks, setFarmBlocks] = useState([]);
  const [investors, setInvestors] = useState([]); // Renamed from farmers
  const [workers, setWorkers] = useState([]);
  const [crops, setCrops] = useState([]);
  const [yields, setYields] = useState([]);
  const [plantings, setPlantings] = useState([]);
  const [soilZones, setSoilZones] = useState([]);
  const [investments, setInvestments] = useState([]); // Renamed from loans
  const [financialSummary, setFinancialSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [chartView, setChartView] = useState('bar'); // 'bar', 'pie', 'radar'
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#e6a756'];

  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        console.log('Fetching dashboard data...');
        
        const [
          farmsRes,
          blocksRes,
          investorsRes,
          workersRes,
          cropsRes,
          yieldsRes,
          plantingsRes,
          soilRes,
          investmentsRes,
          financialRes
        ] = await Promise.all([
          api.get('/farms/'),
          api.get('/farmblocks/'),
          api.get('/farmers/'),  // This is the investors table
          api.get('/farmworkers/'),
          api.get('/crops/'),
          api.get('/yields/'),
          api.get('/plantings/'),
          api.get('/soilzones/'),
          api.get('/loans/'),    // This is the investments table
          api.get('/financialsummary/')
        ]);

        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
        setFarmBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : (blocksRes.data?.results || []));
        setInvestors(Array.isArray(investorsRes.data) ? investorsRes.data : (investorsRes.data?.results || []));
        setWorkers(Array.isArray(workersRes.data) ? workersRes.data : (workersRes.data?.results || []));
        setCrops(Array.isArray(cropsRes.data) ? cropsRes.data : (cropsRes.data?.results || []));
        setYields(Array.isArray(yieldsRes.data) ? yieldsRes.data : (yieldsRes.data?.results || []));
        setPlantings(Array.isArray(plantingsRes.data) ? plantingsRes.data : (plantingsRes.data?.results || []));
        setSoilZones(Array.isArray(soilRes.data) ? soilRes.data : (soilRes.data?.results || []));
        setInvestments(Array.isArray(investmentsRes.data) ? investmentsRes.data : (investmentsRes.data?.results || []));
        
        if (Array.isArray(financialRes.data) && financialRes.data.length > 0) {
          setFinancialSummary(financialRes.data[0]);
        }
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  // Filter yields
  const getFilteredYields = () => {
    let filtered = [...yields];
    
    if (searchTerm) {
      filtered = filtered.filter(y => {
        const cropName = y.plantings_id?.crops_id?.crop_name || '';
        const farmName = y.plantings_id?.farmblocks_id?.farms_id?.farm_name || '';
        return cropName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               farmName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    if (selectedFarm) {
      filtered = filtered.filter(y => 
        y.plantings_id?.farmblocks_id?.farms_id?.farms_id?.toString() === selectedFarm
      );
    }
    
    if (selectedCrop) {
      filtered = filtered.filter(y => 
        y.plantings_id?.crops_id?.crops_id?.toString() === selectedCrop
      );
    }
    
    if (selectedQuality) {
      filtered = filtered.filter(y => y.quality_grade === selectedQuality);
    }
    
    if (dateRange.start) {
      filtered = filtered.filter(y => y.harvest_date && y.harvest_date >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter(y => y.harvest_date && y.harvest_date <= dateRange.end);
    }
    
    return filtered;
  };

  const filteredYields = getFilteredYields();

  // ============ STATISTICS CALCULATIONS ============
  
  // Basic Stats
  const totalFarms = farms.length;
  const totalFarmBlocks = farmBlocks.length;
  const totalInvestors = investors.length;
  const totalWorkers = workers.length;
  const totalCrops = crops.length;
  const totalPlantings = plantings.length;
  const totalSoilZones = soilZones.length;
  
 // Investment Statistics
  const activeInvestments = investments.filter(i => i.status === 'ACTIVE').length;
  const totalInvestmentAmount = investments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const avgInvestmentSize = investments.length > 0 ? totalInvestmentAmount / investments.length : 0; // Fixed line
  const defaultedInvestments = investments.filter(i => i.status === 'DEFAULTED').length;
  const paidInvestments = investments.filter(i => i.status === 'PAID').length;
      
  // Yield Statistics
  const totalYield = yields.reduce((sum, y) => sum + (parseFloat(y.yield_tons) || 0), 0);
  const totalHarvestCost = yields.reduce((sum, y) => sum + (parseFloat(y.harvest_cost_ngn) || 0), 0);
  const avgPricePerTon = financialSummary?.avg_selling_price_ngn ? parseFloat(financialSummary.avg_selling_price_ngn) : 300000;
  const totalRevenue = totalYield * avgPricePerTon;
  const totalProfit = financialSummary?.net_profit_ngn ? parseFloat(financialSummary.net_profit_ngn) : (totalRevenue - totalHarvestCost);
  const avgROI = financialSummary?.roi_percentage || 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
  
  // Land Statistics
  const totalLandArea = farms.reduce((sum, f) => sum + (parseFloat(f.area_hectares) || 0), 0);
  const avgYieldPerHa = totalLandArea > 0 ? totalYield / totalLandArea : 0;
  const avgFarmSize = totalFarms > 0 ? totalLandArea / totalFarms : 0;
  
  // ============ CHART DATA PREPARATION ============
  
  // Yield by crop
  const yieldByCrop = {};
  yields.forEach(y => {
    const cropName = y.plantings_id?.crops_id?.crop_name || 'Unknown';
    yieldByCrop[cropName] = (yieldByCrop[cropName] || 0) + (parseFloat(y.yield_tons) || 0);
  });
  const yieldChartData = Object.entries(yieldByCrop).map(([name, tons]) => ({ name, tons }));
  
  // Yield by farm
  const yieldByFarm = {};
  yields.forEach(y => {
    const farmName = y.plantings_id?.farmblocks_id?.farms_id?.farm_name || 'Unknown';
    yieldByFarm[farmName] = (yieldByFarm[farmName] || 0) + (parseFloat(y.yield_tons) || 0);
  });
  const yieldByFarmData = Object.entries(yieldByFarm).map(([name, tons]) => ({ name, tons }));
  
  // Monthly yield trend
  const monthlyYield = {};
  yields.forEach(y => {
    if (y.harvest_date) {
      const month = y.harvest_date.slice(0, 7);
      if (!monthlyYield[month]) {
        monthlyYield[month] = { month, yield: 0, revenue: 0, count: 0 };
      }
      monthlyYield[month].yield += (parseFloat(y.yield_tons) || 0);
      monthlyYield[month].revenue += (parseFloat(y.yield_tons) || 0) * avgPricePerTon;
      monthlyYield[month].count += 1;
    }
  });
  const monthlyYieldData = Object.values(monthlyYield).sort((a, b) => a.month.localeCompare(b.month));
  
  // Investment distribution by status
  const investmentStatusData = [
    { name: 'Active', value: activeInvestments, color: '#28a745' },
    { name: 'Paid', value: paidInvestments, color: '#17a2b8' },
    { name: 'Defaulted', value: defaultedInvestments, color: '#dc3545' },
  ].filter(i => i.value > 0);
  
  // Investment amounts by investor
  const investmentByInvestor = {};
  investments.forEach(i => {
    const investorName = i.farmers_id ? `${i.farmers_id.first_name} ${i.farmers_id.last_name}` : 'Unknown';
    investmentByInvestor[investorName] = (investmentByInvestor[investorName] || 0) + (parseFloat(i.amount) || 0);
  });
  const topInvestors = Object.entries(investmentByInvestor)
    .map(([name, amount]) => ({ name, amount: amount / 1000000 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  // Crop season distribution
  const wetCrops = crops.filter(c => c.season === 'WET').length;
  const dryCrops = crops.filter(c => c.season === 'DRY').length;
  const perennialCrops = crops.filter(c => c.season === 'PERENNIAL').length;
  const seasonChartData = [
    { season: '🌧️ Wet Season', count: wetCrops, value: wetCrops },
    { season: '☀️ Dry Season', count: dryCrops, value: dryCrops },
    { season: '🌿 Perennial', count: perennialCrops, value: perennialCrops }
  ].filter(s => s.count > 0);
  
  // Quality distribution
  const premiumYields = yields.filter(y => y.quality_grade === 'PREMIUM').length;
  const standardYields = yields.filter(y => y.quality_grade === 'STANDARD').length;
  const basicYields = yields.filter(y => y.quality_grade === 'BASIC').length;
  const rejectYields = yields.filter(y => y.quality_grade === 'REJECT').length;
  const qualityChartData = [
    { grade: '🏆 Premium', count: premiumYields, color: '#ffc107' },
    { grade: '✅ Standard', count: standardYields, color: '#17a2b8' },
    { grade: '📦 Basic', count: basicYields, color: '#28a745' },
    { grade: '❌ Reject', count: rejectYields, color: '#dc3545' }
  ].filter(q => q.count > 0);
  
  // Soil pH distribution
  const acidicSoils = soilZones.filter(s => s.ph && s.ph < 6.5).length;
  const neutralSoils = soilZones.filter(s => s.ph && s.ph >= 6.5 && s.ph <= 7.5).length;
  const alkalineSoils = soilZones.filter(s => s.ph && s.ph > 7.5).length;
  const phChartData = [
    { range: 'Acidic (<6.5)', count: acidicSoils, status: '⚠️ Needs Lime' },
    { range: 'Neutral (6.5-7.5)', count: neutralSoils, status: '✅ Optimal' },
    { range: 'Alkaline (>7.5)', count: alkalineSoils, status: '⚠️ Needs Sulfur' }
  ].filter(p => p.count > 0);
  
  // Farm performance ranking
  const farmPerformance = farms.map(farm => {
    const farmYields = yields.filter(y => 
      y.plantings_id?.farmblocks_id?.farms_id?.farms_id === farm.farms_id
    );
    const farmYield = farmYields.reduce((sum, y) => sum + (parseFloat(y.yield_tons) || 0), 0);
    const yieldPerHa = (farm.area_hectares && farm.area_hectares > 0) ? farmYield / farm.area_hectares : 0;
    const farmRevenue = farmYield * avgPricePerTon;
    return {
      id: farm.farms_id,
      name: farm.farm_name || `Farm ${farm.farms_id}`,
      totalYield: farmYield,
      area: farm.area_hectares || 0,
      yieldPerHa: yieldPerHa.toFixed(2),
      revenue: farmRevenue / 1000000,
      blocks: farmBlocks.filter(b => b.farms_id?.farms_id === farm.farms_id).length,
      crops: crops.filter(c => c.farms_id?.farms_id === farm.farms_id).length
    };
  }).sort((a, b) => parseFloat(b.yieldPerHa) - parseFloat(a.yieldPerHa));
  
  // Worker productivity and efficiency
  const workerStats = workers.map(worker => {
    const workerTasks = yields.filter(y => y.farm_workers_id?.farm_workers_id === worker.farm_workers_id);
    const harvestHandled = workerTasks.reduce((sum, y) => sum + (parseFloat(y.yield_tons) || 0), 0);
    const efficiency = worker.daily_rate_ngn > 0 ? harvestHandled / parseFloat(worker.daily_rate_ngn) : 0;
    return {
      name: worker.name || `Worker ${worker.farm_workers_id}`,
      role: worker.role || 'Worker',
      dailyRate: parseFloat(worker.daily_rate_ngn) || 0,
      harvestContribution: harvestHandled,
      efficiency: efficiency.toFixed(2)
    };
  }).sort((a, b) => b.harvestContribution - a.harvestContribution);
  
  // Top crops by yield
  const topCrops = Object.entries(yieldByCrop)
    .map(([name, tons]) => ({ name, tons, revenue: tons * avgPricePerTon / 1000000 }))
    .sort((a, b) => b.tons - a.tons)
    .slice(0, 5);
  
  // Recent harvests
  const recentHarvests = [...yields]
    .sort((a, b) => new Date(b.harvest_date) - new Date(a.harvest_date))
    .slice(0, 10);
  
  // ROI by crop (estimated)
  const roiByCrop = {};
  crops.forEach(crop => {
    const cropYields = yields.filter(y => y.plantings_id?.crops_id?.crops_id === crop.crops_id);
    const totalCropYield = cropYields.reduce((sum, y) => sum + (parseFloat(y.yield_tons) || 0), 0);
    const totalCropRevenue = totalCropYield * avgPricePerTon;
    const totalCropCost = cropYields.reduce((sum, y) => sum + (parseFloat(y.harvest_cost_ngn) || 0), 0);
    const cropProfit = totalCropRevenue - totalCropCost;
    const cropROI = totalCropCost > 0 ? (cropProfit / totalCropCost * 100) : 0;
    roiByCrop[crop.crop_name] = cropROI;
  });
  const cropROIData = Object.entries(roiByCrop)
    .map(([name, roi]) => ({ name, roi: roi.toFixed(1) }))
    .sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi))
    .slice(0, 5);
  
  // Efficiency metrics
  const avgWorkerEfficiency = workerStats.reduce((sum, w) => sum + parseFloat(w.efficiency), 0) / (workerStats.length || 1);
  const yieldPerWorker = totalWorkers > 0 ? totalYield / totalWorkers : 0;
  const revenuePerHectare = totalLandArea > 0 ? totalRevenue / totalLandArea : 0;
  const profitPerHectare = totalLandArea > 0 ? totalProfit / totalLandArea : 0;

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Dashboard</h4>
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
          <h1 className="display-5 mb-0">🌾 Agrivest Analytics Dashboard</h1>
          <p className="text-muted">Comprehensive farm management, investment tracking, and performance analytics</p>
        </div>
        <div className="d-flex gap-2">
          <div className="btn-group">
            <button className={`btn btn-sm ${chartView === 'bar' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setChartView('bar')}>Bar</button>
            <button className={`btn btn-sm ${chartView === 'pie' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setChartView('pie')}>Pie</button>
            <button className={`btn btn-sm ${chartView === 'radar' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setChartView('radar')}>Radar</button>
          </div>
          <button className="btn btn-outline-success" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Hide Filters' : 'Show Filters'} 🔍
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="card mb-4 shadow-sm">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">🔍 Search & Filters</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Search Crops or Farms</label>
                <input type="text" className="form-control" placeholder="Enter crop or farm name..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Filter by Farm</label>
                <select className="form-select" value={selectedFarm} onChange={(e) => setSelectedFarm(e.target.value)}>
                  <option value="">All Farms</option>
                  {farms.map(farm => (
                    <option key={farm.farms_id} value={farm.farms_id}>{farm.farm_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Filter by Crop</label>
                <select className="form-select" value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
                  <option value="">All Crops</option>
                  {crops.map(crop => (
                    <option key={crop.crops_id} value={crop.crops_id}>{crop.crop_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Filter by Quality</label>
                <select className="form-select" value={selectedQuality} onChange={(e) => setSelectedQuality(e.target.value)}>
                  <option value="">All Grades</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="STANDARD">Standard</option>
                  <option value="BASIC">Basic</option>
                  <option value="REJECT">Rejected</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Date Range Start</label>
                <input type="date" className="form-control" value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Date Range End</label>
                <input type="date" className="form-control" value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
              </div>
            </div>
            {(searchTerm || selectedFarm || selectedCrop || selectedQuality || dateRange.start || dateRange.end) && (
              <div className="mt-3">
                <button className="btn btn-sm btn-secondary" onClick={() => {
                  setSearchTerm(''); setSelectedFarm(''); setSelectedCrop('');
                  setSelectedQuality(''); setDateRange({ start: '', end: '' });
                }}>Clear All Filters</button>
                <span className="ms-2 text-muted">Showing {filteredYields.length} of {yields.length} records</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ KEY METRICS SECTION ============ */}
      <div className="row mb-4 g-3">
        <div className="col-md-3">
          <div className="card text-white bg-success h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">🌾 Total Farms</h6>
              <h2 className="mb-0">{totalFarms}</h2>
              <small>{totalFarmBlocks} Blocks • {totalLandArea.toFixed(1)} ha</small>
              <div className="mt-2"><small>Avg Farm Size: {avgFarmSize.toFixed(1)} ha</small></div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-primary h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">🌱 Crops & Plantings</h6>
              <h2 className="mb-0">{totalCrops}</h2>
              <small>{totalPlantings} Plantings • {wetCrops} Wet, {dryCrops} Dry</small>
              <div className="mt-2"><small>Perennial: {perennialCrops}</small></div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-warning h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">📊 Yield Overview</h6>
              <h2 className="mb-0">{totalYield.toFixed(1)} tons</h2>
              <small>₦{(totalRevenue / 1000000).toFixed(1)}M Revenue</small>
              <div className="mt-2"><small>{avgYieldPerHa.toFixed(2)} t/ha average</small></div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-info h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">💰 Financial Summary</h6>
              <h2 className="mb-0">₦{(totalProfit / 1000000).toFixed(1)}M</h2>
              <small>Profit • ROI: {avgROI}%</small>
              <div className="mt-2"><small>Margin: {profitMargin.toFixed(1)}%</small></div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Investors & Workers */}
      <div className="row mb-4 g-3">
        <div className="col-md-3">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">👨‍💼 Investors</h6>
              <h3 className="mb-0">{totalInvestors}</h3>
              <span>Active Investments: {activeInvestments}</span>
              <div className="mt-2"><small>Total Invested: ₦{(totalInvestmentAmount / 1000000).toFixed(1)}M</small></div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">👷 Farm Workers</h6>
              <h3 className="mb-0">{totalWorkers}</h3>
              <span>Avg Efficiency: {avgWorkerEfficiency} tons/₦</span>
              <div className="mt-2"><small>{yieldPerWorker.toFixed(1)} tons/worker</small></div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">💰 Investments</h6>
              <h3 className="mb-0">{investments.length}</h3>
              <span>₦{(avgInvestmentSize / 1000000).toFixed(1)}M avg size</span>
              <div className="mt-2">
                <small>✅ {paidInvestments} Paid • ❌ {defaultedInvestments} Defaulted</small>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">📈 Efficiency Metrics</h6>
              <h3 className="mb-0">₦{(revenuePerHectare / 1000).toFixed(0)}K/ha</h3>
              <span>Revenue per hectare</span>
              <div className="mt-2"><small>Profit: ₦{(profitPerHectare / 1000).toFixed(0)}K/ha</small></div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ INVESTMENT & FINANCE CHARTS ============ */}
      <div className="row mb-4 g-3">
        <div className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">💰 Investment Portfolio Distribution</h5>
            </div>
            <div className="card-body">
              {investmentStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={investmentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {investmentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} investments`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted py-5">No investment data available</p>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">🏆 Top Investors by Amount</h5>
            </div>
            <div className="card-body">
              {topInvestors.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topInvestors} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'Millions (₦)', position: 'insideBottom' }} />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip formatter={(value) => `₦${value}M`} />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted py-5">No investor data available</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ============ YIELD & CROP PERFORMANCE ============ */}
      <div className="row mb-4 g-3">
        <div className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">🌽 Yield by Crop</h5>
              <span className="badge bg-success">{yieldChartData.length} crops</span>
            </div>
            <div className="card-body">
              {yieldChartData.length > 0 ? (
                chartView === 'bar' ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={yieldChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis label={{ value: 'Tons', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => `${value} tons`} />
                      <Bar dataKey="tons" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : chartView === 'pie' ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie data={yieldChartData} dataKey="tons" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                        {yieldChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} tons`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={yieldChartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis />
                      <Radar dataKey="tons" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )
              ) : <p className="text-center text-muted py-5">No yield data available</p>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">📈 Monthly Yield & Revenue Trend</h5>
            </div>
            <div className="card-body">
              {monthlyYieldData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={monthlyYieldData}>
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
              ) : <p className="text-center text-muted py-5">No monthly data available</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ============ QUALITY & ROI ANALYSIS ============ */}
      <div className="row mb-4 g-3">
        <div className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">⭐ Quality Distribution & ROI by Crop</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-6">
                  {qualityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={qualityChartData} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={70} label>
                          {qualityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted">No quality data</p>}
                  <p className="text-center small">Quality Grades</p>
                </div>
                <div className="col-6">
                  {cropROIData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={cropROIData} layout="vertical">
                        <XAxis type="number" label={{ value: 'ROI %', position: 'insideBottom' }} />
                        <YAxis type="category" dataKey="name" width={80} />
                        <Tooltip formatter={(value) => `${value}% ROI`} />
                        <Bar dataKey="roi" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted">No ROI data</p>}
                  <p className="text-center small">Return on Investment by Crop</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">🧪 Soil Health Analysis</h5>
            </div>
            <div className="card-body">
              {phChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={phChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8">
                        {phChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.range === 'Neutral (6.5-7.5)' ? '#28a745' : '#ffc107'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2">
                    {phChartData.map((item, i) => (
                      <div key={i} className="d-flex justify-content-between small mb-1">
                        <span>{item.range}</span>
                        <span className={item.status.includes('Optimal') ? 'text-success' : 'text-warning'}>
                          {item.status} ({item.count} zones)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-center text-muted py-5">No soil data available</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ============ PERFORMANCE RANKINGS ============ */}
      <div className="row mb-4 g-3">
        <div className="col-md-7">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">🏆 Top Performing Farms (Yield per Hectare)</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-success">
                    <tr><th>Rank</th><th>Farm Name</th><th>Yield (tons)</th><th>Area (ha)</th><th>Yield/ha</th><th>Revenue (₦M)</th><th>Blocks</th><th>Crops</th></tr>
                  </thead>
                  <tbody>
                    {farmPerformance.slice(0, 5).map((farm, i) => (
                      <tr key={i}>
                        <td><span className="badge bg-success">{i + 1}</span></td>
                        <td><strong>{farm.name}</strong></td>
                        <td>{farm.totalYield.toFixed(1)}</td>
                        <td>{farm.area}</td>
                        <td><strong className="text-success">{farm.yieldPerHa}</strong></td>
                        <td>₦{farm.revenue.toFixed(1)}M</td>
                        <td><span className="badge bg-info">{farm.blocks}</span></td>
                        <td><span className="badge bg-warning">{farm.crops}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-5">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">🌟 Top 5 Highest Yielding Crops</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <tbody>
                    {topCrops.map((crop, i) => (
                      <tr key={i}>
                        <td><span className="badge bg-info">{i + 1}</span></td>
                        <td><strong>{crop.name}</strong></td>
                        <td className="text-end">{crop.tons.toFixed(1)} tons</td>
                        <td className="text-success">₦{crop.revenue.toFixed(1)}M</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ WORKER PRODUCTIVITY ============ */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-white">
          <h5 className="mb-0">👷 Worker Productivity & Efficiency</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead>
                <tr><th>Worker Name</th><th>Role</th><th>Daily Rate (₦)</th><th>Harvest Contribution (tons)</th><th>Efficiency (tons/₦)</th></tr>
              </thead>
              <tbody>
                {workerStats.slice(0, 8).map((w, i) => (
                  <tr key={i}>
                    <td><strong>{w.name}</strong></td>
                    <td><span className="badge bg-secondary">{w.role}</span></td>
                    <td>₦{w.dailyRate.toLocaleString()}</td>
                    <td><strong>{w.harvestContribution.toFixed(1)} tons</strong></td>
                    <td>{w.efficiency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============ RECENT HARVESTS ============ */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-white">
          <h5 className="mb-0">📋 Recent Harvests</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0">
              <thead className="table-success">
                <tr><th>Date</th><th>Crop</th><th>Farm</th><th>Block</th><th>Yield (tons)</th><th>Revenue (₦M)</th><th>Quality</th></tr>
              </thead>
              <tbody>
                {recentHarvests.map(harvest => {
                  const cropName = harvest.plantings_id?.crops_id?.crop_name || 'Unknown';
                  const farmName = harvest.plantings_id?.farmblocks_id?.farms_id?.farm_name || 'Unknown';
                  const blockName = harvest.plantings_id?.farmblocks_id?.block_name || 'Unknown';
                  const revenue = (harvest.yield_tons || 0) * avgPricePerTon / 1000000;
                  return (
                    <tr key={harvest.yields_id}>
                      <td>{harvest.harvest_date}</td>
                      <td><strong>{cropName}</strong></td>
                      <td>{farmName}</td>
                      <td>{blockName}</td>
                      <td>{harvest.yield_tons?.toFixed(1) || 0}</td>
                      <td className="text-success">₦{revenue.toFixed(2)}M</td>
                      <td><span className={`badge ${harvest.quality_grade === 'PREMIUM' ? 'bg-success' : 
                        harvest.quality_grade === 'STANDARD' ? 'bg-info' : 'bg-secondary'}`}>
                        {harvest.quality_grade || 'N/A'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============ INVESTOR-FARM RELATIONSHIPS ============ */}
      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <h5 className="mb-0">🏘️ Investor-Farm Relationships</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-success">
                <tr><th>Farm Name</th><th>Location</th><th>Area (ha)</th><th>Investor</th><th>Contact</th><th>Investment (₦M)</th><th>Status</th><th>Blocks</th><th>Crops</th></tr>
              </thead>
              <tbody>
                {farms.slice(0, 10).map(farm => {
                  const blockCount = farmBlocks.filter(b => b.farms_id?.farms_id === farm.farms_id).length;
                  const cropCount = crops.filter(c => c.farms_id?.farms_id === farm.farms_id).length;
                  const farmInvestments = investments.filter(i => i.farmers_id?.farms_id === farm.farms_id);
                  const totalInvested = farmInvestments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) / 1000000;
                  const investmentStatus = farmInvestments[0]?.status || 'No Investment';
                  return (
                    <tr key={farm.farms_id}>
                      <td><strong>{farm.farm_name}</strong></td>
                      <td>{farm.state}, {farm.lga}</td>
                      <td>{farm.area_hectares || 0} ha</td>
                      <td>{farm.farmers_id?.first_name} {farm.farmers_id?.last_name}</td>
                      <td>{farm.farmers_id?.phone || 'N/A'}</td>
                      <td className="text-success">₦{totalInvested.toFixed(1)}M</td>
                      <td><span className={`badge ${investmentStatus === 'ACTIVE' ? 'bg-success' : 
                        investmentStatus === 'PAID' ? 'bg-info' : 'bg-secondary'}`}>{investmentStatus}</span></td>
                      <td><span className="badge bg-info">{blockCount}</span></td>
                      <td><span className="badge bg-warning">{cropCount}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}