import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Schedule from "@/pages/Schedule";
import Courts from "@/pages/Courts";
import Rates from "@/pages/Rates";
import Bills from "@/pages/Bills";
import Members from "@/pages/Members";
import Dashboard from "@/pages/Dashboard";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Schedule />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/courts" element={<Courts />} />
          <Route path="/rates" element={<Rates />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="*" element={<Schedule />} />
        </Route>
      </Routes>
    </Router>
  );
}
