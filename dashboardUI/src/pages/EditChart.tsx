import React, { useState } from 'react';
import { useParams } from "react-router-dom";
import { ChevronDown, ChevronRight, Database, Code, BarChart3, LucideIcon, Zap } from 'lucide-react';
import JsCompiler from "../components/JsCompiler";
import AddDataSource from "../components/AddDataSource";
import HighChartField from "../components/HighChartField";
import Hooks from '../components/Hooks';

// Define the shape of our sections state
interface SectionsState {
  dataSource: boolean;
  jsCompiler: boolean;
  hooks:boolean;
  highChart: boolean;
}

// Define props for the CollapsibleSection component
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  icon: LucideIcon;
  isOpen: boolean;
  onToggle: () => void;
}

// Define the URL params type
interface ChartParams {
  id: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  children, 
  icon: Icon, 
  isOpen, 
  onToggle 
}) => {
  return (
    <div className="border border-gray-200 rounded-lg mb-4 bg-white shadow-sm w-full">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200 rounded-t-lg border-b border-gray-200"
        type="button"
        aria-expanded={isOpen}
        aria-controls={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-gray-600" />
          <span className="text-lg font-medium text-gray-800">{title}</span>
        </div>
        <div className="flex items-center">
          {isOpen ? (
            <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500 transition-transform duration-200" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div 
          className="w-full"
          id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const EditChart: React.FC = () => {
  const { id } = useParams();
  
  // State to manage which sections are open with proper typing
  const [openSections, setOpenSections] = useState<SectionsState>({
    dataSource: true,  // Default to open
    jsCompiler: false,
    hooks:false,
    highChart: false
  });

  // Toggle function with proper typing
  const toggleSection = (section: keyof SectionsState): void => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Check if all sections are open
  const allSectionsOpen: boolean = Object.values(openSections).every(Boolean);

  // Toggle all sections
  const toggleAllSections = (): void => {
    const newState = !allSectionsOpen;
    setOpenSections({
      dataSource: newState,
      jsCompiler: newState,
      hooks:newState,
      highChart: newState
    });
  };

  return (
    <div className="p-5 w-full bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Editing Chart
        </h2>
        <p className="text-gray-600">ID: {id || 'No ID provided'}</p>
      </div>

      <div className="space-y-4 w-full">
        <CollapsibleSection
          title="Data Source Configuration"
          icon={Database}
          isOpen={openSections.dataSource}
          onToggle={() => toggleSection('dataSource')}
        >
          <AddDataSource />
        </CollapsibleSection>

        <CollapsibleSection
          title="JavaScript Compiler"
          icon={Code}
          isOpen={openSections.jsCompiler}
          onToggle={() => toggleSection('jsCompiler')}
        >
          <JsCompiler />
        </CollapsibleSection>

        <CollapsibleSection
          title="Hooks for Complex Calculations"
          icon={Zap}
          isOpen={openSections.hooks}
          onToggle={() => toggleSection('hooks')}
        >
          <Hooks/>
        </CollapsibleSection>

        <CollapsibleSection
          title="Chart Configuration"
          icon={BarChart3}
          isOpen={openSections.highChart}
          onToggle={() => toggleSection('highChart')}
        >
          <HighChartField />
        </CollapsibleSection>
        
      </div>

      {/* Optional: Toggle all button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={toggleAllSections}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          type="button"
        >
          {allSectionsOpen ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
    </div>
  );
};

export default EditChart;


// import { useParams } from "react-router-dom";
// import JsCompiler from "../components/JsCompiler";
// import AddDataSource from "../components/AddDataSource";
// import HighChartField from "../components/HighChartField";

// export default function EditChart() {
//   const { id } = useParams<{ id: string }>();

//   return (
//     <div style={{ padding: '20px' }}>
//       <h2 className="text-xl font-semibold pl-4">Editing Chart ID: {id}</h2>
//       <AddDataSource />
//       <JsCompiler />
//       <HighChartField/>
//     </div>
//   );
// }



// import { useParams,useNavigate } from "react-router-dom"
// import { useState } from "react"
// import { useRecoilState } from "recoil"
// import { chartConfigState } from "../recoil/ChartConfig"

// export default function AddChart(){
//     const {id}=useParams()
//     const navigate=useNavigate()
//     const [chartConfig,setchartConfig]=useState("")
//     const [chartConfigs,setchartConfigs]=useRecoilState(chartConfigState)

//     const handleSubmit=(e:React.FormEvent)=>{
//         e.preventDefault()
//             try{
//                 const parsed=JSON.parse(chartConfig);
//                 console.log(parsed)
//                 setchartConfigs((prev)=>({...prev,[id!]:parsed}))
//                 console.log(chartConfigs)
//                 navigate("/dashboards");
//             }catch(err){
//                 alert("Invalid Json format")
//             }
//     }

//     return(
//         <div style={{padding:"10px"}}>
//             <h2>Adding Dashboard : {id}</h2>
//             <form onSubmit={handleSubmit}>
//                 <textarea
//                     rows={10}
//                     cols={50}
//                     value={chartConfig}
//                     onChange={(e)=>setchartConfig(e.target.value)}
//                     placeholder="Paste HighCharts JSOn config here"
//                 />
//                 <br/>
//                 <button type="submit">Add Chart</button>
//             </form>
//         </div>
//     )
// }