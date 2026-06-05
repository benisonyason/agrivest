import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  AreaChart, Area, ComposedChart
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function WorkerPaymentsList() {
  const [payments, setPayments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [formData, setFormData] = useState({
    farm_workers_id: '',
    payment_date: '',
    amount: '',
    payment_period_start: '',
    payment_period_end: '',
    payment_method: 'BANK_TRANSFER',
    reference_number: ''
  });
  
  const { token } = useAuth();
  const COLORS = ['#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6c757d', '#007bff', '#6610f2', '#fd7e14'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching worker payments data...');
        const [paymentsRes, workersRes, farmsRes, tasksRes] = await Promise.all([
          api.get('/workerpayments/'),
          api.get('/farmworkers/'),
          api.get('/farms/'),
          api.get('/workertasks/')
        ]);
        
        setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : (paymentsRes.data?.results || []));
        setWorkers(Array.isArray(workersRes.data) ? workersRes.data : (workersRes.data?.results || []));
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
        setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.results || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load worker payments data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Enrich payments with related data
  const enrichedPayments = payments.map(payment => {
    const worker = workers.find(w => w.farm_workers_id === payment.farm_workers_id?.farm_workers_id);
    const farm = worker ? farms.find(f => f.farms_id === worker.farms_id?.farms_id) : null;
    const workerTasks = tasks.filter(t => t.farm_workers_id?.farm_workers_id === worker?.farm_workers_id);
    const tasksInPeriod = workerTasks.filter(t => 
      t.date_assigned && payment.payment_period_start && payment.payment_period_end &&
      t.date_assigned >= payment.payment_period_start && 
      t.date_assigned <= payment.payment_period_end
    );
    const totalHoursInPeriod = tasksInPeriod.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const expectedEarnings = (worker?.daily_rate_ngn || 0) * (totalHoursInPeriod / 8);
    
    return {
      ...payment,
      worker,
      farm,
      tasksInPeriod: tasksInPeriod.length,
      totalHoursInPeriod,
      expectedEarnings,
      amountM: (parseFloat(payment.amount) || 0) / 1000000,
      periodDays: payment.payment_period_start && payment.payment_period_end ?
        Math.ceil((new Date(payment.payment_period_end) - new Date(payment.payment_period_start)) / (1000 * 60 * 60 * 24)) : 0
    };
  });

  // Filter payments
  const filteredPayments = enrichedPayments.filter(payment => {
    const matchesSearch = searchTerm === '' || 
      (payment.worker?.name && payment.worker.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.reference_number && payment.reference_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesWorker = selectedWorker === '' || payment.farm_workers_id?.farm_workers_id?.toString() === selectedWorker;
    const matchesMethod = selectedMethod === '' || payment.payment_method === selectedMethod;
    
    const matchesDate = (!dateRange.start || (payment.payment_date && payment.payment_date >= dateRange.start)) &&
                        (!dateRange.end || (payment.payment_date && payment.payment_date <= dateRange.end));
    
    return matchesSearch && matchesWorker && matchesMethod && matchesDate;
  });

  // Statistics
  const totalPayments = payments.length;
  const totalAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const avgPayment = totalPayments > 0 ? totalAmount / totalPayments : 0;
  
  // Payment methods distribution
  const methodDistribution = {};
  payments.forEach(p => {
    if (p.payment_method) {
      methodDistribution[p.payment_method] = (methodDistribution[p.payment_method] || 0) + (parseFloat(p.amount) || 0);
    }
  });
  const methodChartData = Object.entries(methodDistribution).map(([method, amount]) => ({ 
    method: method.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    amount: amount / 1000000 
  }));
  
  // Monthly payment trends
  const monthlyPayments = {};
  payments.forEach(p => {
    if (p.payment_date) {
      const month = p.payment_date.slice(0, 7);
      if (!monthlyPayments[month]) {
        monthlyPayments[month] = { month, total: 0, count: 0, avg: 0 };
      }
      monthlyPayments[month].total += parseFloat(p.amount) || 0;
      monthlyPayments[month].count += 1;
    }
  });
  const monthlyData = Object.values(monthlyPayments)
    .map(m => ({ ...m, total: m.total / 1000000, avg: m.total / m.count / 1000000 }))
    .sort((a, b) => a.month.localeCompare(b.month));
  
  // Top earning workers
  const workerEarnings = {};
  enrichedPayments.forEach(p => {
    const workerName = p.worker?.name || 'Unknown';
    if (!workerEarnings[workerName]) {
      workerEarnings[workerName] = { total: 0, count: 0, avg: 0 };
    }
    workerEarnings[workerName].total += parseFloat(p.amount) || 0;
    workerEarnings[workerName].count += 1;
  });
  const topEarners = Object.entries(workerEarnings)
    .map(([name, data]) => ({
      name,
      total: data.total / 1000000,
      count: data.count,
      avg: (data.total / data.count) / 1000000
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  
  // Recent payments
  const recentPayments = [...enrichedPayments]
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
    .slice(0, 10);
  
  // Payment efficiency (payment vs expected)
  const paymentEfficiency = enrichedPayments.map(p => ({
    worker: p.worker?.name || 'Unknown',
    actual: (parseFloat(p.amount) || 0) / 1000000,
    expected: p.expectedEarnings / 1000000,
    difference: ((parseFloat(p.amount) || 0) - p.expectedEarnings) / 1000000
  })).filter(p => p.expected > 0);
  
  const totalPaid = totalAmount / 1000000;
  const totalExpected = enrichedPayments.reduce((sum, p) => sum + p.expectedEarnings, 0) / 1000000;
  const paymentAccuracy = totalExpected > 0 ? (totalPaid / totalExpected * 100) : 0;

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit payments');
      return;
    }
    
    try {
      if (editingPayment) {
        await api.put(`/workerpayments/${editingPayment}/`, formData);
      } else {
        await api.post('/workerpayments/', formData);
      }
      setShowAddModal(false);
      setEditingPayment(null);
      setFormData({
        farm_workers_id: '',
        payment_date: '',
        amount: '',
        payment_period_start: '',
        payment_period_end: '',
        payment_method: 'BANK_TRANSFER',
        reference_number: ''
      });
      // Refresh data
      const paymentsRes = await api.get('/workerpayments/');
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : (paymentsRes.data?.results || []));
    } catch (err) {
      console.error('Error saving payment:', err);
      alert('Error saving payment');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await api.delete(`/workerpayments/${id}/`);
      const paymentsRes = await api.get('/workerpayments/');
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : (paymentsRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting payment:', err);
      alert('Error deleting payment');
    }
  };

  const getMethodBadge = (method) => {
    switch(method) {
      case 'BANK_TRANSFER': return <span className="badge bg-primary">🏦 Bank Transfer</span>;
      case 'CASH': return <span className="badge bg-success">💵 Cash</span>;
      case 'CHEQUE': return <span className="badge bg-warning text-dark">📝 Cheque</span>;
      case 'MOBILE_MONEY': return <span className="badge bg-info">📱 Mobile Money</span>;
      default: return <span className="badge bg-secondary">{method}</span>;
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading worker payments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Payments</h4>
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
          <h1 className="display-5 mb-0">💰 Worker Payments</h1>
          <p className="text-muted">Track and manage all worker compensation and payroll</p>
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
              setEditingPayment(null);
              setFormData({
                farm_workers_id: '',
                payment_date: new Date().toISOString().split('T')[0],
                amount: '',
                payment_period_start: '',
                payment_period_end: '',
                payment_method: 'BANK_TRANSFER',
                reference_number: ''
              });
              setShowAddModal(true);
            }}>
              + Record Payment
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
                  <h6 className="card-title">Total Payments</h6>
                  <h2 className="mb-0">{totalPayments}</h2>
                  <small>payment transactions</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-success h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Amount Paid</h6>
                  <h2 className="mb-0">₦{(totalAmount / 1000000).toFixed(1)}M</h2>
                  <small>₦{(avgPayment / 1000).toFixed(0)}K average payment</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-warning h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Unique Workers</h6>
                  <h2 className="mb-0">{Object.keys(workerEarnings).length}</h2>
                  <small>receiving payments</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-info h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Payment Accuracy</h6>
                  <h2 className="mb-0">{paymentAccuracy.toFixed(1)}%</h2>
                  <small>actual vs expected</small>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">💳 Payment Methods Distribution</h5>
                </div>
                <div className="card-body">
                  {methodChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={methodChartData} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={100} label>
                          {methodChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₦${value}M`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No payment method data available</p>}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">📈 Monthly Payment Trends</h5>
                </div>
                <div className="card-body">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" label={{ value: 'Millions (₦)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Count', angle: 90, position: 'insideRight' }} />
                        <Tooltip formatter={(value, name) => 
                          name === 'total' ? `₦${value}M` : value
                        } />
                        <Legend />
                        <Bar yAxisId="left" dataKey="total" fill="#82ca9d" name="Total Paid (₦M)" />
                        <Line yAxisId="right" type="monotone" dataKey="count" stroke="#8884d8" name="Number of Payments" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No monthly data available</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🏆 Top Earning Workers</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-success">
                        <tr><th>Rank</th><th>Worker</th><th>Total Paid (₦M)</th><th>Payments</th><th>Avg Payment (₦M)</th></tr>
                      </thead>
                      <tbody>
                        {topEarners.map((worker, i) => (
                          <tr key={i}>
                            <td><span className="badge bg-success">{i + 1}</span></td>
                            <td><strong>{worker.name}</strong></td>
                            <td>₦{worker.total.toFixed(2)}M</td>
                            <td>{worker.count}</td>
                            <td>₦{worker.avg.toFixed(2)}M</td>
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
                  <h5 className="mb-0">📊 Payment vs Expected Earnings</h5>
                </div>
                <div className="card-body">
                  {paymentEfficiency.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={paymentEfficiency.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="worker" angle={-45} textAnchor="end" height={80} />
                        <YAxis label={{ value: 'Millions (₦)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => `₦${value}M`} />
                        <Legend />
                        <Bar dataKey="actual" fill="#28a745" name="Actual Paid" />
                        <Bar dataKey="expected" fill="#ffc107" name="Expected Based on Hours" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No efficiency data available</p>}
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
              <label className="form-label">🔍 Search Payments</label>
              <input type="text" className="form-control" placeholder="Search by worker or reference..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">👷 Worker</label>
              <select className="form-select" value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)}>
                <option value="">All Workers</option>
                {workers.map(worker => (
                  <option key={worker.farm_workers_id} value={worker.farm_workers_id}>{worker.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">💳 Payment Method</label>
              <select className="form-select" value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
                <option value="">All Methods</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              {(searchTerm || selectedWorker || selectedMethod || dateRange.start || dateRange.end) && (
                <button className="btn btn-outline-secondary w-100" onClick={() => {
                  setSearchTerm('');
                  setSelectedWorker('');
                  setSelectedMethod('');
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
        <strong>Showing {filteredPayments.length}</strong> of {enrichedPayments.length} payments
        <span className="ms-3">💰 Total: ₦{(filteredPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) / 1000000).toFixed(2)}M</span>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No payments found</h5>
          <p>Try adjusting your search or filters, or record a new payment.</p>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead className="table-success">
                  <tr>
                    <th>ID</th>
                    <th>Payment Date</th>
                    <th>Worker</th>
                    <th>Farm</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    {token && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(payment => (
                    <tr key={payment.worker_payments_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPayment(payment)}>
                      <td>{payment.worker_payments_id}</td>
                      <td>{payment.payment_date}</td>
                      <td>
                        <strong>{payment.worker?.name || 'Unknown'}</strong><br />
                        <small className="text-muted">{payment.worker?.role?.replace('_', ' ')}</small>
                      </td>
                      <td>{payment.farm?.farm_name || 'N/A'}</td>
                      <td>
                        {payment.payment_period_start}<br />
                        <small>to {payment.payment_period_end}</small>
                      </td>
                      <td className="fw-bold text-success">₦{(payment.amount / 1000000).toFixed(2)}M</td>
                      <td>{getMethodBadge(payment.payment_method)}</td>
                      <td><small>{payment.reference_number || 'N/A'}</small></td>
                      {token && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-warning" onClick={() => {
                              setEditingPayment(payment.worker_payments_id);
                              setFormData({
                                farm_workers_id: payment.farm_workers_id?.farm_workers_id || '',
                                payment_date: payment.payment_date || '',
                                amount: payment.amount || '',
                                payment_period_start: payment.payment_period_start || '',
                                payment_period_end: payment.payment_period_end || '',
                                payment_method: payment.payment_method || 'BANK_TRANSFER',
                                reference_number: payment.reference_number || ''
                              });
                              setShowAddModal(true);
                            }}>Edit</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(payment.worker_payments_id)}>Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr className="fw-bold">
                    <td colSpan="5" className="text-end">Totals:</td>
                    <td className="text-success">₦{(filteredPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) / 1000000).toFixed(2)}M</td>
                    <td colSpan={token ? 3 : 2}></td>
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
                <h5 className="modal-title">{editingPayment ? 'Edit Payment' : 'Record New Payment'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddEdit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Worker *</label>
                    <select className="form-select" value={formData.farm_workers_id} onChange={(e) => setFormData({...formData, farm_workers_id: e.target.value})} required>
                      <option value="">Select Worker</option>
                      {workers.map(worker => (
                        <option key={worker.farm_workers_id} value={worker.farm_workers_id}>
                          {worker.name} - {worker.role?.replace('_', ' ')} (₦{worker.daily_rate_ngn?.toLocaleString()}/day)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Payment Date *</label>
                      <input type="date" className="form-control" value={formData.payment_date}
                        onChange={(e) => setFormData({...formData, payment_date: e.target.value})} required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Amount (₦) *</label>
                      <input type="number" step="0.01" className="form-control" value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Period Start</label>
                      <input type="date" className="form-control" value={formData.payment_period_start}
                        onChange={(e) => setFormData({...formData, payment_period_start: e.target.value})} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Period End</label>
                      <input type="date" className="form-control" value={formData.payment_period_end}
                        onChange={(e) => setFormData({...formData, payment_period_end: e.target.value})} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})}>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Reference Number</label>
                    <input type="text" className="form-control" placeholder="Transaction/Cheque number" value={formData.reference_number}
                      onChange={(e) => setFormData({...formData, reference_number: e.target.value})} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Save Payment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Payment Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedPayment(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>💰 Payment Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Payment ID:</th><td>{selectedPayment.worker_payments_id}</td></tr>
                        <tr><th>Date:</th><td>{selectedPayment.payment_date}</td></tr>
                        <tr><th>Amount:</th><td className="fw-bold text-success">₦{(selectedPayment.amount / 1000000).toFixed(2)}M</td></tr>
                        <tr><th>Method:</th><td>{getMethodBadge(selectedPayment.payment_method)}</td></tr>
                        <tr><th>Reference:</th><td>{selectedPayment.reference_number || 'N/A'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>📅 Period Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Period Start:</th><td>{selectedPayment.payment_period_start || 'N/A'}</td></tr>
                        <tr><th>Period End:</th><td>{selectedPayment.payment_period_end || 'N/A'}</td></tr>
                        <tr><th>Days Covered:</th><td>{selectedPayment.periodDays} days</td></tr>
                        <tr><th>Tasks in Period:</th><td>{selectedPayment.tasksInPeriod}</td></tr>
                        <tr><th>Hours Worked:</th><td>{selectedPayment.totalHoursInPeriod} hours</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {selectedPayment.worker && (
                  <>
                    <hr />
                    <h6>👷 Worker Information</h6>
                    <div className="row">
                      <div className="col-md-6">
                        <p><strong>Name:</strong> {selectedPayment.worker.name}</p>
                        <p><strong>Role:</strong> {selectedPayment.worker.role?.replace('_', ' ')}</p>
                        <p><strong>Daily Rate:</strong> ₦{selectedPayment.worker.daily_rate_ngn?.toLocaleString()}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Phone:</strong> {selectedPayment.worker.phone || 'N/A'}</p>
                        <p><strong>Hire Date:</strong> {selectedPayment.worker.hire_date || 'N/A'}</p>
                        <p><strong>Status:</strong> {selectedPayment.worker.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>
                  </>
                )}
                {selectedPayment.farm && (
                  <>
                    <hr />
                    <h6>🏠 Associated Farm</h6>
                    <Link to={`/farm/${selectedPayment.farm.farms_id}`} className="text-decoration-none">
                      <div className="bg-light p-2 rounded">
                        <strong>{selectedPayment.farm.farm_name}</strong><br />
                        {selectedPayment.farm.state}, {selectedPayment.farm.lga}<br />
                        {selectedPayment.farm.area_hectares} hectares
                      </div>
                    </Link>
                  </>
                )}
                {selectedPayment.expectedEarnings > 0 && (
                  <>
                    <hr />
                    <h6>📊 Payment Analysis</h6>
                    <div className="row text-center">
                      <div className="col-6">
                        <div className="bg-light p-2 rounded">
                          <small>Expected Based on Hours</small>
                          <h5 className="text-warning">₦{(selectedPayment.expectedEarnings / 1000000).toFixed(2)}M</h5>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="bg-light p-2 rounded">
                          <small>Difference</small>
                          <h5 className={`${selectedPayment.amount - selectedPayment.expectedEarnings >= 0 ? 'text-success' : 'text-danger'}`}>
                            {selectedPayment.amount - selectedPayment.expectedEarnings >= 0 ? '+' : ''}
                            ₦{((selectedPayment.amount - selectedPayment.expectedEarnings) / 1000000).toFixed(2)}M
                          </h5>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedPayment(null)}>Close</button>
                {selectedPayment.farm && (
                  <Link to={`/farm/${selectedPayment.farm.farms_id}`} className="btn btn-success">View Farm →</Link>
                )}
                {token && (
                  <button className="btn btn-warning" onClick={() => {
                    setSelectedPayment(null);
                    setEditingPayment(selectedPayment.worker_payments_id);
                    setFormData({
                      farm_workers_id: selectedPayment.farm_workers_id?.farm_workers_id || '',
                      payment_date: selectedPayment.payment_date || '',
                      amount: selectedPayment.amount || '',
                      payment_period_start: selectedPayment.payment_period_start || '',
                      payment_period_end: selectedPayment.payment_period_end || '',
                      payment_method: selectedPayment.payment_method || 'BANK_TRANSFER',
                      reference_number: selectedPayment.reference_number || ''
                    });
                    setShowAddModal(true);
                  }}>Edit Payment</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}