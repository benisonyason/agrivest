import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  AreaChart, Area, ComposedChart
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function InvestmentList() {
  const [investments, setInvestments] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [formData, setFormData] = useState({
    farmers_id: '',
    amount: '',
    interest_rate: '',
    start_date: '',
    due_date: '',
    status: 'PENDING'
  });
  
  const { token } = useAuth();
  const COLORS = ['#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6c757d', '#007bff'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching investment data...');
        const [investmentsRes, investorsRes, farmsRes] = await Promise.all([
          api.get('/loans/'),
          api.get('/farmers/'),
          api.get('/farms/')
        ]);
        
        setInvestments(Array.isArray(investmentsRes.data) ? investmentsRes.data : (investmentsRes.data?.results || []));
        setInvestors(Array.isArray(investorsRes.data) ? investorsRes.data : (investorsRes.data?.results || []));
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load investment data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Enrich investments with related data
  const enrichedInvestments = investments.map(investment => {
    const investor = investors.find(i => i.farmers_id === investment.farmers_id?.farmers_id);
    const farm = investor ? farms.find(f => f.farmers_id?.farmers_id === investor.farmers_id) : null;
    const totalPaid = 0; // This would come from loan payments if available
    const remainingBalance = (parseFloat(investment.amount) || 0) - totalPaid;
    const isOverdue = investment.due_date && new Date(investment.due_date) < new Date() && investment.status === 'ACTIVE';
    
    return {
      ...investment,
      investor,
      farm,
      totalPaid,
      remainingBalance,
      isOverdue,
      amountM: (parseFloat(investment.amount) || 0) / 1000000
    };
  });

  // Filter investments
  const filteredInvestments = enrichedInvestments.filter(inv => {
    const matchesSearch = searchTerm === '' || 
      (inv.investor?.first_name && inv.investor.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.investor?.last_name && inv.investor.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.farm?.farm_name && inv.farm.farm_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === '' || inv.status === selectedStatus;
    const matchesInvestor = selectedInvestor === '' || inv.farmers_id?.farmers_id?.toString() === selectedInvestor;
    const matchesFarm = selectedFarm === '' || inv.farm?.farms_id?.toString() === selectedFarm;
    
    const matchesDate = (!dateRange.start || (inv.start_date && inv.start_date >= dateRange.start)) &&
                        (!dateRange.end || (inv.start_date && inv.start_date <= dateRange.end));
    
    return matchesSearch && matchesStatus && matchesInvestor && matchesFarm && matchesDate;
  });

  // Statistics
  const totalInvestments = investments.length;
  const totalAmount = investments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const activeAmount = investments.filter(i => i.status === 'ACTIVE').reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const paidAmount = investments.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const defaultedAmount = investments.filter(i => i.status === 'DEFAULTED').reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  
  const activeCount = investments.filter(i => i.status === 'ACTIVE').length;
  const paidCount = investments.filter(i => i.status === 'PAID').length;
  const defaultedCount = investments.filter(i => i.status === 'DEFAULTED').length;
  const pendingCount = investments.filter(i => i.status === 'PENDING').length;
  
  const avgInterestRate = investments.reduce((sum, i) => sum + (parseFloat(i.interest_rate) || 0), 0) / (investments.length || 1);
  const overdueCount = enrichedInvestments.filter(i => i.isOverdue).length;
  const uniqueInvestors = [...new Set(investments.map(i => i.farmers_id?.farmers_id).filter(Boolean))].length;
  
  // Investment by status for chart
  const statusChartData = [
    { name: 'Active', value: activeCount, amount: activeAmount / 1000000, color: '#28a745' },
    { name: 'Paid', value: paidCount, amount: paidAmount / 1000000, color: '#17a2b8' },
    { name: 'Defaulted', value: defaultedCount, amount: defaultedAmount / 1000000, color: '#dc3545' },
    { name: 'Pending', value: pendingCount, amount: 0, color: '#ffc107' }
  ].filter(s => s.value > 0);
  
  // Investment by month
  const monthlyInvestments = {};
  investments.forEach(i => {
    if (i.start_date) {
      const month = i.start_date.slice(0, 7);
      if (!monthlyInvestments[month]) {
        monthlyInvestments[month] = { month, amount: 0, count: 0 };
      }
      monthlyInvestments[month].amount += (parseFloat(i.amount) || 0) / 1000000;
      monthlyInvestments[month].count += 1;
    }
  });
  const monthlyData = Object.values(monthlyInvestments).sort((a, b) => a.month.localeCompare(b.month));
  
  // Top investors by amount
  const investorTotals = {};
  investments.forEach(i => {
    const investorId = i.farmers_id?.farmers_id;
    if (investorId) {
      if (!investorTotals[investorId]) {
        investorTotals[investorId] = { amount: 0, count: 0, name: '' };
      }
      investorTotals[investorId].amount += parseFloat(i.amount) || 0;
      investorTotals[investorId].count += 1;
    }
  });
  const topInvestors = Object.entries(investorTotals)
    .map(([id, data]) => {
      const investor = investors.find(i => i.farmers_id === parseInt(id));
      return {
        id,
        name: investor ? `${investor.first_name} ${investor.last_name}` : `Investor ${id}`,
        amount: data.amount / 1000000,
        count: data.count
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  // Interest rate distribution
  const interestRates = investments.map(i => parseFloat(i.interest_rate)).filter(r => r > 0);
  const avgRate = interestRates.reduce((a, b) => a + b, 0) / (interestRates.length || 1);
  const maxRate = Math.max(...interestRates, 0);
  const minRate = Math.min(...interestRates, 100);
  
  // Recent investments
  const recentInvestments = [...enrichedInvestments]
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
    .slice(0, 10);

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit investments');
      return;
    }
    
    try {
      if (editingInvestment) {
        await api.put(`/loans/${editingInvestment}/`, formData);
      } else {
        await api.post('/loans/', formData);
      }
      setShowAddModal(false);
      setEditingInvestment(null);
      setFormData({
        farmers_id: '',
        amount: '',
        interest_rate: '',
        start_date: '',
        due_date: '',
        status: 'PENDING'
      });
      // Refresh data
      const investmentsRes = await api.get('/loans/');
      setInvestments(Array.isArray(investmentsRes.data) ? investmentsRes.data : (investmentsRes.data?.results || []));
    } catch (err) {
      console.error('Error saving investment:', err);
      alert('Error saving investment');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this investment record?')) return;
    try {
      await api.delete(`/loans/${id}/`);
      const investmentsRes = await api.get('/loans/');
      setInvestments(Array.isArray(investmentsRes.data) ? investmentsRes.data : (investmentsRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting investment:', err);
      alert('Error deleting investment');
    }
  };

  const getStatusBadge = (status, isOverdue) => {
    if (isOverdue && status === 'ACTIVE') {
      return <span className="badge bg-danger">⚠️ OVERDUE</span>;
    }
    switch (status) {
      case 'ACTIVE': return <span className="badge bg-success">✅ Active</span>;
      case 'PAID': return <span className="badge bg-info">💰 Paid</span>;
      case 'DEFAULTED': return <span className="badge bg-danger">❌ Defaulted</span>;
      case 'PENDING': return <span className="badge bg-warning">⏳ Pending</span>;
      default: return <span className="badge bg-secondary">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading investment data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Investments</h4>
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
          <h1 className="display-5 mb-0">💰 Investment Portfolio</h1>
          <p className="text-muted">Track and manage all investor funding and repayments</p>
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
              setEditingInvestment(null);
              setFormData({
                farmers_id: '',
                amount: '',
                interest_rate: '',
                start_date: new Date().toISOString().split('T')[0],
                due_date: '',
                status: 'PENDING'
              });
              setShowAddModal(true);
            }}>
              + New Investment
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
              <div className="card text-white bg-primary h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Investments</h6>
                  <h2 className="mb-0">{totalInvestments}</h2>
                  <small>{uniqueInvestors} unique investors</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-success h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Amount</h6>
                  <h2 className="mb-0">₦{(totalAmount / 1000000).toFixed(1)}M</h2>
                  <small>₦{(totalAmount / totalInvestments / 1000000).toFixed(1)}M avg</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-warning h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Active Investments</h6>
                  <h2 className="mb-0">{activeCount}</h2>
                  <small>₦{(activeAmount / 1000000).toFixed(1)}M active</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-danger h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Overdue / Defaulted</h6>
                  <h2 className="mb-0">{overdueCount + defaultedCount}</h2>
                  <small>⚠️ {overdueCount} overdue • ❌ {defaultedCount} defaulted</small>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">Investment Portfolio Distribution</h5>
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
                  <h5 className="mb-0">Investment Amount by Status</h5>
                </div>
                <div className="card-body">
                  {statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={statusChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: 'Millions (₦)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => `₦${value}M`} />
                        <Bar dataKey="amount" fill="#8884d8">
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No investment data available</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">📈 Monthly Investment Trend</h5>
                </div>
                <div className="card-body">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" label={{ value: 'Millions (₦)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Count', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="amount" fill="#82ca9d" name="Amount (₦M)" />
                        <Line yAxisId="right" type="monotone" dataKey="count" stroke="#8884d8" name="Number of Investments" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No monthly data available</p>}
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
                        <Bar dataKey="amount" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No investor data available</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Interest Rate Statistics */}
          <div className="row mb-4 g-3">
            <div className="col-md-12">
              <div className="card shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">📊 Interest Rate Analysis</h5>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-md-3">
                      <h6>Average Rate</h6>
                      <h3 className="text-primary">{avgRate.toFixed(1)}%</h3>
                    </div>
                    <div className="col-md-3">
                      <h6>Highest Rate</h6>
                      <h3 className="text-success">{maxRate.toFixed(1)}%</h3>
                    </div>
                    <div className="col-md-3">
                      <h6>Lowest Rate</h6>
                      <h3 className="text-info">{minRate.toFixed(1)}%</h3>
                    </div>
                    <div className="col-md-3">
                      <h6>Total ROI Expected</h6>
                      <h3 className="text-warning">{((totalAmount * avgRate / 100) / 1000000).toFixed(1)}M</h3>
                    </div>
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
            <div className="col-md-3">
              <label className="form-label">🔍 Search</label>
              <input type="text" className="form-control" placeholder="Search by investor or farm..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">📊 Status</label>
              <select className="form-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PAID">Paid</option>
                <option value="DEFAULTED">Defaulted</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">👨‍💼 Investor</label>
              <select className="form-select" value={selectedInvestor} onChange={(e) => setSelectedInvestor(e.target.value)}>
                <option value="">All Investors</option>
                {investors.map(inv => (
                  <option key={inv.farmers_id} value={inv.farmers_id}>
                    {inv.first_name} {inv.last_name}
                  </option>
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
            <div className="col-md-3 d-flex align-items-end">
              {(searchTerm || selectedStatus || selectedInvestor || selectedFarm || dateRange.start || dateRange.end) && (
                <button className="btn btn-outline-secondary w-100" onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('');
                  setSelectedInvestor('');
                  setSelectedFarm('');
                  setDateRange({ start: '', end: '' });
                }}>Clear Filters</button>
              )}
            </div>
          </div>
          <div className="row g-3 mt-2">
            <div className="col-md-3">
              <label className="form-label">📅 Date From</label>
              <input type="date" className="form-control" value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
            </div>
            <div className="col-md-3">
              <label className="form-label">📅 Date To</label>
              <input type="date" className="form-control" value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="alert alert-info mb-3">
        <strong>Showing {filteredInvestments.length}</strong> of {enrichedInvestments.length} investments
        <span className="ms-3">💰 Total: ₦{(filteredInvestments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) / 1000000).toFixed(1)}M</span>
      </div>

      {/* Investments Table */}
      {filteredInvestments.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No investments found</h5>
          <p>Try adjusting your search or filters, or add a new investment.</p>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead className="table-success">
                  <tr>
                    <th>ID</th>
                    <th>Investor</th>
                    <th>Farm</th>
                    <th>Amount</th>
                    <th>Interest Rate</th>
                    <th>Start Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    {token && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestments.map(investment => (
                    <tr key={investment.loans_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedInvestment(investment)}>
                      <td>{investment.loans_id}</td>
                      <td>
                        <strong>{investment.investor?.first_name} {investment.investor?.last_name}</strong><br />
                        <small className="text-muted">{investment.investor?.email}</small>
                       </td>
                      <td>
                        {investment.farm?.farm_name || '—'}<br />
                        <small className="text-muted">{investment.farm?.state}</small>
                       </td>
                      <td className="fw-bold text-success">₦{investment.amountM.toFixed(2)}M</td>
                      <td>{investment.interest_rate}%</td>
                      <td>{investment.start_date}</td>
                      <td className={investment.isOverdue ? 'text-danger fw-bold' : ''}>
                        {investment.due_date}
                        {investment.isOverdue && <span className="ms-1">⚠️</span>}
                      </td>
                      <td>{getStatusBadge(investment.status, investment.isOverdue)}</td>
                      {token && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-warning" onClick={() => {
                              setEditingInvestment(investment.loans_id);
                              setFormData({
                                farmers_id: investment.farmers_id?.farmers_id || '',
                                amount: investment.amount || '',
                                interest_rate: investment.interest_rate || '',
                                start_date: investment.start_date || '',
                                due_date: investment.due_date || '',
                                status: investment.status || 'PENDING'
                              });
                              setShowAddModal(true);
                            }}>Edit</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(investment.loans_id)}>Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr className="fw-bold">
                    <td colSpan="3" className="text-end">Totals:</td>
                    <td className="text-success">₦{(filteredInvestments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) / 1000000).toFixed(2)}M</td>
                    <td colSpan="5"></td>
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
                <h5 className="modal-title">{editingInvestment ? 'Edit Investment' : 'New Investment'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddEdit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Investor *</label>
                    <select className="form-select" value={formData.farmers_id} onChange={(e) => setFormData({...formData, farmers_id: e.target.value})} required>
                      <option value="">Select Investor</option>
                      {investors.map(inv => (
                        <option key={inv.farmers_id} value={inv.farmers_id}>
                          {inv.first_name} {inv.last_name} - {inv.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Investment Amount (₦) *</label>
                    <input type="number" step="0.01" className="form-control" value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Interest Rate (%) *</label>
                    <input type="number" step="0.1" className="form-control" value={formData.interest_rate}
                      onChange={(e) => setFormData({...formData, interest_rate: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Start Date *</label>
                    <input type="date" className="form-control" value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Due Date *</label>
                    <input type="date" className="form-control" value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PAID">Paid</option>
                      <option value="DEFAULTED">Defaulted</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Save Investment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Investment Details Modal */}
      {selectedInvestment && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Investment Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedInvestment(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>💰 Investment Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Investment ID:</th><td>{selectedInvestment.loans_id}</td></tr>
                        <tr><th>Amount:</th><td className="fw-bold text-success">₦{(selectedInvestment.amount / 1000000).toFixed(2)}M</td></tr>
                        <tr><th>Interest Rate:</th><td>{selectedInvestment.interest_rate}%</td></tr>
                        <tr><th>Start Date:</th><td>{selectedInvestment.start_date}</td></tr>
                        <tr><th>Due Date:</th><td className={selectedInvestment.isOverdue ? 'text-danger' : ''}>{selectedInvestment.due_date}</td></tr>
                        <tr><th>Status:</th><td>{getStatusBadge(selectedInvestment.status, selectedInvestment.isOverdue)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>👨‍💼 Investor Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Name:</th><td>{selectedInvestment.investor?.first_name} {selectedInvestment.investor?.last_name}</td></tr>
                        <tr><th>Email:</th><td>{selectedInvestment.investor?.email}</td></tr>
                        <tr><th>Phone:</th><td>{selectedInvestment.investor?.phone}</td></tr>
                        <tr><th>Location:</th><td>{selectedInvestment.investor?.state}, {selectedInvestment.investor?.lga}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {selectedInvestment.farm && (
                  <>
                    <hr />
                    <h6>🏠 Associated Farm</h6>
                    <Link to={`/farm/${selectedInvestment.farm.farms_id}`} className="text-decoration-none">
                      <div className="bg-light p-2 rounded">
                        <strong>{selectedInvestment.farm.farm_name}</strong><br />
                        {selectedInvestment.farm.state}, {selectedInvestment.farm.lga}<br />
                        {selectedInvestment.farm.area_hectares} hectares
                      </div>
                    </Link>
                    <div className="mt-3">
                      <h6>📊 Expected Returns</h6>
                      <div className="row text-center">
                        <div className="col-6">
                          <div className="bg-light p-2 rounded">
                            <small>Annual Interest</small>
                            <h5 className="text-success">₦{((selectedInvestment.amount * selectedInvestment.interest_rate / 100) / 1000000).toFixed(2)}M</h5>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="bg-light p-2 rounded">
                            <small>Total to Repay</small>
                            <h5 className="text-primary">₦{((selectedInvestment.amount * (1 + selectedInvestment.interest_rate / 100)) / 1000000).toFixed(2)}M</h5>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedInvestment(null)}>Close</button>
                {selectedInvestment.farm && (
                  <Link to={`/farm/${selectedInvestment.farm.farms_id}`} className="btn btn-success">
                    View Farm Details →
                  </Link>
                )}
                {token && (
                  <button className="btn btn-warning" onClick={() => {
                    setSelectedInvestment(null);
                    setEditingInvestment(selectedInvestment.loans_id);
                    setFormData({
                      farmers_id: selectedInvestment.farmers_id?.farmers_id || '',
                      amount: selectedInvestment.amount || '',
                      interest_rate: selectedInvestment.interest_rate || '',
                      start_date: selectedInvestment.start_date || '',
                      due_date: selectedInvestment.due_date || '',
                      status: selectedInvestment.status || 'PENDING'
                    });
                    setShowAddModal(true);
                  }}>Edit Investment</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}