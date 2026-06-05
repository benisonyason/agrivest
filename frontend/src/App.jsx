import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import FarmList from './components/FarmList';
import FarmDetail from './components/FarmDetail';
import FarmBlockList from './components/FarmBlockList';
import FarmerList from './components/FarmerList';
import CropList from './components/CropList';
import YieldList from './components/YieldList';
import AddFarm from './components/AddFarm';
import Login from './components/Login';
import InvestmentList from './components/InvestmentList';
import FarmWorkersList from './components/FarmWorkersList';
import WorkerTasksList from './components/WorkerTasksList';
import WorkerPaymentsList from './components/WorkerPaymentsList';
import LoanPaymentsList from './components/LoanPaymentsList';
import FinancialSummary from './components/FinancialSummary';
import CropVarietiesList from './components/CropVarietiesList';
import PlantingsList from './components/PlantingsList';
import SoilZonesList from './components/SoilZonesList';
import SoilTestsList from './components/SoilTestsList';

// Import Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/farms" element={<FarmList />} />
            <Route path="/farm/:id" element={<FarmDetail />} />
            <Route path="/blocks" element={<FarmBlockList />} />
            <Route path="/farmers" element={<FarmerList />} />
            <Route path="/crops" element={<CropList />} />
            <Route path="/yields" element={<YieldList />} />
            <Route path="/add-farm" element={<AddFarm />} />
            <Route path="/login" element={<Login />} />
            <Route path="/investments" element={<InvestmentList />} />
            <Route path="/farmworkers" element={<FarmWorkersList />} />
            <Route path="/workertasks" element={<WorkerTasksList/>} />
            <Route path="/workerpayments" element={<WorkerPaymentsList/>} />
            <Route path="/loan-payments" element={<LoanPaymentsList/>} />
            <Route path="/financial-summary" element={<FinancialSummary />} />
            <Route path="/crop-varieties" element={<CropVarietiesList />} />
            <Route path="/plantings" element={<PlantingsList />} />
            <Route path="/soil-zones" element={<SoilZonesList />} />  
            <Route path="/soil-tests" element={<SoilTestsList />} />          
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;