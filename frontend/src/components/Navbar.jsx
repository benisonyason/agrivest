import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { token, logout } = useAuth();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success sticky-top shadow-lg">
      <div className="container-fluid px-3 px-xl-4">
        {/* Brand/Logo - Smaller on mobile */}
        <Link className="navbar-brand d-flex align-items-center flex-shrink-0" to="/">
          <span className="fs-4 fs-xl-3 me-1 me-xl-2">🌾</span>
          <span className="fw-bold fs-6 fs-sm-5 fs-md-4 fs-lg-3">Agrivest</span>
        </Link>

        {/* Mobile Toggle Button */}
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarMain"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navbar Content */}
        <div className="collapse navbar-collapse" id="navbarMain">
          {/* Left Side - Main Navigation - Scrollable on mobile */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0" style={{ maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden' }}>
            
            {/* Dashboard */}
            <li className="nav-item">
              <Link className="nav-link py-2 py-lg-1" to="/">
                <i className="bi bi-speedometer2"></i> 
                <span className="ms-1 d-lg-none d-xl-inline">Dashboard</span>
              </Link>
            </li>

            {/* 1. Farm Management Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle py-2 py-lg-1"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-building"></i>
                <span className="ms-1 d-none d-xl-inline">Farm</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start">
                <li><Link className="dropdown-item" to="/farms"><i className="bi bi-building me-2"></i> Farms</Link></li>
                <li><Link className="dropdown-item" to="/blocks"><i className="bi bi-grid-3x3-gap-fill me-2"></i> Farm Blocks</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item" to="/farmworkers"><i className="bi bi-person-workspace me-2"></i> Farm Workers</Link></li>
                <li><Link className="dropdown-item" to="/workertasks"><i className="bi bi-check2-square me-2"></i> Worker Tasks</Link></li>
                <li><Link className="dropdown-item" to="/workerpayments"><i className="bi bi-cash me-2"></i> Worker Payments</Link></li>
              </ul>
            </li>

            {/* 2. Investors & Finance Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle py-2 py-lg-1"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-people-fill"></i>
                <span className="ms-1 d-none d-xl-inline">Finance</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start">
                <li><Link className="dropdown-item" to="/farmers"><i className="bi bi-person-badge me-2"></i> Investors</Link></li>
                <li><Link className="dropdown-item" to="/investments"><i className="bi bi-piggy-bank-fill me-2"></i> Investments</Link></li>
                <li><Link className="dropdown-item" to="/loan-payments"><i className="bi bi-credit-card me-2"></i> Investment Payments</Link></li>
                <li><Link className="dropdown-item" to="/loan-collateral"><i className="bi bi-shield-check me-2"></i> Collateral</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item" to="/financial-summary"><i className="bi bi-file-text-fill me-2"></i> Financial Summary</Link></li>
              </ul>
            </li>

            {/* 3. Crop Management Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle py-2 py-lg-1"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-tree-fill"></i>
                <span className="ms-1 d-none d-xl-inline">Crops</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start">
                <li><Link className="dropdown-item" to="/crops"><i className="bi bi-tree-fill me-2"></i> Crops</Link></li>
                <li><Link className="dropdown-item" to="/crop-varieties"><i className="bi bi-diagram-3 me-2"></i> Crop Varieties</Link></li>
                <li><Link className="dropdown-item" to="/plantings"><i className="bi bi-calendar-plus me-2"></i> Plantings</Link></li>
                <li><Link className="dropdown-item" to="/yields"><i className="bi bi-graph-up me-2"></i> Yields & Harvests</Link></li>
              </ul>
            </li>

            {/* 4. Soil & Environment Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle py-2 py-lg-1"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-globe2"></i>
                <span className="ms-1 d-none d-xl-inline">Soil</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start">
                <li><Link className="dropdown-item" to="/soil-zones"><i className="bi bi-layers me-2"></i> Soil Zones</Link></li>
                <li><Link className="dropdown-item" to="/soil-tests"><i className="bi bi-flask me-2"></i> Soil Tests</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item" to="/weather-stations"><i className="bi bi-cloud-sun me-2"></i> Weather Stations</Link></li>
                <li><Link className="dropdown-item" to="/weather-records"><i className="bi bi-cloud-rain me-2"></i> Weather Records</Link></li>
                <li><Link className="dropdown-item" to="/climate-events"><i className="bi bi-tornado me-2"></i> Climate Events</Link></li>
              </ul>
            </li>

            {/* 5. Disease Management Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle py-2 py-lg-1"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-bug-fill"></i>
                <span className="ms-1 d-none d-xl-inline">Disease</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start">
                <li><Link className="dropdown-item" to="/crop-diseases"><i className="bi bi-bug-fill me-2"></i> Crop Diseases</Link></li>
                <li><Link className="dropdown-item" to="/disease-reports"><i className="bi bi-file-medical me-2"></i> Disease Reports</Link></li>
                <li><Link className="dropdown-item" to="/treatment-methods"><i className="bi bi-capsule me-2"></i> Treatment Methods</Link></li>
              </ul>
            </li>

            {/* 6. Monitoring & Tech Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle py-2 py-lg-1"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-satellite"></i>
                <span className="ms-1 d-none d-xl-inline">Tech</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start">
                <li><Link className="dropdown-item" to="/satellite-images"><i className="bi bi-satellite me-2"></i> Satellite Images</Link></li>
                <li><Link className="dropdown-item" to="/ndvi-records"><i className="bi bi-graph-up me-2"></i> NDVI Records</Link></li>
                <li><Link className="dropdown-item" to="/drone-flights"><i className="bi bi-drone me-2"></i> Drone Flights</Link></li>
                <li><Link className="dropdown-item" to="/irrigation-systems"><i className="bi bi-water me-2"></i> Irrigation Systems</Link></li>
              </ul>
            </li>

            {/* 7. Inventory & Market Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle py-2 py-lg-1"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-box-seam"></i>
                <span className="ms-1 d-none d-xl-inline">Market</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start">
                <li><Link className="dropdown-item" to="/warehouses"><i className="bi bi-building-warehouse me-2"></i> Warehouses</Link></li>
                <li><Link className="dropdown-item" to="/warehouse-inventory"><i className="bi bi-boxes me-2"></i> Inventory</Link></li>
                <li><Link className="dropdown-item" to="/inventory-movements"><i className="bi bi-arrow-left-right me-2"></i> Movements</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item" to="/markets"><i className="bi bi-shop me-2"></i> Markets</Link></li>
                <li><Link className="dropdown-item" to="/market-prices"><i className="bi bi-currency-dollar me-2"></i> Market Prices</Link></li>
                <li><Link className="dropdown-item" to="/price-forecasts"><i className="bi bi-graph-up me-2"></i> Price Forecasts</Link></li>
              </ul>
            </li>

            {/* 8. Export & Logistics Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle py-2 py-lg-1"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-truck"></i>
                <span className="ms-1 d-none d-xl-inline">Export</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start">
                <li><Link className="dropdown-item" to="/buyers"><i className="bi bi-person-badge me-2"></i> Buyers</Link></li>
                <li><Link className="dropdown-item" to="/export-shipments"><i className="bi bi-send me-2"></i> Export Shipments</Link></li>
                <li><Link className="dropdown-item" to="/export-routes"><i className="bi bi-map me-2"></i> Export Routes</Link></li>
                <li><Link className="dropdown-item" to="/shipping-companies"><i className="bi bi-ship me-2"></i> Shipping Companies</Link></li>
              </ul>
            </li>

            {/* 9. Equipment & Inputs Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle py-2 py-lg-1"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-tools"></i>
                <span className="ms-1 d-none d-xl-inline">Equipment</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start">
                <li><Link className="dropdown-item" to="/farm-equipment"><i className="bi bi-tractor me-2"></i> Farm Equipment</Link></li>
                <li><Link className="dropdown-item" to="/equipment-usage"><i className="bi bi-clock-history me-2"></i> Equipment Usage</Link></li>
                <li><Link className="dropdown-item" to="/maintenance-records"><i className="bi bi-wrench me-2"></i> Maintenance</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item" to="/fertilizer-applications"><i className="bi bi-droplet me-2"></i> Fertilizer</Link></li>
                <li><Link className="dropdown-item" to="/pesticide-applications"><i className="bi bi-bug me-2"></i> Pesticide</Link></li>
              </ul>
            </li>

            {/* 10. Security Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle py-2 py-lg-1"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-shield-lock"></i>
                <span className="ms-1 d-none d-xl-inline">Security</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start">
                <li><Link className="dropdown-item" to="/cctv-locations"><i className="bi bi-camera me-2"></i> CCTV Locations</Link></li>
                <li><Link className="dropdown-item" to="/security-incidents"><i className="bi bi-exclamation-triangle me-2"></i> Security Incidents</Link></li>
              </ul>
            </li>
          </ul>

          {/* Right Side - Auth & Profile */}
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 flex-shrink-0">
            {!token ? (
              <li className="nav-item">
                <Link className="nav-link btn btn-outline-light btn-sm px-3" to="/login">
                  <i className="bi bi-box-arrow-in-right"></i> 
                  <span className="d-none d-md-inline ms-1">Login</span>
                </Link>
              </li>
            ) : (
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle py-2 py-lg-1"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-person-circle"></i>
                  <span className="d-none d-md-inline ms-1">Account</span>
                </a>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li><Link className="dropdown-item" to="/profile"><i className="bi bi-person-badge me-2"></i> Profile</Link></li>
                  <li><Link className="dropdown-item" to="/settings"><i className="bi bi-gear me-2"></i> Settings</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button className="dropdown-item text-danger" onClick={logout}><i className="bi bi-box-arrow-right me-2"></i> Logout</button></li>
                </ul>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}