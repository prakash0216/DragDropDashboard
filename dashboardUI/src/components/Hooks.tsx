import React, { useState, useCallback } from 'react';
import {
  useRecoilState,
  useRecoilValue,
  useSetRecoilState
} from 'recoil';
import { variableNamesState, variableUpdateTriggerState } from '../recoil/Variabletracker';
import { dataSourceNamesState, dataSourceAtomFamily } from '../recoil/DataSourceFamily';
import { variableAtomFamily } from '../recoil/VariableFamily';

// Helper to safely parse stored strings into arrays/objects/values
const safeParse = (value: string): any => {
  try {
    return JSON.parse(value); // if it's valid JSON
  } catch {
    try {
      return Function('"use strict";return (' + value + ')')(); // try JS expression
    } catch {
      return value; // fallback to original string
    }
  }
};

// Child component to render each variable's value from Recoil
function VariableDisplay({ name }: { name: string }) {
  const value = useRecoilValue(variableAtomFamily(name));
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-800">{name}</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {Array.isArray(value) ? 'array' : typeof value}
        </span>
      </div>
      <div className="bg-white p-3 rounded border">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
          {Array.isArray(value) || (typeof value === 'object' && value !== null)
            ? JSON.stringify(value, null, 2)
            : String(value)}
        </pre>
      </div>
    </div>
  );
}

export default function Hooks() {
  const [variableNames, setVariableNames] = useRecoilState(variableNamesState);
  const setUpdateTrigger = useSetRecoilState(variableUpdateTriggerState);

  const [calculationLogic, setCalculationLogic] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [variableName, setVariableName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Setter for the variable atom
  const setVariableAtom = useSetRecoilState(variableAtomFamily(variableName));

  const executeCalculation = useCallback(async () => {
    if (!calculationLogic.trim() || !variableName.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:3002/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logic: calculationLogic,
          variableName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const result = await response.json();

      // Always safe-parse the backend result if it's a string
      const calculatedValue =
        typeof result.value === 'string' ? safeParse(result.value) : result.value;

      // Save in Recoil
      setVariableAtom(calculatedValue);
      //@ts-ignore
      setVariableNames(prev => new Set([...prev, variableName]));
      setUpdateTrigger(prev => prev + 1);

      // Reset form
      setCalculationLogic('');
      setVariableName('');
      setSuccess(`Variable "${variableName}" created successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed execution');
    } finally {
      setIsLoading(false);
    }
  }, [
    calculationLogic,
    dataSource,
    variableName,
    variableNames,
    setVariableAtom,
    setVariableNames,
    setUpdateTrigger
  ]);

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setter(e.target.value);
        if (error) setError(null);
        if (success) setSuccess(null);
      };

  return (
    <div className="p-6 w-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Dynamic Calculation Engine</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Form Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Create Calculation</h2>
          <div className="space-y-4">
            {/* Logic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calculation Logic</label>
              <textarea
                value={calculationLogic}
                onChange={handleInputChange(setCalculationLogic)}
                placeholder="Example: data.map(x => x * 2)"
                className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm"
                rows={6}
              />
            </div>
            
            {/* Variable Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Variable Name</label>
              <input
                type="text"
                value={variableName}
                onChange={handleInputChange(setVariableName)}
                placeholder="e.g., arrayResult"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            {error && <div className="bg-red-50 border text-red-700 px-4 py-3 rounded-md">{error}</div>}
            {success && <div className="bg-green-50 border text-green-700 px-4 py-3 rounded-md">{success}</div>}

            {/* Execute */}
            <button
              onClick={executeCalculation}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Calculating...' : 'Execute Calculation'}
            </button>
          </div>
        </div>

        {/* Stored Variables */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Stored Variables ({variableNames.size})
          </h2>
          {variableNames.size === 0 ? (
            <div className="text-center py-8 text-gray-500 italic">No variables yet</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Array.from(variableNames).map(name => (
                <VariableDisplay key={name} name={name} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



// import React, { useState, useCallback } from 'react';
// import {
//   useRecoilState,
//   useRecoilValue,
//   useSetRecoilState
// } from 'recoil';
// import { variableNamesState, variableUpdateTriggerState } from '../recoil/Variabletracker';
// import { dataSourceNamesState, dataSourceAtomFamily } from '../recoil/DataSourceFamily';
// import { variableAtomFamily } from '../recoil/VariableFamily';

// // Helper to safely parse stored strings into arrays/objects/values
// const safeParse = (value: string): any => {
//   try {
//     return JSON.parse(value); // if it's valid JSON
//   } catch {
//     try {
//       return Function('"use strict";return (' + value + ')')(); // try JS expression
//     } catch {
//       return value; // fallback to original string
//     }
//   }
// };

// // Child component to render each variable's value from Recoil
// function VariableDisplay({ name }: { name: string }) {
//   const value = useRecoilValue(variableAtomFamily(name));
//   return (
//     <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
//       <div className="flex items-center justify-between mb-2">
//         <h3 className="font-medium text-gray-800">{name}</h3>
//         <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
//           {Array.isArray(value) ? 'array' : typeof value}
//         </span>
//       </div>
//       <div className="bg-white p-3 rounded border">
//         <pre className="text-sm text-gray-700 whitespace-pre-wrap">
//           {Array.isArray(value) || (typeof value === 'object' && value !== null)
//             ? JSON.stringify(value, null, 2)
//             : String(value)}
//         </pre>
//       </div>
//     </div>
//   );
// }

// export default function Hooks() {
//   const [variableNames, setVariableNames] = useRecoilState(variableNamesState);
//   const [dataSourceNames] = useRecoilState(dataSourceNamesState);
//   const setUpdateTrigger = useSetRecoilState(variableUpdateTriggerState);

//   const [calculationLogic, setCalculationLogic] = useState('');
//   const [dataSource, setDataSource] = useState('');
//   const [variableName, setVariableName] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   // Raw string from Recoil
//   const rawDataSourceValue = useRecoilValue(
//     dataSource ? dataSourceAtomFamily(dataSource) : dataSourceAtomFamily('')
//   );
//   // Parse before sending to API
//   const parsedDataSourceValue = safeParse(rawDataSourceValue);

//   // Setter for the variable atom
//   const setVariableAtom = useSetRecoilState(variableAtomFamily(variableName));

//   const executeCalculation = useCallback(async () => {
//     if (!calculationLogic.trim() || !dataSource.trim() || !variableName.trim()) {
//       setError('Please fill in all fields');
//       return;
//     }
//     setIsLoading(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const response = await fetch('http://localhost:3002/api/calculate', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           logic: calculationLogic,
//           dataSource: parsedDataSourceValue, // send parsed array/object
//           variableName
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || `HTTP error ${response.status}`);
//       }

//       const result = await response.json();

//       // Always safe-parse the backend result if it's a string
//       const calculatedValue =
//         typeof result.value === 'string' ? safeParse(result.value) : result.value;

//       // Save in Recoil
//       setVariableAtom(calculatedValue);
//       //@ts-ignore
//       setVariableNames(prev => new Set([...prev, variableName]));
//       setUpdateTrigger(prev => prev + 1);

//       // Reset form
//       setCalculationLogic('');
//       setDataSource('');
//       setVariableName('');
//       setSuccess(`Variable "${variableName}" created successfully.`);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed execution');
//     } finally {
//       setIsLoading(false);
//     }
//   }, [
//     calculationLogic,
//     dataSource,
//     variableName,
//     variableNames,
//     parsedDataSourceValue,
//     setVariableAtom,
//     setVariableNames,
//     setUpdateTrigger
//   ]);

//   const handleInputChange =
//     (setter: React.Dispatch<React.SetStateAction<string>>) =>
//       (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
//         setter(e.target.value);
//         if (error) setError(null);
//         if (success) setSuccess(null);
//       };

//   return (
//     <div className="p-6 w-full">
//       <h1 className="text-3xl font-bold mb-6 text-gray-800">Dynamic Calculation Engine</h1>
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

//         {/* Form Section */}
//         <div className="bg-white rounded-lg shadow-lg p-6">
//           <h2 className="text-xl font-semibold mb-4 text-gray-700">Create Calculation</h2>
//           <div className="space-y-4">
//             {/* Logic */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Calculation Logic</label>
//               <textarea
//                 value={calculationLogic}
//                 onChange={handleInputChange(setCalculationLogic)}
//                 placeholder="Example: data.map(x => x * 2)"
//                 className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm"
//                 rows={6}
//               />
//             </div>
//             {/* Data Source */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
//               <select
//                 value={dataSource}
//                 onChange={handleInputChange(setDataSource)}
//                 className="w-full p-3 border border-gray-300 rounded-md"
//               >
//                 <option value="">-- Select Data Source --</option>
//                 {dataSourceNames.map(src => (
//                   <option key={src} value={src}>{src}</option>
//                 ))}
//               </select>
//             </div>
//             {/* Variable Name */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Variable Name</label>
//               <input
//                 type="text"
//                 value={variableName}
//                 onChange={handleInputChange(setVariableName)}
//                 placeholder="e.g., arrayResult"
//                 className="w-full p-3 border border-gray-300 rounded-md"
//               />
//             </div>

//             {error && <div className="bg-red-50 border text-red-700 px-4 py-3 rounded-md">{error}</div>}
//             {success && <div className="bg-green-50 border text-green-700 px-4 py-3 rounded-md">{success}</div>}

//             {/* Execute */}
//             <button
//               onClick={executeCalculation}
//               disabled={isLoading}
//               className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
//             >
//               {isLoading ? 'Calculating...' : 'Execute Calculation'}
//             </button>
//           </div>
//         </div>

//         {/* Stored Variables */}
//         <div className="bg-white rounded-lg shadow-lg p-6">
//           <h2 className="text-xl font-semibold mb-4 text-gray-700">
//             Stored Variables ({variableNames.size})
//           </h2>
//           {variableNames.size === 0 ? (
//             <div className="text-center py-8 text-gray-500 italic">No variables yet</div>
//           ) : (
//             <div className="space-y-3 max-h-96 overflow-y-auto">
//               {Array.from(variableNames).map(name => (
//                 <VariableDisplay key={name} name={name} />
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }



// import React, { useState, useCallback } from 'react';
// import {
//   useRecoilState,
//   useRecoilValue,
//   useSetRecoilState
// } from 'recoil';
// import { variableNamesState, variableUpdateTriggerState } from '../recoil/Variabletracker';
// import { dataSourceNamesState, dataSourceAtomFamily } from '../recoil/DataSourceFamily';
// import { variableAtomFamily } from '../recoil/VariableFamily';

// // Helper to safely parse stored strings into arrays/objects/values
// const safeParse = (value: string): any => {
//   try {
//     return JSON.parse(value); // if it's valid JSON
//   } catch {
//     try {
//       return Function('"use strict";return (' + value + ')')(); // try JS eval-like parsing
//     } catch {
//       return value; // fallback to the string itself
//     }
//   }
// };

// // Child component to render each variable's value from Recoil
// function VariableDisplay({ name }: { name: string }) {
//   const value = useRecoilValue(variableAtomFamily(name));
//   return (
//     <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
//       <div className="flex items-center justify-between mb-2">
//         <h3 className="font-medium text-gray-800">{name}</h3>
//         <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
//           {typeof value}
//         </span>
//       </div>
//       <div className="bg-white p-3 rounded border">
//         <pre className="text-sm text-gray-700 whitespace-pre-wrap">
//           {typeof value === 'object'
//             ? JSON.stringify(value, null, 2)
//             : String(value)}
//         </pre>
//       </div>
//     </div>
//   );
// }

// export default function Hooks() {
//   const [variableNames, setVariableNames] = useRecoilState(variableNamesState);
//   const [dataSourceNames] = useRecoilState(dataSourceNamesState);
//   const setUpdateTrigger = useSetRecoilState(variableUpdateTriggerState);

//   const [calculationLogic, setCalculationLogic] = useState('');
//   const [dataSource, setDataSource] = useState('');
//   const [variableName, setVariableName] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   // Get raw string value from Recoil for selected data source
//   const rawDataSourceValue = useRecoilValue(
//     dataSource ? dataSourceAtomFamily(dataSource) : dataSourceAtomFamily('')
//   );

//   // Parse it into proper type (array/object/etc.)
//   const parsedDataSourceValue = safeParse(rawDataSourceValue);

//   // Setter for the current variable atom
//   const setVariableAtom = useSetRecoilState(variableAtomFamily(variableName));

//   const executeCalculation = useCallback(async () => {
//     if (!calculationLogic.trim() || !dataSource.trim() || !variableName.trim()) {
//       setError('Please fill in all fields');
//       return;
//     }
//     if (variableNames.has(variableName)) {
//       setError('Variable name already exists.');
//       return;
//     }
//     setIsLoading(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const response = await fetch('http://localhost:3002/api/calculate', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           logic: calculationLogic,
//           dataSource: parsedDataSourceValue, // send parsed
//           variableName
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || `HTTP error ${response.status}`);
//       }
//       const result = await response.json();
//       const calculatedValue = result.value ?? result;

      

//       // Store into Recoil atom family & variable names set
//       setVariableAtom(calculatedValue);
//       //@ts-ignore
//       setVariableNames(prev => new Set([...prev, variableName]));
//       setUpdateTrigger(prev => prev + 1);

//       setCalculationLogic('');
//       setDataSource('');
//       setVariableName('');
//       setSuccess(`Variable "${variableName}" created successfully.`);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed execution');
//     } finally {
//       setIsLoading(false);
//     }
//   }, [
//     calculationLogic,
//     dataSource,
//     variableName,
//     variableNames,
//     parsedDataSourceValue,
//     setVariableAtom,
//     setVariableNames,
//     setUpdateTrigger
//   ]);

//   const handleInputChange =
//     (setter: React.Dispatch<React.SetStateAction<string>>) =>
//     (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
//       setter(e.target.value);
//       if (error) setError(null);
//       if (success) setSuccess(null);
//     };

//   return (
//     <div className="p-6 w-full">
//       <h1 className="text-3xl font-bold mb-6 text-gray-800">Dynamic Calculation Engine</h1>
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Form */}
//         <div className="bg-white rounded-lg shadow-lg p-6">
//           <h2 className="text-xl font-semibold mb-4 text-gray-700">Create Calculation</h2>
//           <div className="space-y-4">
//             {/* Logic */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Calculation Logic</label>
//               <textarea
//                 value={calculationLogic}
//                 onChange={handleInputChange(setCalculationLogic)}
//                 placeholder="Example: data.map(x => x * 2)"
//                 className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm"
//                 rows={6}
//               />
//             </div>
//             {/* Data Source */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
//               <select
//                 value={dataSource}
//                 onChange={handleInputChange(setDataSource)}
//                 className="w-full p-3 border border-gray-300 rounded-md"
//               >
//                 <option value="">-- Select Data Source --</option>
//                 {dataSourceNames.map(src => (
//                   <option key={src} value={src}>{src}</option>
//                 ))}
//               </select>
//             </div>
//             {/* Variable Name */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Variable Name</label>
//               <input
//                 type="text"
//                 value={variableName}
//                 onChange={handleInputChange(setVariableName)}
//                 placeholder="e.g., arrayResult"
//                 className="w-full p-3 border border-gray-300 rounded-md"
//               />
//             </div>
//             {/* Messages */}
//             {error && <div className="bg-red-50 border text-red-700 px-4 py-3 rounded-md">{error}</div>}
//             {success && <div className="bg-green-50 border text-green-700 px-4 py-3 rounded-md">{success}</div>}
//             {/* Execute */}
//             <button
//               onClick={executeCalculation}
//               disabled={isLoading}
//               className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
//             >
//               {isLoading ? 'Calculating...' : 'Execute Calculation'}
//             </button>
//           </div>
//         </div>
//         {/* Variable list */}
//         <div className="bg-white rounded-lg shadow-lg p-6">
//           <h2 className="text-xl font-semibold mb-4 text-gray-700">
//             Stored Variables ({variableNames.size})
//           </h2>
//           {variableNames.size === 0 ? (
//             <div className="text-center py-8 text-gray-500 italic">No variables yet</div>
//           ) : (
//             <div className="space-y-3 max-h-96 overflow-y-auto">
//               {Array.from(variableNames).map(name => (
//                 <VariableDisplay key={name} name={name} />
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
