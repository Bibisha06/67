import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import LiveCall from './pages/LiveCall';
import CallHistory from './pages/CallHistory';
import Escalations from './pages/Escalations';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="live" element={<LiveCall />} />
          <Route path="calls" element={<CallHistory />} />
          <Route path="escalations" element={<Escalations />} />
          <Route path="products" element={<Products />} />
          <Route path="customers" element={<Customers />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
