import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Babel from '@babel/standalone';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as BabelParser from '@babel/parser';
import { useRecoilValue, useRecoilCallback, useSetRecoilState } from 'recoil';
import { dataSourceAtomFamily } from '../recoil/DataSourceFamily';
import { variableAtomFamily } from '../recoil/VariableFamily';
import { variableNamesState, variableUpdateTriggerState } from '../recoil/Variabletracker';
import { dataSourceNamesState } from '../recoil/DataSourceTracker';

// Helper to safely parse values
const safeParse = (value: string): any => {
  try {
    return JSON.parse(value);
  } catch {
    try {
      return Function('"use strict";return (' + value + ')')();
    } catch {
      return value;
    }
  }
};

const VariableValue = ({ name }: { name: string }) => {
  const rawValue = useRecoilValue(variableAtomFamily(name));
  const parsedValue = safeParse(rawValue);

  return (
    <li>
      <strong>{name}:</strong>{' '}
      {typeof parsedValue === 'object'
        ? JSON.stringify(parsedValue, null, 2)
        : String(parsedValue)}
    </li>
  );
};

const JsCompiler = () => {
  // Get dynamic list of data sources
  const dataSourceNames = useRecoilValue(dataSourceNamesState);
  
  const [code, setCode] = useState<string>(
    `// Example usage:
let arrayResult=ds1.map(x=>x*2)
    `
  );
  const [output, setOutput] = useState<string>('');
  const [topLevelVars, setTopLevelVars] = useState<string[]>([]);

  const setVariableNames = useSetRecoilState(variableNamesState);
  const setUpdateTrigger = useSetRecoilState(variableUpdateTriggerState);

  // Dynamically get all data source values
  const getDataSourceValues = useRecoilCallback(({ snapshot }) => () => {
    const dataSourceValues: Record<string, any> = {};
    dataSourceNames.forEach(dsName => {
      try {
        const rawValue = snapshot.getLoadable(dataSourceAtomFamily(dsName)).contents;
        const parsedValue = safeParse(rawValue);
        if (parsedValue !== '') { // Only include non-empty data sources
          dataSourceValues[dsName] = parsedValue;
        }
      } catch (err) {
        console.warn(`Failed to load data source ${dsName}:`, err);
      }
    });
    return dataSourceValues;
  });

  const runCode = useRecoilCallback(({ set }) => () => {
    try {
      const transpiled = Babel.transform(code, { presets: ['env'] }).code || '';
      const logs: string[] = [];

      const customConsole = {
        log: (...args: any[]) => {
          const formatted = args
            .map((arg) =>
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            )
            .join(' ');
          logs.push(formatted);
        },
      };

      const resultCollector: Record<string, any> = {};
      
      // Get all data source values dynamically
      const dataSourceValues = getDataSourceValues();
      
      const sandbox: Record<string, any> = {
        console: customConsole,
        resultCollector,
        ...dataSourceValues, // Spread all data sources into the sandbox
      };

      const ast = BabelParser.parse(code, { sourceType: 'script' });
      const topLevelVars: string[] = [];

      traverse(ast, {
        VariableDeclarator(path) {
          const isTopLevel = path.getFunctionParent() === null;
          if (isTopLevel && t.isIdentifier(path.node.id)) {
            topLevelVars.push(path.node.id.name);
          }
        },
      });

      // Inject resultCollector assignments
      const collectorCode = topLevelVars
        .map(
          (varName) =>
            `resultCollector["${varName}"] = typeof ${varName} !== "undefined" ? ${varName} : null;`
        )
        .join('\n');

      const wrappedCode = `
        try {
          ${transpiled}
          ${collectorCode}
        } catch (e) {
          console.log("Runtime error:", e.message);
        }
      `;

      const func = new Function(...Object.keys(sandbox), wrappedCode);
      func(...Object.values(sandbox));

      // Update variable atoms and track variable names
      const updatedVarNames: string[] = [];
      topLevelVars.forEach((varName) => {
        const value = resultCollector[varName];
        if (value !== undefined) {
          set(variableAtomFamily(varName), JSON.stringify(value));
          updatedVarNames.push(varName);
        }
      });

      // Update the set of all variable names
      setVariableNames(prevNames => {
        const newSet = new Set(prevNames);
        updatedVarNames.forEach(name => newSet.add(name));
        return newSet;
      });
      
      // Trigger update for components listening to variable changes
      setUpdateTrigger(prev => prev + 1);

      setTopLevelVars(topLevelVars);
      setOutput(logs.join('\n'));
    } catch (err: any) {
      console.error("Compiler Error:", err);
      setOutput(`Error: ${err.message}`);
    }
  });

  return (
    <div style={{
      display: 'flex',
      gap: '20px',
      alignItems: 'flex-start',
      backgroundColor: '#1e1e1e',
      color: '#fff',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Show available data sources */}
        <div style={{ 
          marginBottom: '10px', 
          padding: '8px', 
          backgroundColor: '#2d2d2d', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>Available Data Sources:</strong> {dataSourceNames.join(', ') || 'None'}
        </div>
        
        <Editor
          height="400px"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
        />
        <div style={{ borderTop: '1px solid #444', marginTop: '10px', paddingTop: '10px', textAlign: 'right' }}>
          <button
            onClick={runCode}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007acc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Run
          </button>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ marginTop: '-10px', marginBottom: '10px' }}>Output</h4>
        <pre style={{
          background: '#2d2d2d',
          color: '#dcdcdc',
          padding: '10px',
          height: '400px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          border: '1px solid #444',
          marginTop: '4px'
        }}>
          {output}
        </pre>

        {topLevelVars.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4>Variable Atom Values</h4>
            <ul>
              {topLevelVars.map((varName) => (
                <VariableValue key={varName} name={varName} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default JsCompiler;



// import React, { useState } from 'react';
// import Editor from '@monaco-editor/react';
// import * as Babel from '@babel/standalone';
// import traverse from '@babel/traverse';
// import * as t from '@babel/types';
// import * as BabelParser from '@babel/parser';
// import { useRecoilValue, useRecoilCallback, useSetRecoilState } from 'recoil';
// import { dataSourceAtomFamily } from '../recoil/DataSourceFamily';
// import { variableAtomFamily } from '../recoil/VariableFamily';
// import { variableNamesState, variableUpdateTriggerState } from '../recoil/Variabletracker';

// // Helper to safely parse values
// const safeParse = (value: string): any => {
//   try {
//     return JSON.parse(value);
//   } catch {
//     try {
//       return Function('"use strict";return (' + value + ')')();
//     } catch {
//       return value;
//     }
//   }
// };

// const VariableValue = ({ name }: { name: string }) => {
//   const rawValue = useRecoilValue(variableAtomFamily(name));
//   const parsedValue = safeParse(rawValue);

//   return (
//     <li>
//       <strong>{name}:</strong>{' '}
//       {typeof parsedValue === 'object'
//         ? JSON.stringify(parsedValue, null, 2)
//         : String(parsedValue)}
//     </li>
//   );
// };

// const JsCompiler = () => {
//   const [code, setCode] = useState<string>(
//     `// You can use ds1, ds2, ds3 in your code
// let result = ds1.map(x => x * 2);
// console.log(result);`
//   );
//   const [output, setOutput] = useState<string>('');
//   const [topLevelVars, setTopLevelVars] = useState<string[]>([]);

//   const ds1 = useRecoilValue(dataSourceAtomFamily('ds1'));
//   const ds2 = useRecoilValue(dataSourceAtomFamily('ds2'));
//   const ds3 = useRecoilValue(dataSourceAtomFamily('ds3'));
//   const setVariableNames = useSetRecoilState(variableNamesState);
//   const setUpdateTrigger = useSetRecoilState(variableUpdateTriggerState);

//   const runCode = useRecoilCallback(({ set }) => () => {
//     try {
//       const transpiled = Babel.transform(code, { presets: ['env'] }).code || '';
//       const logs: string[] = [];

//       const customConsole = {
//         log: (...args: any[]) => {
//           const formatted = args
//             .map((arg) =>
//               typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
//             )
//             .join(' ');
//           logs.push(formatted);
//         },
//       };

//       const resultCollector: Record<string, any> = {};
//       const sandbox: Record<string, any> = {
//         console: customConsole,
//         ds1: safeParse(ds1),
//         ds2: safeParse(ds2),
//         ds3: safeParse(ds3),
//         resultCollector,
//       };

//       const ast = BabelParser.parse(code, { sourceType: 'script' });
//       const topLevelVars: string[] = [];

//       traverse(ast, {
//         VariableDeclarator(path) {
//           const isTopLevel = path.getFunctionParent() === null;
//           if (isTopLevel && t.isIdentifier(path.node.id)) {
//             topLevelVars.push(path.node.id.name);
//           }
//         },
//       });

//       // Inject resultCollector assignments
//       const collectorCode = topLevelVars
//         .map(
//           (varName) =>
//             `resultCollector["${varName}"] = typeof ${varName} !== "undefined" ? ${varName} : null;`
//         )
//         .join('\n');

//       const wrappedCode = `
//         try {
//           ${transpiled}
//           ${collectorCode}
//         } catch (e) {
//           console.log("Runtime error:", e.message);
//         }
//       `;

//       const func = new Function(...Object.keys(sandbox), wrappedCode);
//       func(...Object.values(sandbox));

//       // Update variable atoms and track variable names
//       const updatedVarNames: string[] = [];
//       topLevelVars.forEach((varName) => {
//         const value = resultCollector[varName];
//         if (value !== undefined) {
//           set(variableAtomFamily(varName), JSON.stringify(value));
//           updatedVarNames.push(varName);
//         }
//       });

//       // Update the set of all variable names
//       setVariableNames(prevNames => {
//         const newSet = new Set(prevNames);
//         updatedVarNames.forEach(name => newSet.add(name));
//         return newSet;
//       });
      
//       // Trigger update for components listening to variable changes
//       setUpdateTrigger(prev => prev + 1);

//       setTopLevelVars(topLevelVars);
//       setOutput(logs.join('\n'));
//     } catch (err: any) {
//       console.error("Compiler Error:", err);
//       setOutput(`Error: ${err.message}`);
//     }
//   });

//   return (
//     <div style={{
//       display: 'flex',
//       gap: '20px',
//       alignItems: 'flex-start',
//       backgroundColor: '#1e1e1e',
//       color: '#fff',
//       padding: '20px',
//       boxSizing: 'border-box'
//     }}>
//       <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
//         <Editor
//           height="400px"
//           defaultLanguage="javascript"
//           theme="vs-dark"
//           value={code}
//           onChange={(value) => setCode(value || '')}
//         />
//         <div style={{ borderTop: '1px solid #444', marginTop: '10px', paddingTop: '10px', textAlign: 'right' }}>
//           <button
//             onClick={runCode}
//             style={{
//               padding: '8px 16px',
//               backgroundColor: '#007acc',
//               color: '#fff',
//               border: 'none',
//               borderRadius: '4px'
//             }}
//           >
//             Run
//           </button>
//         </div>
//       </div>

//       <div style={{ flex: 1 }}>
//         <h4 style={{ marginTop: '-10px', marginBottom: '10px' }}>Output</h4>
//         <pre style={{
//           background: '#2d2d2d',
//           color: '#dcdcdc',
//           padding: '10px',
//           height: '400px',
//           overflowY: 'auto',
//           whiteSpace: 'pre-wrap',
//           border: '1px solid #444',
//           marginTop: '4px'
//         }}>
//           {output}
//         </pre>

//         {topLevelVars.length > 0 && (
//           <div style={{ marginTop: '20px' }}>
//             <h4>Variable Atom Values</h4>
//             <ul>
//               {topLevelVars.map((varName) => (
//                 <VariableValue key={varName} name={varName} />
//               ))}
//             </ul>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default JsCompiler;