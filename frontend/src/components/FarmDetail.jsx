import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function FarmDetail() {
  const { id } = useParams();
  const [farm, setFarm] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFarmData = async () => {
      try {
        console.log(`Fetching farm ${id}...`);
        
        // Fetch farm details
        const farmRes = await api.get(`/farms/${id}/`);
        console.log('Farm details:', farmRes.data);
        setFarm(farmRes.data);
        
        // Fetch related data
        const [blocksRes, workersRes, cropsRes] = await Promise.all([
          api.get(`/farm_blocks/?farms_id=${id}`),
          api.get(`/farm_workers/?farms_id=${id}`),
          api.get(`/crops/?farms_id=${id}`)
        ]);
        
        setBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : (blocksRes.data?.results || []));
        setWorkers(Array.isArray(workersRes.data) ? workersRes.data : (workersRes.data?.results || []));
        setCrops(Array.isArray(cropsRes.data) ? cropsRes.data : (cropsRes.data?.results || []));
        
      } catch (err) {
        console.error('Error fetching farm data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchFarmData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading farm details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="alert alert-warning">
        Farm not found. <Link to="/farms">Back to Farms</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/farms" className="btn btn-secondary mb-3">← Back to Farms</Link>
      
      <div className="card mb-4">
        <div className="card-header bg-success text-white">
          <h2 className="mb-0">{farm.farm_name || 'Unnamed Farm'}</h2>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h5>Farm Information</h5>
              <p><strong>Farm ID:</strong> {farm.farms_id}</p>
              <p><strong>State:</strong> {farm.state || 'N/A'}</p>
              <p><strong>LGA:</strong> {farm.lga || 'N/A'}</p>
              <p><strong>Area:</strong> {farm.area_hectares || 0} hectares</p>
            </div>
            <div className="col-md-6">
              <h5>Location & Cost</h5>
              <p><strong>Latitude:</strong> {farm.lat || 'N/A'}</p>
              <p><strong>Longitude:</strong> {farm.lon || 'N/A'}</p>
              <p><strong>Land Cost:</strong> ₦{farm.land_cost_ngn?.toLocaleString() || 0}</p>
              <p><strong>Farmer:</strong> {farm.farmers_id?.first_name || 'N/A'} {farm.farmers_id?.last_name || ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Farm Blocks */}
      <h3 className="mt-4">📦 Farm Blocks</h3>
      {blocks.length === 0 ? (
        <div className="alert alert-secondary">No blocks registered for this farm.</div>
      ) : (
        <div className="row mb-4">
          {blocks.map(block => (
            <div key={block.farm_blocks_id} className="col-md-4 mb-2">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{block.block_name || `Block ${block.farm_blocks_id}`}</h5>
                  <p className="mb-1"><strong>Area:</strong> {block.area_hectares || 0} ha</p>
                  <p className="mb-0"><strong>Soil Prep Cost:</strong> ₦{block.soil_preparation_cost_ngn?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workers */}
      <h3>👨‍🌾 Farm Workers</h3>
      {workers.length === 0 ? (
        <div className="alert alert-secondary">No workers assigned to this farm.</div>
      ) : (
        <div className="row mb-4">
          {workers.map(worker => (
            <div key={worker.farm_workers_id} className="col-md-4 mb-2">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{worker.name || `Worker ${worker.farm_workers_id}`}</h5>
                  <p className="mb-1"><strong>Role:</strong> {worker.role || 'N/A'}</p>
                  <p className="mb-1"><strong>Daily Rate:</strong> ₦{worker.daily_rate_ngn?.toLocaleString() || 0}</p>
                  <p className="mb-0"><strong>Phone:</strong> {worker.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Crops */}
      <h3>🌱 Crops</h3>
      {crops.length === 0 ? (
        <div className="alert alert-secondary">No crops planted on this farm.</div>
      ) : (
        <div className="row">
          {crops.map(crop => (
            <div key={crop.crops_id} className="col-md-4 mb-2">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{crop.crop_name || `Crop ${crop.crops_id}`}</h5>
                  <p className="mb-1"><strong>Season:</strong> {crop.season || 'N/A'}</p>
                  <p className="mb-1"><strong>Avg Yield:</strong> {crop.avg_yield_ton_ha || 0} t/ha</p>
                  <p className="mb-0"><strong>Seed Cost:</strong> ₦{crop.seed_cost_ngn_per_kg || 0}/kg</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}