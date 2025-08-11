import { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../App";
import { useRecoilState, useRecoilValue } from "recoil";
import { chartConfigState } from "../recoil/ChartConfig";
import { layoutState } from "../recoil/LayoutState";
import ResizableChart from "../components/ResizableChart";
import { useSetRecoilState } from "recoil";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface ChartConfigData {
  template?: string;
  processed?: any;
  [key: string]: any;
}

export default function DropDragDashboard() {
  const navigate = useNavigate();
  const idRef = useRef(1);
  const chartConfigs = useRecoilValue<Record<string, ChartConfigData>>(chartConfigState);
  const setChartConfigs = useSetRecoilState(chartConfigState);

  const [layouts, setLayouts] = useRecoilState(layoutState);

  // Initialize idRef to avoid duplicates
  useEffect(() => {
    if (layouts && Object.keys(layouts).length > 0) {
      const allIds = Object.values(layouts)
        .flat()
        .map(item => {
          const num = parseInt(item.i);
          return isNaN(num) ? 0 : num;
        });
      
      if (allIds.length > 0) {
        idRef.current = Math.max(...allIds, 0) + 1;
      }
    }
  }, []);

  type ResizeHandleAxis = 's' | 'n' | 'se' | 'ne' | 'w' | 'e' | 'sw' | 'nw';

  const [compactType, setCompactType] = useState<"vertical" | "horizontal" | null>("vertical");
  const [mounted, setMounted] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
  const [resizeHandle, setResizehandle] = useState<ResizeHandleAxis[]>([
    's', 'n', 'se', 'ne', 'w', 'e', 'sw', 'nw'
  ]);
  const [isEditMode, setIsEditMode] = useState<boolean>(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onLayoutChange = (_layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    const clonedLayouts = JSON.parse(JSON.stringify(allLayouts));
    setLayouts(clonedLayouts);
    
    // Trigger resize events for charts
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('react-grid-layout-resize'));
      window.dispatchEvent(new Event('resize'));
    }, 50);
  };

  const onDrag = () => {
    document.dispatchEvent(new CustomEvent('react-grid-layout-drag'));
  };

  const onResize = () => {
    document.dispatchEvent(new CustomEvent('react-grid-layout-resize'));
  };

  const onBreakpointChange = (breakpoint: string) => {
    setCurrentBreakpoint(breakpoint);
  };

  const onDrop = (_layout: Layout[], item: Layout) => {
    const newId = idRef.current.toString();
    idRef.current += 1;
    
    const newItem: Layout = {
      i: newId,
      x: item.x,
      y: item.y,
      w: 6,
      h: 2,
      static: false,
    };

    setLayouts(prev => {
      const updated = { ...prev };
      if (!updated[currentBreakpoint]) {
        updated[currentBreakpoint] = [];
      }
      
      const filtered = updated[currentBreakpoint].filter((i: Layout) => i.i !== "__dropping-elem__");
      updated[currentBreakpoint] = [...filtered, newItem];
      
      return updated;
    });
  };

  const toggleCompactType = () => {
    setCompactType(prev =>
      prev === "vertical" ? "horizontal" : prev === "horizontal" ? null : "vertical"
    );
  };

  const removeItem = (id: string) => {
    setLayouts(prev => {
      const updated = { ...prev };
      if (updated[currentBreakpoint]) {
        updated[currentBreakpoint] = updated[currentBreakpoint].filter((item: Layout) => item.i !== id);
      }
      return updated;
    });
  
    setChartConfigs(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const toggleEditMode = () => {
    setIsEditMode(prev => !prev);
  };

  const getChartConfig = (itemId: string) => {
    const config = chartConfigs[itemId];
    if (!config) return null;
    
    if (config.processed) {
      return config.processed;
    } else if (config.template) {
      try {
        return JSON.parse(config.template);
      } catch {
        return null;
      }
    } else {
      return config;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              {isEditMode ? "Edit mode: Drag, resize, and configure your charts" : "View mode: Dashboard is locked"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleCompactType}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Layout: {compactType || "Free"}
            </button>
            <button
              onClick={toggleEditMode}
              className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
                isEditMode
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {isEditMode ? (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Dashboard
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Dashboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Fixed Toolbar */}
      {isEditMode && (
        <div className="fixed top-20 left-0 right-0 z-40 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div
              className="droppable-element flex items-center justify-center bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg px-4 py-3 cursor-grab hover:bg-blue-100 transition-colors select-none"
              draggable={true}
              unselectable="on"
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", "");
                e.dataTransfer.effectAllowed = "move";
                // Add a slight delay to ensure proper drag initialization
                setTimeout(() => {
                  e.dataTransfer.dropEffect = "move";
                }, 0);
              }}
              onDragEnd={(e) => {
                e.preventDefault();
              }}
            >
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-blue-700 font-medium">Drag to add new chart</span>
            </div>
            
            <div className="text-sm text-gray-500">
              Drag the element above into the grid to create a new chart widget
            </div>
          </div>
        </div>
      )}

      {/* Content with top padding to account for fixed header and toolbar */}
      <div className={`p-2 ${isEditMode ? 'pt-52' : 'pt-24'}`} style={{ position: 'relative' }}>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={100}
          compactType={compactType}
          preventCollision={!compactType}
          useCSSTransforms={mounted}
          onLayoutChange={onLayoutChange}
          onBreakpointChange={onBreakpointChange}
          onDrop={onDrop}
          onDrag={onDrag}
          onResize={onResize}
          droppingItem={{ i: "__dropping-elem__", w: 6, h: 2 }}
          isDroppable={isEditMode}
          isResizable={isEditMode}
          isDraggable={isEditMode}
          draggableCancel=".non-draggable-close-btn, .non-draggable-edit-btn"
          resizeHandles={resizeHandle}
          allowOverlap={false}
          margin={[10, 10]}
          style={{ minHeight: '400px' }}
        >
          {(layouts[currentBreakpoint] || []).map((item) => {
            const chartConfig = getChartConfig(item.i);
            
            return (
              <div
                key={item.i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  minHeight: 0,
                  minWidth: 0,
                }}
              >
                {/* Chart Controls */}
                {isEditMode && (
                  <div className="absolute top-2 right-2 z-10 flex space-x-1">
                    <button
                      className="non-draggable-edit-btn bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors"
                      onClick={() => navigate(`/addChart/${item.i}`)}
                      title="Edit Chart"
                    >
                       <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      className="non-draggable-close-btn bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors"
                      onClick={() => removeItem(item.i)}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Chart Content */}
                <div 
                  className="flex-1 p-2" 
                  style={{ 
                    minHeight: 0,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {chartConfig ? (
                    <ResizableChart options={chartConfig} />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2 2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">Empty Chart</h3>
                        <p className="text-xs text-gray-500 mb-3">Click Edit to configure this chart</p>
                        {isEditMode && (
                          <button
                            onClick={() => navigate(`/addChart/${item.i}`)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Configure Chart
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </ResponsiveGridLayout>

        {/* Empty State */}
        {(!layouts[currentBreakpoint] || layouts[currentBreakpoint].length === 0) && (
          <div className="text-center py-12">
            <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2 2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Charts Yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              {isEditMode 
                ? "Drag the 'Add Chart' element into this area to create your first visualization"
                : "Switch to edit mode to add charts to your dashboard"
              }
            </p>
            {!isEditMode && (
              <button
                onClick={toggleEditMode}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Enter Edit Mode
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// import { useState, useEffect, useRef } from "react";
// import { useNavigate } from 'react-router-dom';
// import { Responsive, WidthProvider, Layout } from "react-grid-layout";
// import "react-grid-layout/css/styles.css";
// import "react-resizable/css/styles.css";
// import "../App";
// import { useRecoilState, useRecoilValue } from "recoil";
// import { chartConfigState } from "../recoil/ChartConfig";
// import { layoutState } from "../recoil/LayoutState";
// import ResizableChart from "../components/ResizableChart";
// import { useSetRecoilState } from "recoil";

// const ResponsiveGridLayout = WidthProvider(Responsive);

// interface ChartConfigData {
//   template?: string;
//   processed?: any;
//   [key: string]: any;
// }

// export default function DropDragDashboard() {
//   const navigate = useNavigate();
//   const idRef = useRef(1);
//   const chartConfigs = useRecoilValue<Record<string, ChartConfigData>>(chartConfigState);
//   const setChartConfigs = useSetRecoilState(chartConfigState);

//   const [layouts, setLayouts] = useRecoilState(layoutState);

//   type ResizeHandleAxis = 's' | 'n' | 'se' | 'ne' | 'w' | 'e' | 'sw' | 'nw';

//   const [compactType, setCompactType] = useState<"vertical" | "horizontal" | null>("vertical");
//   const [mounted, setMounted] = useState(false);
//   const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
//   const [resizeHandle, setResizehandle] = useState<ResizeHandleAxis[]>([
//     's', 'n', 'se', 'ne', 'w', 'e', 'sw', 'nw'
//   ]);
//   const [isEditMode, setIsEditMode] = useState<boolean>(true);

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   const onLayoutChange = (_layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
//     const clonedLayouts = JSON.parse(JSON.stringify(allLayouts));
//     setLayouts(clonedLayouts);
//   };

//   const onBreakpointChange = (breakpoint: string) => {
//     setCurrentBreakpoint(breakpoint);
//   };

//   const onDrop = (_layout: Layout[], item: Layout) => {
//     const newItem: Layout = {
//       i: idRef.current.toString(),
//       x: item.x,
//       y: item.y,
//       w: 6,
//       h: 2,
//       static: false,
//     };
//     idRef.current += 1;

//     setLayouts(prev => {
//       const updated = JSON.parse(JSON.stringify(prev));
//       const filtered = updated[currentBreakpoint]?.filter((i: Layout) => i.i !== "__dropping-elem__") || [];
//       updated[currentBreakpoint] = [...filtered, newItem];
//       return updated;
//     });
//   };

//   const toggleCompactType = () => {
//     setCompactType(prev =>
//       prev === "vertical" ? "horizontal" : prev === "horizontal" ? null : "vertical"
//     );
//   };

//   const removeItem = (id: string) => {
//     // Remove from layouts
//     setLayouts(prev => {
//       const updated = JSON.parse(JSON.stringify(prev));
//       updated[currentBreakpoint] = updated[currentBreakpoint]?.filter((item: Layout) => item.i !== id.toString());
//       return updated;
//     });
  
//     // Remove from chart configurations
//     setChartConfigs(prev => {
//       const updated = { ...prev };
//       delete updated[id];
//       return updated;
//     });
//   };

//   const toggleEditMode = () => {
//     setIsEditMode(prev => !prev);
//   };

//   // Helper function to get chart config for an item
//   const getChartConfig = (itemId: string) => {
//     const config = chartConfigs[itemId];
//     if (!config) return null;
    
//     // If it has a processed version, use that; otherwise use the config directly
//     if (config.processed) {
//       return config.processed;
//     } else if (config.template) {
//       // If only template exists, try to parse it (this shouldn't happen in normal flow)
//       try {
//         return JSON.parse(config.template);
//       } catch {
//         return null;
//       }
//     } else {
//       // Legacy format - direct config object
//       return config;
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white border-b border-gray-200 px-6 py-4">
//         <div className="flex items-center justify-between">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
//             <p className="text-sm text-gray-600 mt-1">
//               {isEditMode ? "Edit mode: Drag, resize, and configure your charts" : "View mode: Dashboard is locked"}
//             </p>
//           </div>
//           <div className="flex items-center space-x-3">
//             <button
//               onClick={toggleCompactType}
//               className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
//             >
//               Layout: {compactType || "Free"}
//             </button>
//             <button
//               onClick={toggleEditMode}
//               className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
//                 isEditMode
//                   ? "bg-green-500 text-white hover:bg-green-600"
//                   : "bg-blue-500 text-white hover:bg-blue-600"
//               }`}
//             >
//               {isEditMode ? (
//                 <>
//                   <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                   </svg>
//                   Save Dashboard
//                 </>
//               ) : (
//                 <>
//                   <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                   </svg>
//                   Edit Dashboard
//                 </>
//               )}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Toolbar */}
//       {isEditMode && (
//         <div className="bg-white border-b border-gray-200 px-6 py-4">
//           <div className="flex items-center space-x-4">
//             <div
//               className="droppable-element flex items-center justify-center bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg px-4 py-3 cursor-grab hover:bg-blue-100 transition-colors"
//               draggable
//               unselectable="on"
//               onDragStart={(e) => e.dataTransfer.setData("text/plain", "new-item")}
//             >
//               <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
//               </svg>
//               <span className="text-blue-700 font-medium">Drag to add new chart</span>
//             </div>
            
//             <div className="text-sm text-gray-500">
//               Drag the element above into the grid to create a new chart widget
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Grid Layout */}
//       <div className="p-6">
//         <ResponsiveGridLayout
//           className="layout"
//           layouts={layouts}
//           breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
//           cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
//           rowHeight={220}
//           compactType={compactType}
//           preventCollision={!compactType}
//           useCSSTransforms={mounted}
//           onLayoutChange={onLayoutChange}
//           onBreakpointChange={onBreakpointChange}
//           onDrop={onDrop}
//           droppingItem={{ i: "__dropping-elem__", w: 6, h: 2 }}
//           isDroppable={isEditMode}
//           isResizable={isEditMode}
//           isDraggable={isEditMode}
//           draggableCancel=".non-draggable-close-btn, .non-draggable-edit-btn"
//           resizeHandles={resizeHandle}
//         >
//           {layouts[currentBreakpoint]?.map((item) => {
//             const chartConfig = getChartConfig(item.i);
            
//             return (
//               <div
//                 key={item.i}
//                 className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   position: "relative",
//                 }}
//               >
//                 {/* Chart Controls */}
//                 {isEditMode && (
//                   <div className="absolute top-2 right-2 z-10 flex space-x-1">
//                     <button
//                       className="non-draggable-edit-btn bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors"
//                       onClick={() => navigate(`/addChart/${item.i}`)}
//                     >
//                       Edit
//                     </button>
//                     <button
//                       className="non-draggable-close-btn bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors"
//                       onClick={() => {
//                         console.log("Clicked delete for:", item.i);
//                         removeItem(item.i);
//                       }}
//                     >
//                       ×
//                     </button>
//                   </div>
//                 )}

//                 {/* Chart Content */}
//                 <div className="flex-1 p-2">
//                   {chartConfig ? (
//                     <ResizableChart options={chartConfig} />
//                   ) : (
//                     <div className="h-full flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
//                       <div className="text-center">
//                         <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//                         </svg>
//                         <h3 className="text-sm font-medium text-gray-900 mb-1">Empty Chart</h3>
//                         <p className="text-xs text-gray-500 mb-3">Click Edit to configure this chart</p>
//                         {isEditMode && (
//                           <button
//                             onClick={() => navigate(`/addChart/${item.i}`)}
//                             className="text-xs text-blue-600 hover:text-blue-800 underline"
//                           >
//                             Configure Chart
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             );
//           })}
//         </ResponsiveGridLayout>

//         {/* Empty State */}
//         {(!layouts[currentBreakpoint] || layouts[currentBreakpoint].length === 0) && (
//           <div className="text-center py-12">
//             <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//             </svg>
//             <h3 className="text-lg font-medium text-gray-900 mb-2">No Charts Yet</h3>
//             <p className="text-sm text-gray-600 mb-4">
//               {isEditMode 
//                 ? "Drag the 'Add Chart' element into this area to create your first visualization"
//                 : "Switch to edit mode to add charts to your dashboard"
//               }
//             </p>
//             {!isEditMode && (
//               <button
//                 onClick={toggleEditMode}
//                 className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
//               >
//                 Enter Edit Mode
//               </button>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }