import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  AreaChart, Area, ComposedChart
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function WorkerTasksList() {
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTask, setSelectedTask] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [formData, setFormData] = useState({
    task_description: '',
    date_assigned: '',
    hours_worked: '',
    task_cost_ngn: '',
    completed: false,
    completed_date: '',
    farm_workers_id: ''
  });
  
  const { token } = useAuth();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching worker tasks data...');
        const [tasksRes, workersRes, farmsRes] = await Promise.all([
          api.get('/workertasks/'),
          api.get('/farmworkers/'),
          api.get('/farms/')
        ]);
        
        setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.results || []));
        setWorkers(Array.isArray(workersRes.data) ? workersRes.data : (workersRes.data?.results || []));
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.results || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load worker tasks data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Enrich tasks with related data
  const enrichedTasks = tasks.map(task => {
    const worker = workers.find(w => w.farm_workers_id === task.farm_workers_id?.farm_workers_id);
    const farm = worker ? farms.find(f => f.farms_id === worker.farms_id?.farms_id) : null;
    const costPerHour = task.hours_worked > 0 ? (parseFloat(task.task_cost_ngn) || 0) / task.hours_worked : 0;
    
    return {
      ...task,
      worker,
      farm,
      costPerHour,
      isOverdue: !task.completed && task.date_assigned && 
        (new Date(task.date_assigned) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    };
  });

  // Filter tasks
  const filteredTasks = enrichedTasks.filter(task => {
    const matchesSearch = searchTerm === '' || 
      (task.task_description && task.task_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.worker?.name && task.worker.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesWorker = selectedWorker === '' || task.farm_workers_id?.farm_workers_id?.toString() === selectedWorker;
    const matchesStatus = selectedStatus === '' || 
      (selectedStatus === 'completed' && task.completed) ||
      (selectedStatus === 'pending' && !task.completed);
    
    const matchesDate = (!dateRange.start || (task.date_assigned && task.date_assigned >= dateRange.start)) &&
                        (!dateRange.end || (task.date_assigned && task.date_assigned <= dateRange.end));
    
    return matchesSearch && matchesWorker && matchesStatus && matchesDate;
  });

  // Statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const totalHours = tasks.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
  const totalCost = tasks.reduce((sum, t) => sum + (parseFloat(t.task_cost_ngn) || 0), 0);
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0;
  const avgHoursPerTask = totalTasks > 0 ? totalHours / totalTasks : 0;
  const avgCostPerTask = totalTasks > 0 ? totalCost / totalTasks : 0;
  
  // Tasks by worker
  const tasksByWorker = {};
  enrichedTasks.forEach(task => {
    const workerName = task.worker?.name || 'Unknown';
    if (!tasksByWorker[workerName]) {
      tasksByWorker[workerName] = { total: 0, completed: 0, hours: 0, cost: 0 };
    }
    tasksByWorker[workerName].total += 1;
    tasksByWorker[workerName].completed += task.completed ? 1 : 0;
    tasksByWorker[workerName].hours += task.hours_worked || 0;
    tasksByWorker[workerName].cost += parseFloat(task.task_cost_ngn) || 0;
  });
  const workerTaskData = Object.entries(tasksByWorker)
    .map(([name, data]) => ({
      name,
      total: data.total,
      completed: data.completed,
      pending: data.total - data.completed,
      hours: data.hours,
      cost: data.cost / 1000000
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  
  // Monthly task trends
  const monthlyTasks = {};
  tasks.forEach(t => {
    if (t.date_assigned) {
      const month = t.date_assigned.slice(0, 7);
      if (!monthlyTasks[month]) {
        monthlyTasks[month] = { month, total: 0, completed: 0, hours: 0, cost: 0 };
      }
      monthlyTasks[month].total += 1;
      monthlyTasks[month].completed += t.completed ? 1 : 0;
      monthlyTasks[month].hours += t.hours_worked || 0;
      monthlyTasks[month].cost += parseFloat(t.task_cost_ngn) || 0;
    }
  });
  const monthlyTaskData = Object.values(monthlyTasks).sort((a, b) => a.month.localeCompare(b.month));
  
  // Top performing workers
  const topWorkers = Object.entries(tasksByWorker)
    .map(([name, data]) => ({
      name,
      completionRate: data.total > 0 ? (data.completed / data.total * 100).toFixed(1) : 0,
      totalTasks: data.total,
      hours: data.hours,
      avgHoursPerTask: data.total > 0 ? (data.hours / data.total).toFixed(1) : 0
    }))
    .sort((a, b) => parseFloat(b.completionRate) - parseFloat(a.completionRate))
    .slice(0, 5);
  
  // Recent tasks
  const recentTasks = [...enrichedTasks]
    .sort((a, b) => new Date(b.date_assigned) - new Date(a.date_assigned))
    .slice(0, 10);

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit tasks');
      return;
    }
    
    try {
      if (editingTask) {
        await api.put(`/workertasks/${editingTask}/`, formData);
      } else {
        await api.post('/workertasks/', formData);
      }
      setShowAddModal(false);
      setEditingTask(null);
      setFormData({
        task_description: '',
        date_assigned: '',
        hours_worked: '',
        task_cost_ngn: '',
        completed: false,
        completed_date: '',
        farm_workers_id: ''
      });
      // Refresh data
      const tasksRes = await api.get('/workertasks/');
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.results || []));
    } catch (err) {
      console.error('Error saving task:', err);
      alert('Error saving task');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/workertasks/${id}/`);
      const tasksRes = await api.get('/workertasks/');
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Error deleting task');
    }
  };

  const toggleComplete = async (task) => {
    if (!token) return;
    try {
      const updatedTask = {
        ...task,
        completed: !task.completed,
        completed_date: !task.completed ? new Date().toISOString().split('T')[0] : null
      };
      await api.put(`/workertasks/${task.worker_tasks_id}/`, updatedTask);
      const tasksRes = await api.get('/workertasks/');
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.results || []));
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Error updating task status');
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading worker tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Tasks</h4>
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
          <h1 className="display-5 mb-0">📋 Worker Tasks</h1>
          <p className="text-muted">Track and manage all worker assignments and productivity</p>
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
              setEditingTask(null);
              setFormData({
                task_description: '',
                date_assigned: new Date().toISOString().split('T')[0],
                hours_worked: '',
                task_cost_ngn: '',
                completed: false,
                completed_date: '',
                farm_workers_id: ''
              });
              setShowAddModal(true);
            }}>
              + Assign Task
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
                  <h6 className="card-title">Total Tasks</h6>
                  <h2 className="mb-0">{totalTasks}</h2>
                  <small>{completedTasks} Completed • {pendingTasks} Pending</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-success h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Completion Rate</h6>
                  <h2 className="mb-0">{completionRate.toFixed(1)}%</h2>
                  <small>{avgHoursPerTask.toFixed(1)} hrs avg per task</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-warning h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Total Hours</h6>
                  <h2 className="mb-0">{totalHours.toFixed(0)}</h2>
                  <small>₦{(totalCost / 1000000).toFixed(1)}M total cost</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-info h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Avg Cost/Task</h6>
                  <h2 className="mb-0">₦{(avgCostPerTask / 1000).toFixed(0)}K</h2>
                  <small>₦{(totalCost / totalHours / 1000).toFixed(0)}K per hour</small>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">📊 Tasks by Worker</h5>
                </div>
                <div className="card-body">
                  {workerTaskData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={workerTaskData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="completed" stackId="a" fill="#28a745" name="Completed" />
                        <Bar dataKey="pending" stackId="a" fill="#ffc107" name="Pending" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No task data available</p>}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">📈 Monthly Task Trends</h5>
                </div>
                <div className="card-body">
                  {monthlyTaskData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={monthlyTaskData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" label={{ value: 'Tasks', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Hours', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="total" fill="#8884d8" name="Total Tasks" />
                        <Line yAxisId="right" type="monotone" dataKey="hours" stroke="#ff7300" name="Hours Worked" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No monthly data available</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Rankings */}
          <div className="row mb-4 g-3">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">🏆 Top Performers (Completion Rate)</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-success">
                        <tr><th>Rank</th><th>Worker</th><th>Tasks</th><th>Completed</th><th>Rate</th><th>Hours/Task</th></tr>
                      </thead>
                      <tbody>
                        {topWorkers.map((worker, i) => (
                          <tr key={i}>
                            <td><span className="badge bg-success">{i + 1}</span></td>
                            <td><strong>{worker.name}</strong></td>
                            <td>{worker.totalTasks}</td>
                            <td>{Math.round(worker.totalTasks * worker.completionRate / 100)}</td>
                            <td><span className="text-success">{worker.completionRate}%</span></td>
                            <td>{worker.avgHoursPerTask} hrs</td>
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
                  <h5 className="mb-0">💰 Cost Distribution by Worker</h5>
                </div>
                <div className="card-body">
                  {workerTaskData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={workerTaskData} dataKey="cost" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {workerTaskData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₦${value}M`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted py-5">No cost data available</p>}
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
              <label className="form-label">🔍 Search Tasks</label>
              <input type="text" className="form-control" placeholder="Search by description or worker..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">👷 Worker</label>
              <select className="form-select" value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)}>
                <option value="">All Workers</option>
                {workers.map(worker => (
                  <option key={worker.farm_workers_id} value={worker.farm_workers_id}>
                    {worker.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">📊 Status</label>
              <select className="form-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              {(searchTerm || selectedWorker || selectedStatus || dateRange.start || dateRange.end) && (
                <button className="btn btn-outline-secondary w-100" onClick={() => {
                  setSearchTerm('');
                  setSelectedWorker('');
                  setSelectedStatus('');
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
        <strong>Showing {filteredTasks.length}</strong> of {enrichedTasks.length} tasks
        <span className="ms-3">⏱️ Total Hours: {filteredTasks.reduce((sum, t) => sum + (t.hours_worked || 0), 0).toFixed(0)}</span>
        <span className="ms-3">💰 Total Cost: ₦{(filteredTasks.reduce((sum, t) => sum + (parseFloat(t.task_cost_ngn) || 0), 0) / 1000000).toFixed(2)}M</span>
      </div>

      {/* Tasks Table */}
      {filteredTasks.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No tasks found</h5>
          <p>Try adjusting your search or filters, or assign a new task.</p>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead className="table-success">
                  <tr>
                    <th>ID</th>
                    <th>Task Description</th>
                    <th>Worker</th>
                    <th>Farm</th>
                    <th>Assigned Date</th>
                    <th>Hours</th>
                    <th>Cost (₦)</th>
                    <th>Status</th>
                    {token && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => (
                    <tr key={task.worker_tasks_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTask(task)}>
                      <td>{task.worker_tasks_id}</td>
                      <td>
                        <strong>{task.task_description?.substring(0, 50)}</strong>
                        {task.task_description?.length > 50 && '...'}
                      </td>
                      <td>
                        {task.worker?.name || 'Unknown'}
                        {task.worker?.role && <><br/><small className="text-muted">{task.worker.role.replace('_', ' ')}</small></>}
                      </td>
                      <td>{task.farm?.farm_name || 'N/A'}</td>
                      <td>{task.date_assigned}</td>
                      <td>{task.hours_worked || 0} hrs</td>
                      <td>₦{task.task_cost_ngn?.toLocaleString() || 0}</td>
                      <td>
                        {task.completed ? (
                          <span className="badge bg-success">✅ Completed</span>
                        ) : task.isOverdue ? (
                          <span className="badge bg-danger">⚠️ Overdue</span>
                        ) : (
                          <span className="badge bg-warning">⏳ Pending</span>
                        )}
                      </td>
                      {token && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex gap-1">
                            {!task.completed && (
                              <button className="btn btn-sm btn-outline-success" onClick={() => toggleComplete(task)}>
                                Complete
                              </button>
                            )}
                            <button className="btn btn-sm btn-outline-warning" onClick={() => {
                              setEditingTask(task.worker_tasks_id);
                              setFormData({
                                task_description: task.task_description || '',
                                date_assigned: task.date_assigned || '',
                                hours_worked: task.hours_worked || '',
                                task_cost_ngn: task.task_cost_ngn || '',
                                completed: task.completed || false,
                                completed_date: task.completed_date || '',
                                farm_workers_id: task.farm_workers_id?.farm_workers_id || ''
                              });
                              setShowAddModal(true);
                            }}>Edit</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(task.worker_tasks_id)}>Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr className="fw-bold">
                    <td colSpan="5" className="text-end">Totals:</td>
                    <td>{filteredTasks.reduce((sum, t) => sum + (t.hours_worked || 0), 0).toFixed(0)} hrs</td>
                    <td>₦{(filteredTasks.reduce((sum, t) => sum + (parseFloat(t.task_cost_ngn) || 0), 0) / 1000000).toFixed(2)}M</td>
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
                <h5 className="modal-title">{editingTask ? 'Edit Task' : 'Assign New Task'}</h5>
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
                  <div className="mb-3">
                    <label className="form-label">Task Description *</label>
                    <textarea className="form-control" rows="3" value={formData.task_description}
                      onChange={(e) => setFormData({...formData, task_description: e.target.value})} required />
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Date Assigned *</label>
                      <input type="date" className="form-control" value={formData.date_assigned}
                        onChange={(e) => setFormData({...formData, date_assigned: e.target.value})} required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Hours Worked</label>
                      <input type="number" step="0.5" className="form-control" value={formData.hours_worked}
                        onChange={(e) => setFormData({...formData, hours_worked: e.target.value})} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Task Cost (₦)</label>
                    <input type="number" step="0.01" className="form-control" value={formData.task_cost_ngn}
                      onChange={(e) => setFormData({...formData, task_cost_ngn: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input type="checkbox" className="form-check-input" checked={formData.completed}
                        onChange={(e) => setFormData({...formData, completed: e.target.checked})} />
                      <label className="form-check-label">Mark as Completed</label>
                    </div>
                  </div>
                  {formData.completed && (
                    <div className="mb-3">
                      <label className="form-label">Completion Date</label>
                      <input type="date" className="form-control" value={formData.completed_date}
                        onChange={(e) => setFormData({...formData, completed_date: e.target.value})} />
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success">{editingTask ? 'Update Task' : 'Assign Task'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Task Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedTask(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-7">
                    <h6>📋 Task Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Task ID:</th><td>{selectedTask.worker_tasks_id}</td></tr>
                        <tr><th>Description:</th><td colSpan="3">{selectedTask.task_description}</td></tr>
                        <tr><th>Date Assigned:</th><td>{selectedTask.date_assigned}</td>
                            <th>Status:</th><td>{selectedTask.completed ? 
                              <span className="badge bg-success">Completed on {selectedTask.completed_date}</span> : 
                              <span className="badge bg-warning">Pending</span>}</td></tr>
                        <tr><th>Hours Worked:</th><td>{selectedTask.hours_worked || 0} hours</td>
                            <th>Task Cost:</th><td className="fw-bold text-success">₦{selectedTask.task_cost_ngn?.toLocaleString()}</td></tr>
                        <tr><th>Cost per Hour:</th><td colSpan="3">₦{selectedTask.costPerHour?.toLocaleString()}/hour</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-5">
                    <h6>👷 Worker Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Name:</th><td><strong>{selectedTask.worker?.name}</strong></td></tr>
                        <tr><th>Role:</th><td>{selectedTask.worker?.role?.replace('_', ' ')}</td></tr>
                        <tr><th>Daily Rate:</th><td>₦{selectedTask.worker?.daily_rate_ngn?.toLocaleString()}</td></tr>
                        <tr><th>Phone:</th><td>{selectedTask.worker?.phone || 'N/A'}</td></tr>
                        <tr><th>Hire Date:</th><td>{selectedTask.worker?.hire_date || 'N/A'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {selectedTask.farm && (
                  <>
                    <hr />
                    <h6>🏠 Associated Farm</h6>
                    <Link to={`/farm/${selectedTask.farm.farms_id}`} className="text-decoration-none">
                      <div className="bg-light p-2 rounded">
                        <strong>{selectedTask.farm.farm_name}</strong><br />
                        {selectedTask.farm.state}, {selectedTask.farm.lga}<br />
                        {selectedTask.farm.area_hectares} hectares
                      </div>
                    </Link>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedTask(null)}>Close</button>
                {!selectedTask.completed && token && (
                  <button className="btn btn-success" onClick={() => {
                    toggleComplete(selectedTask);
                    setSelectedTask(null);
                  }}>Mark Complete</button>
                )}
                {selectedTask.farm && (
                  <Link to={`/farm/${selectedTask.farm.farms_id}`} className="btn btn-info">View Farm →</Link>
                )}
                {token && (
                  <button className="btn btn-warning" onClick={() => {
                    setSelectedTask(null);
                    setEditingTask(selectedTask.worker_tasks_id);
                    setFormData({
                      task_description: selectedTask.task_description || '',
                      date_assigned: selectedTask.date_assigned || '',
                      hours_worked: selectedTask.hours_worked || '',
                      task_cost_ngn: selectedTask.task_cost_ngn || '',
                      completed: selectedTask.completed || false,
                      completed_date: selectedTask.completed_date || '',
                      farm_workers_id: selectedTask.farm_workers_id?.farm_workers_id || ''
                    });
                    setShowAddModal(true);
                  }}>Edit Task</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}