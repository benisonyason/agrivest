import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom block marker icon (orange)
const blockIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to fit bounds to markers
function FitBounds({ markers }) {
  const map = useMap();
  
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);
  
  return null;
}

export default function FarmBlockList() {
  const [blocks, setBlocks] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'map', 'split'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [formData, setFormData] = useState({
    block_name: '',
    area_hectares: '',
    soil_preparation_cost_ngn: '',
    farms_id: ''
  });
  
  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching farm blocks...');
        const [blocksRes, farmsRes] = await Promise.all([
          api.get('/farmblocks/'),
          api.get('/farms/')
        ]);
        
        let blocksData = [];
        if (Array.isArray(blocksRes.data)) {
          blocksData = blocksRes.data;
        } else if (blocksRes.data && blocksRes.data.results) {
          blocksData = blocksRes.data.results;
        }
        
        let farmsData = [];
        if (Array.isArray(farmsRes.data)) {
          farmsData = farmsRes.data;
        } else if (farmsRes.data && farmsRes.data.results) {
          farmsData = farmsRes.data.results;
        }
        
        setBlocks(blocksData);
        setFarms(farmsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load farm blocks');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter blocks
  const filteredBlocks = blocks.filter(block => {
    const matchesSearch = searchTerm === '' || 
      (block.block_name && block.block_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (block.farms_id?.farm_name && block.farms_id.farm_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFarm = selectedFarm === '' || block.farms_id?.farms_id?.toString() === selectedFarm;
    
    return matchesSearch && matchesFarm;
  });

  // Get blocks with valid coordinates (using farm coordinates)
  const mapMarkers = filteredBlocks
    .filter(block => block.farms_id?.lat && block.farms_id?.lon)
    .map(block => ({
      id: block.farm_blocks_id,
      name: block.block_name,
      lat: block.farms_id.lat,
      lon: block.farms_id.lon,
      area: block.area_hectares,
      farmName: block.farms_id?.farm_name,
      block: block
    }));

  // Statistics
  const totalBlocks = blocks.length;
  const totalArea = blocks.reduce((sum, b) => sum + (b.area_hectares || 0), 0);
  const totalPrepCost = blocks.reduce((sum, b) => sum + (b.soil_preparation_cost_ngn || 0), 0);
  const uniqueFarms = [...new Set(blocks.map(b => b.farms_id?.farms_id).filter(Boolean))].length;

  const handleAddEdit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please login to add/edit blocks');
      return;
    }
    
    try {
      if (editingBlock) {
        await api.put(`/farmblocks/${editingBlock}/`, formData);
      } else {
        await api.post('/farmblocks/', formData);
      }
      setShowAddModal(false);
      setEditingBlock(null);
      setFormData({ block_name: '', area_hectares: '', soil_preparation_cost_ngn: '', farms_id: '' });
      // Refresh data
      const blocksRes = await api.get('/farmblocks/');
      setBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : (blocksRes.data?.results || []));
    } catch (err) {
      console.error('Error saving block:', err);
      alert('Error saving block');
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this block?')) return;
    try {
      await api.delete(`/farmblocks/${id}/`);
      const blocksRes = await api.get('/farmblocks/');
      setBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : (blocksRes.data?.results || []));
    } catch (err) {
      console.error('Error deleting block:', err);
      alert('Error deleting block');
    }
  };

  const openEditModal = (block) => {
    setEditingBlock(block.farm_blocks_id);
    setFormData({
      block_name: block.block_name || '',
      area_hectares: block.area_hectares || '',
      soil_preparation_cost_ngn: block.soil_preparation_cost_ngn || '',
      farms_id: block.farms_id?.farms_id || ''
    });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading farm blocks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Farm Blocks</h4>
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
          <h1 className="display-5 mb-0">📦 Farm Blocks</h1>
          <p className="text-muted">Manage and view all farm blocks with interactive map</p>
        </div>
        <div className="d-flex gap-2">
          <div className="btn-group" role="group">
            <button 
              className={`btn ${viewMode === 'list' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setViewMode('list')}
            >
              📋 List View
            </button>
            <button 
              className={`btn ${viewMode === 'map' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setViewMode('map')}
            >
              🗺️ Map View
            </button>
            <button 
              className={`btn ${viewMode === 'split' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setViewMode('split')}
            >
              📋🗺️ Split View
            </button>
          </div>
          {token && (
            <button className="btn btn-success" onClick={() => {
              setEditingBlock(null);
              setFormData({ block_name: '', area_hectares: '', soil_preparation_cost_ngn: '', farms_id: '' });
              setShowAddModal(true);
            }}>
              + Add New Block
            </button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <label className="form-label">🔍 Search Blocks</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by block name or farm name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">🏠 Filter by Farm</label>
              <select
                className="form-select"
                value={selectedFarm}
                onChange={(e) => setSelectedFarm(e.target.value)}
              >
                <option value="">All Farms</option>
                {farms.map(farm => (
                  <option key={farm.farms_id} value={farm.farms_id}>
                    {farm.farm_name || `Farm ${farm.farms_id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              {(searchTerm || selectedFarm) && (
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedFarm('');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="row mb-4 g-3">
        <div className="col-md-3">
          <div className="card bg-info text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Total Blocks</h6>
              <h2 className="mb-0">{totalBlocks}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Total Area</h6>
              <h2 className="mb-0">{totalArea.toFixed(1)} ha</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Total Prep Cost</h6>
              <h2 className="mb-0">₦{(totalPrepCost / 1000000).toFixed(1)}M</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-primary text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Farms with Blocks</h6>
              <h2 className="mb-0">{uniqueFarms}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        filteredBlocks.length === 0 ? (
          <div className="alert alert-info text-center">
            <h5>No farm blocks found</h5>
            <p>Try adjusting your search or filters, or add a new block.</p>
          </div>
        ) : (
          <div className="row g-4">
            {filteredBlocks.map(block => (
              <div key={block.farm_blocks_id} className="col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm hover-shadow">
                  <div className="card-header bg-info text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">{block.block_name || `Block ${block.farm_blocks_id}`}</h5>
                      <span className="badge bg-light text-dark">ID: {block.farm_blocks_id}</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">🏠 Farm:</span>
                        <span className="fw-bold">{block.farms_id?.farm_name || 'Unknown Farm'}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">📐 Area:</span>
                        <span className="fw-bold">{block.area_hectares || 0} hectares</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">💰 Soil Prep Cost:</span>
                        <span className="fw-bold text-success">
                          ₦{block.soil_preparation_cost_ngn?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">📍 Farm Location:</span>
                        <span className="fw-bold small">
                          {block.farms_id?.state}, {block.farms_id?.lga}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <Link 
                        to={`/farm/${block.farms_id?.farms_id}`} 
                        className="btn btn-outline-info btn-sm flex-grow-1"
                      >
                        View Farm →
                      </Link>
                      {token && (
                        <>
                          <button 
                            className="btn btn-outline-warning btn-sm"
                            onClick={() => openEditModal(block)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDelete(block.farm_blocks_id)}
                          >
                            Del
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            {mapMarkers.length === 0 ? (
              <div className="alert alert-warning m-3">
                <h5>No blocks with farm coordinates found</h5>
                <p>Add coordinates to farms to see blocks on the map.</p>
              </div>
            ) : (
              <MapContainer
                center={[mapMarkers[0]?.lat || 9.082, mapMarkers[0]?.lon || 8.6753]}
                zoom={6}
                style={{ height: '600px', width: '100%', borderRadius: '8px' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapMarkers.map(marker => (
                  <Marker
                    key={marker.id}
                    position={[marker.lat, marker.lon]}
                    icon={blockIcon}
                  >
                    <Popup>
                      <div style={{ minWidth: '200px' }}>
                        <h6 className="mb-2 text-info">{marker.name || 'Unnamed Block'}</h6>
                        <hr className="my-1" />
                        <p className="mb-1"><strong>Farm:</strong> {marker.farmName}</p>
                        <p className="mb-1"><strong>Area:</strong> {marker.area || 0} ha</p>
                        <p className="mb-1"><strong>Prep Cost:</strong> ₦{marker.block?.soil_preparation_cost_ngn?.toLocaleString() || 0}</p>
                        <Link 
                          to={`/farm/${marker.block?.farms_id?.farms_id}`} 
                          className="btn btn-sm btn-info mt-2 w-100"
                        >
                          View Farm Details
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                <FitBounds markers={mapMarkers} />
              </MapContainer>
            )}
          </div>
        </div>
      )}

      {/* Split View */}
      {viewMode === 'split' && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">📋 Farm Blocks ({filteredBlocks.length})</h5>
              </div>
              <div className="card-body p-0" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {filteredBlocks.length === 0 ? (
                  <div className="alert alert-info m-3">No blocks found</div>
                ) : (
                  <div className="list-group list-group-flush">
                    {filteredBlocks.map(block => (
                      <div key={block.farm_blocks_id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{block.block_name || `Block ${block.farm_blocks_id}`}</h6>
                            <small className="text-muted">{block.farms_id?.farm_name}</small>
                            <p className="mb-0 small">
                              <strong>Area:</strong> {block.area_hectares || 0} ha | 
                              <strong> Prep:</strong> ₦{block.soil_preparation_cost_ngn?.toLocaleString() || 0}
                            </p>
                          </div>
                          <div className="d-flex gap-1">
                            <Link to={`/farm/${block.farms_id?.farms_id}`} className="btn btn-sm btn-outline-info">
                              Farm
                            </Link>
                            {token && (
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(block.farm_blocks_id)}
                              >
                                Del
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">🗺️ Block Locations ({mapMarkers.length})</h5>
              </div>
              <div className="card-body p-0">
                {mapMarkers.length === 0 ? (
                  <div className="alert alert-warning m-3">
                    No blocks with coordinates. Add lat/lon to farms to see blocks on map.
                  </div>
                ) : (
                  <MapContainer
                    center={[mapMarkers[0]?.lat || 9.082, mapMarkers[0]?.lon || 8.6753]}
                    zoom={6}
                    style={{ height: '560px', width: '100%', borderRadius: '8px' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {mapMarkers.map(marker => (
                      <Marker key={marker.id} position={[marker.lat, marker.lon]} icon={blockIcon}>
                        <Popup>
                          <strong>{marker.name}</strong><br />
                          Farm: {marker.farmName}<br />
                          {marker.area} ha<br />
                          <Link to={`/farm/${marker.block?.farms_id?.farms_id}`}>View Farm →</Link>
                        </Popup>
                      </Marker>
                    ))}
                    <FitBounds markers={mapMarkers} />
                  </MapContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">{editingBlock ? 'Edit Block' : 'Add New Block'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddEdit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Block Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.block_name}
                      onChange={(e) => setFormData({...formData, block_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Farm *</label>
                    <select
                      className="form-select"
                      value={formData.farms_id}
                      onChange={(e) => setFormData({...formData, farms_id: e.target.value})}
                      required
                    >
                      <option value="">Select Farm</option>
                      {farms.map(farm => (
                        <option key={farm.farms_id} value={farm.farms_id}>
                          {farm.farm_name || `Farm ${farm.farms_id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Area (hectares)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={formData.area_hectares}
                      onChange={(e) => setFormData({...formData, area_hectares: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Soil Preparation Cost (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.soil_preparation_cost_ngn}
                      onChange={(e) => setFormData({...formData, soil_preparation_cost_ngn: e.target.value})}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-info">Save Block</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Selected Block Details Modal */}
      {selectedBlock && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">Block Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedBlock(null)}></button>
              </div>
              <div className="modal-body">
                <h4>{selectedBlock.block_name}</h4>
                <hr />
                <p><strong>ID:</strong> {selectedBlock.farm_blocks_id}</p>
                <p><strong>Farm:</strong> {selectedBlock.farms_id?.farm_name}</p>
                <p><strong>Area:</strong> {selectedBlock.area_hectares} hectares</p>
                <p><strong>Soil Prep Cost:</strong> ₦{selectedBlock.soil_preparation_cost_ngn?.toLocaleString()}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedBlock(null)}>Close</button>
                <Link to={`/farm/${selectedBlock.farms_id?.farms_id}`} className="btn btn-info">View Farm</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}