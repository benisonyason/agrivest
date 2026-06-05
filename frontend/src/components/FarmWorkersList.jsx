    import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  AreaChart, Area
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FarmWorkersList() {
  const [workers, setWorkers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [farmBlocks, setFarmBlocks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [yields, setYields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    phone: '',
    daily_rate_ngn: '',
    farms_id: '',
    farm_blocks_id: '',
    hire_date: '',
    is_active: true
  });
  
  const { token } = useAuth();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching farm workers data...');
        const [workersRes, farmsRes, blocksRes, tasksRes, paymentsRes, yieldsRes] = await Promise.all([
          api.get('/farmworkers/'),
          api.get('/farms/'),
          api.get('/farmblocks/'),
          api.get('/workertasks/').catch(() => ({ data: [] })),
          api.get('/workerpayments/').catch(() => ({ data: [] })),
          api.get('/yields/').catch(() => ({ data: [] }))
        ]);
        
        setWorkers(Array.isArray(workersRes.data) ? workersRes.data : (workersRes.data?.results || []));
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
        setFarmBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : (blocksRes.data?.results || []));
        setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.results || []));
        setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : (paymentsRes.data?.results || []));
        setYields(Array.isArray(yieldsRes.data) ? yieldsRes.data : (yieldsRes.data?.results || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load farm workers data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Enrich workers with related data
  const enrichedWorkers = workers.map(worker => {
    const farm = farms.find(f => f.farms_id === worker.farms_id?.farms_id);
    const block = farmBlocks.find(b => b.farm_blocks_id === worker.farm_blocks_id?.farm_blocks_id);
    const workerTasks = tasks.filter(t => t.farm_workers_id?.farm_workers_id === worker.farm_workers_id);
    const workerPayments = payments.filter(p => p.farm_workers_id?.farm_workers_id === worker.farm_workers_id);
    
    // Calculate statistics
    const totalTasks = workerTasks.length;
    const completedTasks = workerTasks.filter(t => t.completed).length;
    const totalHours = workerTasks.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const totalEarned = workerPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const avgDailyRate = parseFloat(worker.daily_rate_ngn) || 0;
    
    // Calculate productivity (if linked to yields)
    const workerYields = yields.filter(y => y.farm_workers_id?.farm_workers_id === worker.farm_workers_id);
    const totalYieldContribution = workerYields.reduce((sum, y) => sum + (y.yield_tons || 0), 0);
    
    return {
      ...worker,
      farm,
      block,
      totalTasks,
      completedTasks,
      totalHours,
      totalEarned,
      avgDailyRate,
      totalYieldContribution,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0,
      avgHoursPerTask: totalTasks > 0 ? (totalHours / totalTasks).toFixed(1) : 0
    };
  });

  // Filter workers
  const filteredWorkers = enrichedWorkers.filter(worker => {
    const matchesSearch = searchTerm === '' || 
      (worker.name && worker.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (worker.phone && worker.phone.includes(searchTerm));
    
    const matchesRole = selectedRole === '' || worker.role === selectedRole;
    const matchesFarm = selectedFarm === '' || worker.farms_id?.farms_id?.toString() === selectedFarm;
    
    return matchesSearch && matchesRole && matchesFarm;
  });

  // Statistics
  const totalWorkers = workers.length;
  const activeWorkers = workers.filter(w => w.is_active).length;
  const inactiveWorkers = workers.filter(w => !w.is_active).length;
  
  const totalHoursWorked = enrichedWorkers.reduce((sum, w) => sum + w.totalHours, 0);
  const totalTasksCompleted = enrichedWorkers.reduce((sum, w) => sum + w.completedTasks, 0);
  const totalEarnedAll = enrichedWorkers.reduce((sum, w) => sum + w.totalEarned, 0);
  const totalYieldByWorkers = enrichedWorkers.reduce((sum, w) => sum + w.totalYieldContribution, 0);
  
  const avgDailyRate = enrichedWorkers.reduce((sum, w) => sum + w.avgDailyRate, 0) / (totalWorkers || 1);
  const avgCompletionRate = enrichedWorkers.reduce((sum, w) => sum + parseFloat(w.completionRate), 0) / (totalWorkers || 1);
  
  // Role distribution
  const roleDistribution = {};
  workers.forEach(w => {
    if (w.role) {
      roleDistribution[w.role] = (roleDistribution[w.role] || 0) + 1;
    }
  });
  const roleChartData = Object.entries(roleDistribution).map(([role, count]) => ({ 
    role: role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    count 
  }));
  
  // Top productive workers
  const topProductive = [...enrichedWorkers]
    .sort((a, b) => b.totalYieldContribution - a.totalYieldContribution)
    .slice(0, 5);
  
  // Monthly earnings trend (if payment dates available)
  const monthlyEarnings = {};
  payments.forEach(p => {
    if (p.payment_date) {
      const month = p.payment_date.slice(0, 7);
      monthlyEarnings[month] = (monthlyEarnings[month] || 0) + (parseFloat(p.amount) || 0);
    }
  });
  const monthlyEarningsData = Object.entries(monthlyEarnings)
    .map(([month, amount]) => ({ month, amount: amount / 1000000 }))
    .sort((a, b) => a.month.localeCompare(b.month));
  
  // Worker performance ranking
  const workerPerformance = [...enrichedWorkers]
    .sort((a, b) => (b.totalYieldContribution / b.totalHours || 0) - (a.totalYieldContribution / a.totalHours || 0))
    .slice(0, 5);

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'FARM_MANAGER': return 'bg-danger';
      case 'SUPERVISOR': return 'bg-warning text-dark';
      case 'FIELD_WORKER': return 'bg-success';
      case 'HARVESTER': return 'bg-info';
      case 'EQUIPMENT_OPERATOR': return 'bg-primary';
      default: return 'bg-secondary';
    }
  };

  const getRoleDisplay = (role) => {
    switch(role) {
      case 'FARM_MANAGER': return 'Farm Manager';
      case 'SUPERVISOR': return 'Supervisor';
      case 'FIELD_WORKER': return 'Field Worker';
      case 'HARVESTER': return 'Harvester';
      case 'EQUIPMENT_OPERATOR': return 'Equipment Operator';
      default: return role || 'N/A';
    }
  };

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit workers');
      return;
    }
    
    try {
      if (editingWorker) {
        await api.put(`/farmworkers/${editingWorker}/`, formData);
      } else {
        await api.post('/farmworkers/', formData);
      }
      setShowAddModal(false);
      setEditingWorker(null);
      setFormData({
        name: '',
        role: '',
        phone: '',
        daily_rate_ngn: '',
        farms_id: '',
        farm_blocks_id: '',
        hire_date: '',
        is_active: true
      });
      // Refresh data
      const workersRes = await api.get('/farmworkers/');
      setWorkers(Array.isArray(workersRes.data) ? workersRes.data : (workersRes.data?.results || []));
    } catch (err) {
      console.error('Error saving worker:', err);
      alert('Error saving worker');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this worker? This will affect all related tasks and payments.')) return;
    try {
      await api.delete(`/farmworkers/${id}/`);
      const workersRes = await api.get('/farmworkers/');
      setWorkers(Array.isArray(workersRes.data) ? workersRes.data : (workersRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting worker:', err);
      alert('Error deleting worker');
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading farm workers data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Farm Workers</h4>
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
          <h1 className="display-5 mb-0">👷 Farm Workers</h1>
          <p className="text-muted">Manage workforce, track productivity, and monitor payments</p>
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
              setEditingWorker(null);
              setFormData({
                name: '',
                role: '',
                phone: '',
                daily_rate_ngn: '',
                farms_id: '',
                farm_blocks_id: '',
                hire_date: new Date().toISOString().split('T')[0],
                is_active: true
              });
              setShowAddModal(true);
            }}>
              + Add Worker
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
                  <h6 className="card-title">Total Workforce</h6>
                  <h2 className="mb-0">{totalWorkers}</h2>
                  <small>{activeWorkers} Active • {inactiveWorkers} Inactive</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-success h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Productivity</h6>
                  <h2 className="mb-0">{totalTasksCompleted}</h2>
                  <small>Tasks Completed • {totalHoursWorked.toFixed(0)} hours</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-warning h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Earnings</h6>
                  <h2 className="mb-0">₦{(totalEarnedAll / 1000000).toFixed(1)}M</h2>
                  <small>Avg Daily Rate: ₦{avgDailyRate.toLocaleString()}</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-info h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Completion Rate</h6>
                  <h2 className="mb-0">{avgCompletionRate.toFixed(1)}%</h2>
                  <small>Task completion average</small>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">👥 Workforce by Role</h5>
                </div>
                <div className="card-body">
                  {roleChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={roleChartData} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={100} label>
                          {roleChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No role data available</p>}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">📈 Monthly Earnings Trend</h5>
                </div>
                <div className="card-body">
                  {monthlyEarningsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={monthlyEarningsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis label={{ value: 'Millions (₦)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => `₦${value}M`} />
                        <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No earnings data available</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Rankings */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🏆 Top Productive Workers (Yield Contribution)</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-success">
                        <tr><th>Rank</th><th>Worker</th><th>Role</th><th>Yield (tons)</th></tr>
                      </thead>
                      <tbody>
                        {topProductive.map((worker, i) => (
                          <tr key={i}>
                            <td><span className="badge bg-success">{i + 1}</span></td>
                            <td><strong>{worker.name}</strong></td>
                            <td>{getRoleDisplay(worker.role)}</td>
                            <td>{worker.totalYieldContribution.toFixed(1)} tons</td>
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
                  <h5 className="mb-0">📊 Top Performers (Efficiency)</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-success">
                        <tr><th>Rank</th><th>Worker</th><th>Role</th><th>Tasks</th><th>Hours</th><th>Yield/Hour</th></tr>
                      </thead>
                      <tbody>
                        {workerPerformance.map((worker, i) => (
                          <tr key={i}>
                            <td><span className="badge bg-info">{i + 1}</span></td>
                            <td><strong>{worker.name}</strong></td>
                            <td>{getRoleDisplay(worker.role)}</td>
                            <td>{worker.completedTasks}</td>
                            <td>{worker.totalHours.toFixed(0)}</td>
                            <td>{(worker.totalYieldContribution / (worker.totalHours || 1)).toFixed(2)}</td>
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
            <div className="col-md-4">
              <label className="form-label">🔍 Search Workers</label>
              <input type="text" className="form-control" placeholder="Search by name or phone..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">👔 Role</label>
              <select className="form-select" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                <option value="">All Roles</option>
                <option value="FARM_MANAGER">Farm Manager</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="FIELD_WORKER">Field Worker</option>
                <option value="HARVESTER">Harvester</option>
                <option value="EQUIPMENT_OPERATOR">Equipment Operator</option>
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
            <div className="col-md-2 d-flex align-items-end">
              {(searchTerm || selectedRole || selectedFarm) && (
                <button className="btn btn-outline-secondary w-100" onClick={() => {
                  setSearchTerm('');
                  setSelectedRole('');
                  setSelectedFarm('');
                }}>Clear Filters</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="alert alert-info mb-3">
        <strong>Showing {filteredWorkers.length}</strong> of {enrichedWorkers.length} workers
        <span className="ms-3">💰 Total Earnings: ₦{(filteredWorkers.reduce((sum, w) => sum + w.totalEarned, 0) / 1000000).toFixed(1)}M</span>
      </div>

      {/* Workers Grid */}
      {filteredWorkers.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No workers found</h5>
          <p>Try adjusting your search or filters, or add a new worker.</p>
        </div>
      ) : (
        <div className="row g-4">
          {filteredWorkers.map(worker => (
            <div key={worker.farm_workers_id} className="col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm hover-shadow">
                <div className={`card-header ${worker.is_active ? 'bg-success' : 'bg-secondary'} text-white`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="bi bi-person-badge me-2"></i>
                      {worker.name || `Worker ${worker.farm_workers_id}`}
                    </h5>
                    <span className={`badge ${worker.is_active ? 'bg-light text-dark' : 'bg-dark'}`}>
                      {worker.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">👔 Role:</span>
                      <span className={`badge ${getRoleBadgeColor(worker.role)}`}>
                        {getRoleDisplay(worker.role)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">📞 Phone:</span>
                      <span>{worker.phone || 'N/A'}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">💰 Daily Rate:</span>
                      <span className="fw-bold text-success">₦{worker.daily_rate_ngn?.toLocaleString() || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">🏠 Farm:</span>
                      <span>{worker.farm?.farm_name || 'Not Assigned'}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">📅 Hired:</span>
                      <span>{worker.hire_date || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Performance Stats */}
                  <div className="bg-light p-2 rounded mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Tasks Completed:</small>
                      <strong>{worker.completedTasks} / {worker.totalTasks}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Total Hours:</small>
                      <strong>{worker.totalHours.toFixed(0)} hrs</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Total Earned:</small>
                      <strong className="text-success">₦{(worker.totalEarned / 1000000).toFixed(2)}M</strong>
                    </div>
                    <div className="progress mt-2" style={{ height: '5px' }}>
                      <div className="progress-bar bg-success" style={{ width: `${worker.completionRate}%` }}></div>
                    </div>
                    <small className="text-muted">Completion Rate: {worker.completionRate}%</small>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-outline-primary btn-sm flex-grow-1"
                      onClick={() => setSelectedWorker(worker)}
                    >
                      View Details
                    </button>
                    {worker.farm && (
                      <Link to={`/farm/${worker.farm.farms_id}`} className="btn btn-outline-info btn-sm">
                        Farm
                      </Link>
                    )}
                    {token && (
                      <>
                        <button className="btn btn-outline-warning btn-sm" onClick={() => {
                          setEditingWorker(worker.farm_workers_id);
                          setFormData({
                            name: worker.name || '',
                            role: worker.role || '',
                            phone: worker.phone || '',
                            daily_rate_ngn: worker.daily_rate_ngn || '',
                            farms_id: worker.farms_id?.farms_id || '',
                            farm_blocks_id: worker.farm_blocks_id?.farm_blocks_id || '',
                            hire_date: worker.hire_date || '',
                            is_active: worker.is_active
                          });
                          setShowAddModal(true);
                        }}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(worker.farm_workers_id)}>Del</button>
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
                <h5 className="modal-title">{editingWorker ? 'Edit Worker' : 'Add New Worker'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddEdit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Full Name *</label>
                    <input type="text" className="form-control" value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role *</label>
                    <select className="form-select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} required>
                      <option value="">Select Role</option>
                      <option value="FARM_MANAGER">Farm Manager</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="FIELD_WORKER">Field Worker</option>
                      <option value="HARVESTER">Harvester</option>
                      <option value="EQUIPMENT_OPERATOR">Equipment Operator</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Phone Number</label>
                    <input type="tel" className="form-control" placeholder="+234XXXXXXXXXX" value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Daily Rate (₦) *</label>
                    <input type="number" step="0.01" className="form-control" value={formData.daily_rate_ngn}
                      onChange={(e) => setFormData({...formData, daily_rate_ngn: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Farm</label>
                    <select className="form-select" value={formData.farms_id} onChange={(e) => setFormData({...formData, farms_id: e.target.value})}>
                      <option value="">Select Farm</option>
                      {farms.map(farm => (
                        <option key={farm.farms_id} value={farm.farms_id}>{farm.farm_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Hire Date</label>
                    <input type="date" className="form-control" value={formData.hire_date}
                      onChange={(e) => setFormData({...formData, hire_date: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input type="checkbox" className="form-check-input" checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                      <label className="form-check-label">Active Worker</label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Save Worker</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Worker Details Modal */}
      {selectedWorker && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Worker Details: {selectedWorker.name}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedWorker(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>📋 Personal Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Worker ID:</th><td>{selectedWorker.farm_workers_id}</td></tr>
                        <tr><th>Name:</th><td>{selectedWorker.name}</td></tr>
                        <tr><th>Role:</th><td><span className={`badge ${getRoleBadgeColor(selectedWorker.role)}`}>{getRoleDisplay(selectedWorker.role)}</span></td></tr>
                        <tr><th>Phone:</th><td>{selectedWorker.phone || 'N/A'}</td></tr>
                        <tr><th>Hire Date:</th><td>{selectedWorker.hire_date || 'N/A'}</td></tr>
                        <tr><th>Status:</th><td>{selectedWorker.is_active ? 'Active' : 'Inactive'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>💰 Compensation</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Daily Rate:</th><td className="fw-bold text-success">₦{selectedWorker.daily_rate_ngn?.toLocaleString()}</td></tr>
                        <tr><th>Total Earned:</th><td className="fw-bold">₦{(selectedWorker.totalEarned / 1000000).toFixed(2)}M</td></tr>
                        <tr><th>Avg Hours/Task:</th><td>{selectedWorker.avgHoursPerTask} hrs</td></tr>
                        <tr><th>Avg Yield/Task:</th><td>{(selectedWorker.totalYieldContribution / (selectedWorker.totalTasks || 1)).toFixed(2)} tons</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedWorker.farm && (
                  <>
                    <hr />
                    <h6>🏠 Assigned Farm</h6>
                    <Link to={`/farm/${selectedWorker.farm.farms_id}`} className="text-decoration-none">
                      <div className="bg-light p-2 rounded">
                        <strong>{selectedWorker.farm.farm_name}</strong><br />
                        {selectedWorker.farm.state}, {selectedWorker.farm.lga}<br />
                        {selectedWorker.farm.area_hectares} hectares
                      </div>
                    </Link>
                  </>
                )}

                {selectedWorker.totalTasks > 0 && (
                  <>
                    <hr />
                    <h6>📊 Performance Summary</h6>
                    <div className="row text-center">
                      <div className="col-3">
                        <div className="bg-light p-2 rounded">
                          <small>Tasks</small>
                          <h5>{selectedWorker.completedTasks}/{selectedWorker.totalTasks}</h5>
                        </div>
                      </div>
                      <div className="col-3">
                        <div className="bg-light p-2 rounded">
                          <small>Hours</small>
                          <h5>{selectedWorker.totalHours.toFixed(0)}</h5>
                        </div>
                      </div>
                      <div className="col-3">
                        <div className="bg-light p-2 rounded">
                          <small>Completion</small>
                          <h5>{selectedWorker.completionRate}%</h5>
                        </div>
                      </div>
                      <div className="col-3">
                        <div className="bg-light p-2 rounded">
                          <small>Yield</small>
                          <h5>{selectedWorker.totalYieldContribution.toFixed(1)} t</h5>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedWorker(null)}>Close</button>
                {selectedWorker.farm && (
                  <Link to={`/farm/${selectedWorker.farm.farms_id}`} className="btn btn-success">View Farm →</Link>
                )}
                {token && (
                  <button className="btn btn-warning" onClick={() => {
                    setSelectedWorker(null);
                    setEditingWorker(selectedWorker.farm_workers_id);
                    setFormData({
                      name: selectedWorker.name || '',
                      role: selectedWorker.role || '',
                      phone: selectedWorker.phone || '',
                      daily_rate_ngn: selectedWorker.daily_rate_ngn || '',
                      farms_id: selectedWorker.farms_id?.farms_id || '',
                      farm_blocks_id: selectedWorker.farm_blocks_id?.farm_blocks_id || '',
                      hire_date: selectedWorker.hire_date || '',
                      is_active: selectedWorker.is_active
                    });
                    setShowAddModal(true);
                  }}>Edit Worker</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}