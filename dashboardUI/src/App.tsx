import { BrowserRouter,Routes,Route } from 'react-router-dom';
import './App.css';
import DropDragDashboard from './pages/DragDropDashboard';
import EditChart from './pages/EditChart';


function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/dashboards" element={<DropDragDashboard/>}/>
          <Route path="/addChart/:id" element={<EditChart/>}/>
        </Routes>
      </BrowserRouter>
    
  );
}

export default App;
