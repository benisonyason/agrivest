import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  AreaChart, Area, ComposedChart, RadialBarChart, RadialBar
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FinancialSummary() {
  const [investments, setInvestments] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvestor, setSelectedInvestor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showCharts, setShowCharts] = useState(true);
  
  const { token } = useAuth();
  const COLORS = ['#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6c757d', '#007bff', '#6610f2', '#fd7e14'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching financial data...');
        const [investmentsRes, investorsRes, farmsRes] = await Promise.all([
          api.get('/loans/'),
          api.get('/farmers/'),  // Investors
          api.get('/farms/')
        ]);
        
        setInvestments(Array.isArray(investmentsRes.data) ? investmentsRes.data : (investmentsRes.data?.results || []));
        setInvestors(Array.isArray(investorsRes.data) ? investorsRes.data : (investorsRes.data?.results || []));
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load financial data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Enrich investments with calculated data
  const enrichedInvestments = investments.map(investment => {
    const investor = investors.find(i => i.farmers_id === investment.farmers_id?.farmers_id);
    const farm = investor ? farms.find(f => f.farmers_id?.farmers_id === investor.farmers_id) : null;
    
    const amount = parseFloat(investment.amount) || 0;
    const interestRate = parseFloat(investment.interest_rate) || 0;
    const expectedReturn = amount * (1 + interestRate / 100);
    const profitAmount = expectedReturn - amount;
    
    const currentDate = new Date();
    const dueDate = investment.due_date ? new Date(investment.due_date) : null;
    const isOverdue = investment.status === 'ACTIVE' && dueDate && dueDate < currentDate;
    const daysRemaining = dueDate ? Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24)) : 0;
    const daysOverdue = isOverdue ? Math.abs(daysRemaining) : 0;
    
    return {
      ...investment,
      investor,
      farm,
      amount,
      interestRate,
      expectedReturn,
      profitAmount,
      amountM: amount / 1000000,
      expectedReturnM: expectedReturn / 1000000,
      profitAmountM: profitAmount / 1000000,
      isOverdue,
      daysRemaining,
      daysOverdue
    };
  });

  // Filter data
  const filteredInvestments = enrichedInvestments.filter(inv => {
    const matchesInvestor = selectedInvestor === '' || inv.farmers_id?.farmers_id?.toString() === selectedInvestor;
    const matchesStatus = selectedStatus === '' || inv.status === selectedStatus;
    const matchesDate = (!dateRange.start || (inv.start_date && inv.start_date >= dateRange.start)) &&
                        (!dateRange.end || (inv.start_date && inv.start_date <= dateRange.end));
    
    return matchesInvestor && matchesStatus && matchesDate;
  });

  // ============ FINANCIAL CALCULATIONS ============
  
  // Overall totals
  const totalInvested = filteredInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalExpectedReturn = filteredInvestments.reduce((sum, inv) => sum + inv.expectedReturn, 0);
  const totalProfit = filteredInvestments.reduce((sum, inv) => sum + inv.profitAmount, 0);
  const overallROI = totalInvested > 0 ? (totalProfit / totalInvested * 100) : 0;
  
  // By status
  const activeInvestments = filteredInvestments.filter(inv => inv.status === 'ACTIVE');
  const paidInvestments = filteredInvestments.filter(inv => inv.status === 'PAID');
  const defaultedInvestments = filteredInvestments.filter(inv => inv.status === 'DEFAULTED');
  const pendingInvestments = filteredInvestments.filter(inv => inv.status === 'PENDING');
  
  const activeAmount = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = paidInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const defaultedAmount = defaultedInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = pendingInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  
  const activeProfit = activeInvestments.reduce((sum, inv) => sum + inv.profitAmount, 0);
  const paidProfit = paidInvestments.reduce((sum, inv) => sum + inv.profitAmount, 0);
  
  // Overdue amounts
  const overdueAmount = filteredInvestments.filter(inv => inv.isOverdue).reduce((sum, inv) => sum + inv.amount, 0);
  const overdueProfit = filteredInvestments.filter(inv => inv.isOverdue).reduce((sum, inv) => sum + inv.profitAmount, 0);
  
  // Summary by investor
  const investorSummaries = {};
  filteredInvestments.forEach(inv => {
    const investorId = inv.farmers_id?.farmers_id;
    if (investorId && inv.investor) {
      if (!investorSummaries[investorId]) {
        investorSummaries[investorId] = {
          investor: inv.investor,
          totalInvested: 0,
          totalExpectedReturn: 0,
          totalProfit: 0,
          investmentCount: 0,
          activeCount: 0,
          paidCount: 0,
          defaultedCount: 0
        };
      }
      investorSummaries[investorId].totalInvested += inv.amount;
      investorSummaries[investorId].totalExpectedReturn += inv.expectedReturn;
      investorSummaries[investorId].totalProfit += inv.profitAmount;
      investorSummaries[investorId].investmentCount += 1;
      if (inv.status === 'ACTIVE') investorSummaries[investorId].activeCount += 1;
      if (inv.status === 'PAID') investorSummaries[investorId].paidCount += 1;
      if (inv.status === 'DEFAULTED') investorSummaries[investorId].defaultedCount += 1;
    }
  });
  
  const investorSummaryList = Object.values(investorSummaries)
    .map(summary => ({
      ...summary,
      avgInvestment: summary.totalInvested / summary.investmentCount,
      roi: summary.totalInvested > 0 ? (summary.totalProfit / summary.totalInvested * 100) : 0,
      totalInvestedM: summary.totalInvested / 1000000,
      totalExpectedReturnM: summary.totalExpectedReturn / 1000000,
      totalProfitM: summary.totalProfit / 1000000
    }))
    .sort((a, b) => b.totalInvested - a.totalInvested);
  
  // Summary by farm
  const farmSummaries = {};
  filteredInvestments.forEach(inv => {
    const farmId = inv.farm?.farms_id;
    if (farmId && inv.farm) {
      if (!farmSummaries[farmId]) {
        farmSummaries[farmId] = {
          farm: inv.farm,
          totalInvested: 0,
          totalExpectedReturn: 0,
          totalProfit: 0,
          investmentCount: 0
        };
      }
      farmSummaries[farmId].totalInvested += inv.amount;
      farmSummaries[farmId].totalExpectedReturn += inv.expectedReturn;
      farmSummaries[farmId].totalProfit += inv.profitAmount;
      farmSummaries[farmId].investmentCount += 1;
    }
  });
  
  const farmSummaryList = Object.values(farmSummaries)
    .map(summary => ({
      ...summary,
      avgInvestment: summary.totalInvested / summary.investmentCount,
      roi: summary.totalInvested > 0 ? (summary.totalProfit / summary.totalInvested * 100) : 0,
      totalInvestedM: summary.totalInvested / 1000000,
      totalExpectedReturnM: summary.totalExpectedReturn / 1000000,
      totalProfitM: summary.totalProfit / 1000000
    }))
    .sort((a, b) => b.totalInvested - a.totalInvested);
  
  // Chart data
  const statusChartData = [
    { name: 'Active', value: activeAmount / 1000000, count: activeInvestments.length, color: '#007bff' },
    { name: 'Paid', value: paidAmount / 1000000, count: paidInvestments.length, color: '#28a745' },
    { name: 'Defaulted', value: defaultedAmount / 1000000, count: defaultedInvestments.length, color: '#dc3545' },
    { name: 'Pending', value: pendingAmount / 1000000, count: pendingInvestments.length, color: '#ffc107' },
    { name: 'Overdue', value: overdueAmount / 1000000, count: filteredInvestments.filter(inv => inv.isOverdue).length, color: '#fd7e14' }
  ].filter(s => s.value > 0);
  
  const topInvestors = [...investorSummaryList].slice(0, 5);
  const topFarms = [...farmSummaryList].slice(0, 5);
  
  // Monthly trend
  const monthlyTrend = {};
  filteredInvestments.forEach(inv => {
    if (inv.start_date) {
      const month = inv.start_date.slice(0, 7);
      if (!monthlyTrend[month]) {
        monthlyTrend[month] = { month, invested: 0, expectedReturn: 0, profit: 0, count: 0 };
      }
      monthlyTrend[month].invested += inv.amount / 1000000;
      monthlyTrend[month].expectedReturn += inv.expectedReturn / 1000000;
      monthlyTrend[month].profit += inv.profitAmount / 1000000;
      monthlyTrend[month].count += 1;
    }
  });
  const monthlyTrendData = Object.values(monthlyTrend).sort((a, b) => a.month.localeCompare(b.month));
  
  // ROI distribution
  const roiDistribution = investorSummaryList.map(inv => ({
    name: `${inv.investor.first_name} ${inv.investor.last_name}`.substring(0, 20),
    roi: inv.roi,
    invested: inv.totalInvestedM
  })).sort((a, b) => b.roi - a.roi).slice(0, 8);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading financial summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Financial Summary</h4>
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
          <h1 className="display-5 mb-0">📊 Financial Summary</h1>
          <p className="text-muted">Comprehensive investment portfolio analysis by investor and farm</p>
        </div>
        <button 
          className={`btn ${showCharts ? 'btn-success' : 'btn-outline-success'}`}
          onClick={() => setShowCharts(!showCharts)}
        >
          {showCharts ? 'Hide Charts' : 'Show Charts'} 📈
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">👨‍💼 Filter by Investor</label>
              <select className="form-select" value={selectedInvestor} onChange={(e) => setSelectedInvestor(e.target.value)}>
                <option value="">All Investors</option>
                {investors.map(inv => (
                  <option key={inv.farmers_id} value={inv.farmers_id}>
                    {inv.first_name} {inv.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">📊 Filter by Status</label>
              <select className="form-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PAID">Paid</option>
                <option value="DEFAULTED">Defaulted</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">📅 Start Date From</label>
              <input type="date" className="form-control" value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
            </div>
            <div className="col-md-2">
              <label className="form-label">📅 To</label>
              <input type="date" className="form-control" value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
            </div>
          </div>
          {(selectedInvestor || selectedStatus || dateRange.start || dateRange.end) && (
            <div className="mt-3">
              <button className="btn btn-sm btn-secondary" onClick={() => {
                setSelectedInvestor('');
                setSelectedStatus('');
                setDateRange({ start: '', end: '' });
              }}>Clear Filters</button>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="row mb-4 g-3">
        <div className="col-md-3">
          <div className="card text-white bg-primary h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">💰 Total Invested</h6>
              <h2 className="mb-0">₦{(totalInvested / 1000000).toFixed(2)}M</h2>
              <small>{filteredInvestments.length} investments</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-success h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">📈 Expected Return</h6>
              <h2 className="mb-0">₦{(totalExpectedReturn / 1000000).toFixed(2)}M</h2>
              <small>+₦{(totalProfit / 1000000).toFixed(2)}M profit</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-warning h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">🎯 Overall ROI</h6>
              <h2 className="mb-0">{overallROI.toFixed(1)}%</h2>
              <small>return on investment</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-info h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">👥 Active Investors</h6>
              <h2 className="mb-0">{Object.keys(investorSummaries).length}</h2>
              <small>with active investments</small>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row Metrics */}
      <div className="row mb-4 g-3">
        <div className="col-md-4">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">✅ Paid Investments</h6>
              <h3 className="mb-0 text-success">₦{(paidAmount / 1000000).toFixed(2)}M</h3>
              <small>{paidInvestments.length} investments • ₦{(paidProfit / 1000000).toFixed(2)}M profit paid</small>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">🔄 Active Investments</h6>
              <h3 className="mb-0 text-primary">₦{(activeAmount / 1000000).toFixed(2)}M</h3>
              <small>{activeInvestments.length} investments • ₦{(activeProfit / 1000000).toFixed(2)}M expected</small>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">⚠️ At Risk</h6>
              <h3 className="mb-0 text-danger">₦{(defaultedAmount / 1000000).toFixed(2)}M</h3>
              <small>{defaultedInvestments.length} defaulted • ₦{(overdueAmount / 1000000).toFixed(2)}M overdue</small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {showCharts && (
        <>
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">💰 Investment Distribution by Status</h5>
                </div>
                <div className="card-body">
                  {statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₦${value}M`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No data available</p>}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">📈 Monthly Investment Trend</h5>
                </div>
                <div className="card-body">
                  {monthlyTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis label={{ value: 'Millions (₦)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => `₦${value}M`} />
                        <Legend />
                        <Area type="monotone" dataKey="invested" stackId="1" stroke="#8884d8" fill="#8884d8" name="Invested" />
                        <Area type="monotone" dataKey="expectedReturn" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Expected Return" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No monthly data available</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🏆 Top 5 Investors by Investment</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-success">
                        <tr><th>Investor</th><th>Invested (₦M)</th><th>Expected (₦M)</th><th>Profit (₦M)</th><th>ROI</th></tr>
                      </thead>
                      <tbody>
                        {topInvestors.map((investor, i) => (
                          <tr key={i}>
                            <td><strong>{investor.investor.first_name} {investor.investor.last_name}</strong></td>
                            <td>₦{investor.totalInvestedM.toFixed(2)}M</td>
                            <td className="text-primary">₦{investor.totalExpectedReturnM.toFixed(2)}M</td>
                            <td className="text-success">₦{investor.totalProfitM.toFixed(2)}M</td>
                            <td className="fw-bold">{investor.roi.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🌾 Top 5 Farms by Investment</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-success">
                        <tr><th>Farm</th><th>Invested (₦M)</th><th>Expected (₦M)</th><th>Profit (₦M)</th><th>ROI</th></tr>
                      </thead>
                      <tbody>
                        {topFarms.map((farm, i) => (
                          <tr key={i}>
                            <td><strong>{farm.farm.farm_name}</strong></td>
                            <td>₦{farm.totalInvestedM.toFixed(2)}M</td>
                            <td className="text-primary">₦{farm.totalExpectedReturnM.toFixed(2)}M</td>
                            <td className="text-success">₦{farm.totalProfitM.toFixed(2)}M</td>
                            <td className="fw-bold">{farm.roi.toFixed(1)}%</td>
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
                  <h5 className="mb-0">📊 ROI Distribution by Investor</h5>
                </div>
                <div className="card-body">
                  {roiDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={roiDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" label={{ value: 'ROI (%)', position: 'insideBottom' }} />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                        <Legend />
                        <Bar dataKey="roi" fill="#ffc658" name="ROI %">
                          {roiDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.roi > 0 ? '#28a745' : '#dc3545'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No ROI data available</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detailed Investor Summary Table */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">📋 Detailed Investor Summary</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0">
              <thead className="table-success">
                <tr>
                  <th>Investor</th>
                  <th>Contact</th>
                  <th>Investments</th>
                  <th>Total Invested (₦M)</th>
                  <th>Expected Return (₦M)</th>
                  <th>Expected Profit (₦M)</th>
                  <th>ROI</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {investorSummaryList.map((summary, i) => (
                  <tr key={i}>
                    <td>
                      <strong>{summary.investor.first_name} {summary.investor.last_name}</strong>
                    </td>
                    <td>
                      {summary.investor.email}<br />
                      <small>{summary.investor.phone}</small>
                    </td>
                    <td>
                      {summary.investmentCount} total<br />
                      <small className="text-success">{summary.paidCount} paid</small>
                     </td>
                    <td className="fw-bold">₦{summary.totalInvestedM.toFixed(2)}M</td>
                    <td className="text-primary">₦{summary.totalExpectedReturnM.toFixed(2)}M</td>
                    <td className="text-success">₦{summary.totalProfitM.toFixed(2)}M</td>
                    <td className="fw-bold">{summary.roi.toFixed(1)}%</td>
                    <td>
                      {summary.activeCount > 0 && <span className="badge bg-primary me-1">{summary.activeCount} Active</span>}
                      {summary.paidCount > 0 && <span className="badge bg-success me-1">{summary.paidCount} Paid</span>}
                      {summary.defaultedCount > 0 && <span className="badge bg-danger">{summary.defaultedCount} Defaulted</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light">
                <tr className="fw-bold">
                  <td colSpan="3" className="text-end">TOTALS:</td>
                  <td>₦{(totalInvested / 1000000).toFixed(2)}M</td>
                  <td className="text-primary">₦{(totalExpectedReturn / 1000000).toFixed(2)}M</td>
                  <td className="text-success">₦{(totalProfit / 1000000).toFixed(2)}M</td>
                  <td>{overallROI.toFixed(1)}%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Farm Summary Table */}
      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <h5 className="mb-0">🌾 Detailed Farm Summary</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0">
              <thead className="table-success">
                <tr>
                  <th>Farm Name</th>
                  <th>Location</th>
                  <th>Investments</th>
                  <th>Total Invested (₦M)</th>
                  <th>Expected Return (₦M)</th>
                  <th>Expected Profit (₦M)</th>
                  <th>ROI</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {farmSummaryList.map((summary, i) => (
                  <tr key={i}>
                    <td><strong>{summary.farm.farm_name}</strong></td>
                    <td>{summary.farm.state}, {summary.farm.lga}</td>
                    <td>{summary.investmentCount} investments</td>
                    <td className="fw-bold">₦{summary.totalInvestedM.toFixed(2)}M</td>
                    <td className="text-primary">₦{summary.totalExpectedReturnM.toFixed(2)}M</td>
                    <td className="text-success">₦{summary.totalProfitM.toFixed(2)}M</td>
                    <td className="fw-bold">{summary.roi.toFixed(1)}%</td>
                    <td>
                      <Link to={`/farm/${summary.farm.farms_id}`} className="btn btn-sm btn-outline-success">
                        View Farm
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light">
                <tr className="fw-bold">
                  <td colSpan="3" className="text-end">TOTALS:</td>
                  <td>₦{(totalInvested / 1000000).toFixed(2)}M</td>
                  <td className="text-primary">₦{(totalExpectedReturn / 1000000).toFixed(2)}M</td>
                  <td className="text-success">₦{(totalProfit / 1000000).toFixed(2)}M</td>
                  <td>{overallROI.toFixed(1)}%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}