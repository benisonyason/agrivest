import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom farm marker icon
const farmIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
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

export default function FarmList() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [mapView, setMapView] = useState('list'); // 'list', 'map', or 'split'

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        console.log('Fetching farms...');
        const response = await api.get('/farms/');
        console.log('Farms response:', response.data);
        
        let farmsData = [];
        if (Array.isArray(response.data)) {
          farmsData = response.data;
        } else if (response.data && response.data.results) {
          farmsData = response.data.results;
        } else if (response.data && typeof response.data === 'object') {
          farmsData = [response.data];
        }
        
        setFarms(farmsData);
      } catch (err) {
        console.error('Error fetching farms:', err);
        setError(err.message || 'Failed to load farms');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFarms();
  }, []);

  // Get unique states for filter
  const uniqueStates = [...new Set(farms.map(farm => farm.state).filter(Boolean))];

  // Filter farms
  const filteredFarms = farms.filter(farm => {
    const matchesSearch = searchTerm === '' || 
      (farm.farm_name && farm.farm_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (farm.state && farm.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (farm.lga && farm.lga.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesState = selectedState === '' || farm.state === selectedState;
    
    return matchesSearch && matchesState;
  });

  // Get farms with valid coordinates for map
  const mapMarkers = filteredFarms.filter(farm => 
    farm.lat && farm.lon && !isNaN(farm.lat) && !isNaN(farm.lon)
  );

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading farms...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Farms</h4>
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
          <h1 className="display-5 mb-0">🌾 Farms</h1>
          <p className="text-muted">Manage and view all your farms with interactive map</p>
        </div>
        <div className="d-flex gap-2">
          <div className="btn-group" role="group">
            <button 
              className={`btn ${mapView === 'list' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setMapView('list')}
            >
              📋 List View
            </button>
            <button 
              className={`btn ${mapView === 'map' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setMapView('map')}
            >
              🗺️ Map View
            </button>
            <button 
              className={`btn ${mapView === 'split' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setMapView('split')}
            >
              📋🗺️ Split View
            </button>
          </div>
          <Link to="/add-farm" className="btn btn-success">
            + Add New Farm
          </Link>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <label className="form-label">🔍 Search Farms</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by farm name, state, or LGA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">📍 Filter by State</label>
              <select
                className="form-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                <option value="">All States</option>
                {uniqueStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              {(searchTerm || selectedState) && (
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedState('');
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
          <div className="card bg-success text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Total Farms</h6>
              <h2 className="mb-0">{farms.length}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-primary text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Total Land Area</h6>
              <h2 className="mb-0">{farms.reduce((sum, f) => sum + (f.area_hectares || 0), 0).toFixed(1)} ha</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">States Covered</h6>
              <h2 className="mb-0">{uniqueStates.length}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white shadow-sm">
            <div className="card-body">
              <h6 className="card-title">On Map</h6>
              <h2 className="mb-0">{mapMarkers.length}</h2>
              <small>farms with coordinates</small>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - List/Map Views */}
      {mapView === 'list' && (
        /* List View */
        filteredFarms.length === 0 ? (
          <div className="alert alert-info text-center">
            <h5>No farms found</h5>
            <p>Try adjusting your search or filters, or <Link to="/add-farm">add a new farm</Link>.</p>
          </div>
        ) : (
          <div className="row g-4">
            {filteredFarms.map((farm) => (
              <div key={farm.farms_id} className="col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm hover-shadow">
                  <div className="card-header bg-success text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">{farm.farm_name || `Farm ${farm.farms_id}`}</h5>
                      <span className="badge bg-light text-dark">ID: {farm.farms_id}</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">📍 Location:</span>
                        <span className="fw-bold">{farm.state || 'N/A'}, {farm.lga || 'N/A'}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">📐 Area:</span>
                        <span className="fw-bold">{farm.area_hectares || 0} hectares</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">💰 Land Cost:</span>
                        <span className="fw-bold text-success">
                          ₦{farm.land_cost_ngn?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">🗺️ Coordinates:</span>
                        <span className="fw-bold">
                          {farm.lat && farm.lon ? `${farm.lat}, ${farm.lon}` : 'No coordinates'}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">👨‍🌾 Farmer:</span>
                        <span className="fw-bold">
                          {farm.farmers_id?.first_name} {farm.farmers_id?.last_name || 'Not Assigned'}
                        </span>
                      </div>
                    </div>
                    <Link 
                      to={`/farm/${farm.farms_id}`} 
                      className="btn btn-outline-success btn-sm w-100"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {mapView === 'map' && (
        /* Map View Only */
        <div className="card shadow-sm">
          <div className="card-body p-0">
            {mapMarkers.length === 0 ? (
              <div className="alert alert-warning m-3">
                <h5>No farms with coordinates found</h5>
                <p>Add coordinates (latitude/longitude) to your farms to see them on the map.</p>
                <Link to="/add-farm" className="btn btn-primary">Add a Farm</Link>
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
                {mapMarkers.map(farm => (
                  <Marker
                    key={farm.farms_id}
                    position={[farm.lat, farm.lon]}
                    icon={farmIcon}
                    eventHandlers={{
                      click: () => setSelectedFarm(farm)
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '200px' }}>
                        <h6 className="mb-2 text-success">{farm.farm_name || 'Unnamed Farm'}</h6>
                        <hr className="my-1" />
                        <p className="mb-1"><strong>ID:</strong> {farm.farms_id}</p>
                        <p className="mb-1"><strong>Location:</strong> {farm.state}, {farm.lga}</p>
                        <p className="mb-1"><strong>Area:</strong> {farm.area_hectares || 0} ha</p>
                        <p className="mb-1"><strong>Land Cost:</strong> ₦{farm.land_cost_ngn?.toLocaleString() || 0}</p>
                        <p className="mb-1"><strong>Farmer:</strong> {farm.farmers_id?.first_name} {farm.farmers_id?.last_name || 'N/A'}</p>
                        <Link 
                          to={`/farm/${farm.farms_id}`} 
                          className="btn btn-sm btn-success mt-2 w-100"
                        >
                          View Details
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

      {mapView === 'split' && (
        /* Split View - List and Map side by side */
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">📋 Farm List ({filteredFarms.length})</h5>
              </div>
              <div className="card-body p-0" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {filteredFarms.length === 0 ? (
                  <div className="alert alert-info m-3">No farms found</div>
                ) : (
                  <div className="list-group list-group-flush">
                    {filteredFarms.map(farm => (
                      <div key={farm.farms_id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{farm.farm_name || `Farm ${farm.farms_id}`}</h6>
                            <small className="text-muted">{farm.state}, {farm.lga}</small>
                            <p className="mb-0 small">
                              <strong>Area:</strong> {farm.area_hectares || 0} ha | 
                              <strong> Land:</strong> ₦{farm.land_cost_ngn?.toLocaleString() || 0}
                            </p>
                          </div>
                          <Link to={`/farm/${farm.farms_id}`} className="btn btn-sm btn-outline-success">
                            View
                          </Link>
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
                <h5 className="mb-0">🗺️ Farm Locations ({mapMarkers.length})</h5>
              </div>
              <div className="card-body p-0">
                {mapMarkers.length === 0 ? (
                  <div className="alert alert-warning m-3">
                    No farms with coordinates. Add lat/lon to see them on map.
                  </div>
                ) : (
                  <MapContainer
                    center={[mapMarkers[0]?.lat || 9.082, mapMarkers[0]?.lon || 8.6753]}
                    zoom={6}
                    style={{ height: '560px', width: '100%', borderRadius: '8px' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    {mapMarkers.map(farm => (
                      <Marker
                        key={farm.farms_id}
                        position={[farm.lat, farm.lon]}
                        icon={farmIcon}
                      >
                        <Popup>
                          <div>
                            <strong>{farm.farm_name}</strong><br />
                            {farm.state}, {farm.lga}<br />
                            {farm.area_hectares} ha<br />
                            <Link to={`/farm/${farm.farms_id}`}>View Details →</Link>
                          </div>
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

      {/* Selected Farm Details Modal (for map view) */}
      {selectedFarm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Farm Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedFarm(null)}></button>
              </div>
              <div className="modal-body">
                <h4>{selectedFarm.farm_name}</h4>
                <hr />
                <p><strong>ID:</strong> {selectedFarm.farms_id}</p>
                <p><strong>Location:</strong> {selectedFarm.state}, {selectedFarm.lga}</p>
                <p><strong>Area:</strong> {selectedFarm.area_hectares} hectares</p>
                <p><strong>Land Cost:</strong> ₦{selectedFarm.land_cost_ngn?.toLocaleString()}</p>
                <p><strong>Coordinates:</strong> {selectedFarm.lat}, {selectedFarm.lon}</p>
                <p><strong>Farmer:</strong> {selectedFarm.farmers_id?.first_name} {selectedFarm.farmers_id?.last_name}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedFarm(null)}>Close</button>
                <Link to={`/farm/${selectedFarm.farms_id}`} className="btn btn-success">View Full Details</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}