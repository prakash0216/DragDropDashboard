import React, { useState } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { dataSourceAtomFamily } from '../recoil/DataSourceFamily';
import { motion, AnimatePresence } from 'framer-motion';
import axios, { AxiosError } from 'axios';
import { dataSourceNamesState } from '../recoil/DataSourceTracker';

// TypeScript interfaces
interface QueryResult {
  success: boolean;
  data?: any[];
  rowCount?: number;
  query?: string;
  message?: string;
  error?: string;
}

interface ApiError {
  success: false;
  error: string;
}

export default function AddDataSource() {
  const [selectedDS, setSelectedDS] = useState<string>('');
  const [newDSName, setNewDSName] = useState<string>('');
  const [dataSourceNames, setDataSourceNames] = useRecoilState(dataSourceNamesState);
  const [isDataSourcesCollapsed, setIsDataSourcesCollapsed] = useState<boolean>(false);
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [pendingDataSource, setPendingDataSource] = useState<string>(''); // Temporary storage for query results
  const [queryCounter, setQueryCounter] = useState<number>(1);
  
  // Get the current data source value only if one is selected
  const [dataSource, setDataSource] = useRecoilState(
    selectedDS ? dataSourceAtomFamily(selectedDS) : dataSourceAtomFamily('__placeholder__')
  );

  const addDataSource = (): void => {
    if (newDSName && !dataSourceNames.includes(newDSName)) {
      setDataSourceNames((prev: string[]) => [...prev, newDSName]);
      setSelectedDS(newDSName);
      setNewDSName('');
    }
  };

  const removeDataSource = (dsName: string): void => {
    setDataSourceNames((prev: string[]) => prev.filter(name => name !== dsName));
    if (selectedDS === dsName) {
      setSelectedDS(dataSourceNames[0] || '');
    }
  };

  const executeQuery = async (): Promise<void> => {
    if (!sqlQuery.trim()) {
      setError('Please enter a SQL query');
      return;
    }
  
    setIsLoading(true);
    setError('');
    setQueryResult(null);
    setPendingDataSource('');
  
    try {
      const response = await axios.post('http://localhost:3002/api/query', {
        sql: sqlQuery
      });
  
      const result = response.data;
      if (result.success) {
        setQueryResult(result);
        const uniqueDSName = `query_${queryCounter}`;
        setQueryCounter(prev => prev + 1);
        const resultData = JSON.stringify(result.data, null, 2);
        setPendingDataSource(resultData);
        setNewDSName(uniqueDSName);
      } else {
        setError(result.error || 'Query execution failed');
      }
    } catch (err) {
      let errorMessage = 'Failed to execute query';
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.error || err.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  

  // Save pending data to selected or new data source
  const savePendingData = (): void => {
    if (!pendingDataSource) return;
    
    if (selectedDS) {
      // Save to currently selected data source
      setDataSource(pendingDataSource);
    } else if (newDSName) {
      // Create new data source and save
      addDataSource();
      // The data will be set after the data source is created
      setTimeout(() => {
        setDataSource(pendingDataSource);
      }, 100);
    }
    
    setPendingDataSource(''); // Clear pending data after saving
  };

  // Clear query and results when starting new query
  const handleQueryChange = (newQuery: string): void => {
    setSqlQuery(newQuery);
    
    // Clear previous results when user starts typing new query
    if (newQuery !== sqlQuery && queryResult) {
      setQueryResult(null);
      setError('');
      setPendingDataSource('');
    }
  };

  // Handle Enter key for query execution
  const handleQueryKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      executeQuery();
    }
  };

  // Auto-select first data source if none selected and sources exist
  React.useEffect(() => {
    if (!selectedDS && dataSourceNames.length > 0) {
      setSelectedDS(dataSourceNames[0]);
    }
  }, [dataSourceNames, selectedDS]);

  return (
    <div className="grid grid-cols-12 gap-4 p-4 h-screen">
      {/* Data Sources Panel */}
      <div className="col-span-3 bg-gray-100 border border-gray-300 rounded flex flex-col">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-300 cursor-pointer hover:bg-gray-200"
          onClick={() => setIsDataSourcesCollapsed(!isDataSourcesCollapsed)}
        >
          <h2 className="text-lg font-semibold">Data Sources</h2>
          <span className="text-sm">
            {isDataSourcesCollapsed ? '→' : '↓'}
          </span>
        </div>

        {/* Collapsible Content */}
        <AnimatePresence>
          {!isDataSourcesCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-4 flex-1 overflow-hidden">
                {/* Add new data source */}
                <div className="mb-4 p-3 bg-white rounded border">
                  <h3 className="text-sm font-medium mb-2">Add New Source</h3>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newDSName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDSName(e.target.value)}
                      placeholder="e.g., ds1, ds2, ds3"
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addDataSource()}
                    />
                    <button
                      onClick={addDataSource}
                      disabled={!newDSName || dataSourceNames.includes(newDSName)}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                  
                  {/* Save pending data button */}
                  {pendingDataSource && (
                    <div className="mt-2">
                      <button
                        onClick={savePendingData}
                        disabled={!selectedDS && !newDSName}
                        className="w-full px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {selectedDS ? `Save to "${selectedDS}"` : newDSName ? `Save to new "${newDSName}"` : 'Select or create data source'}
                      </button>
                    </div>
                  )}
                </div>

                {/* List of data sources */}
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {dataSourceNames.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No data sources yet</p>
                  ) : (
                    dataSourceNames.map((ds: string) => (
                      <div
                        key={ds}
                        className={`flex items-center gap-2 p-2 rounded ${
                          selectedDS === ds ? 'bg-blue-600 text-white' : 'bg-blue-400 text-white hover:bg-blue-500'
                        }`}
                      >
                        <button
                          className="flex-1 text-left"
                          onClick={() => setSelectedDS(ds)}
                        >
                          {ds}
                        </button>
                        <button
                          onClick={() => removeDataSource(ds)}
                          className="text-white hover:text-red-200 px-1"
                          title={`Remove ${ds}`}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Pending Data Preview */}
                {pendingDataSource && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
                    <h4 className="text-sm font-medium mb-2 text-yellow-800">Pending Query Result:</h4>
                    <div className="max-h-20 overflow-y-auto">
                      <pre className="text-xs text-yellow-700 whitespace-pre-wrap">
                        {pendingDataSource.substring(0, 200)}
                        {pendingDataSource.length > 200 ? '...' : ''}
                      </pre>
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">Click "Save" to store this data</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Always visible data source names when collapsed */}
        {isDataSourcesCollapsed && dataSourceNames.length > 0 && (
          <div className="p-2 border-t border-gray-300">
            <div className="flex flex-wrap gap-1">
              {dataSourceNames.map((ds: string) => (
                <span
                  key={ds}
                  className={`text-xs px-2 py-1 rounded cursor-pointer ${
                    selectedDS === ds ? 'bg-blue-600 text-white' : 'bg-blue-400 text-white hover:bg-blue-500'
                  }`}
                  onClick={() => setSelectedDS(ds)}
                >
                  {ds}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="col-span-9 flex flex-col gap-4">
        {/* Data Source Editor */}
        <div className="flex-1 min-h-0">
          {selectedDS ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-md font-medium">
                  Editing Data Source: <span className="text-blue-600">{selectedDS}</span>
                </h3>
                <div className="text-sm text-gray-500">
                  Available in JS as: <code className="bg-gray-100 px-1 rounded">{selectedDS}</code>
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDS}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2 h-full flex flex-col"
                >
                  <textarea
                    className="flex-1 p-3 border border-gray-500 rounded resize-none font-mono text-sm"
                    value={dataSource}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDataSource(e.target.value)}
                    placeholder={`Enter data for ${selectedDS}...
Examples:
- JSON array: [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]
- Simple array: [1, 2, 3, 4, 5]
- Object: {"total": 100, "active": 75}`}
                  />
                  <div className="text-xs text-gray-600 bg-gray-50 pb-7 rounded">
                    <strong>Tip:</strong> This data will be automatically available in your JavaScript compiler as a variable named "{selectedDS}".
                    You can use it directly in your code like: <code>console.log({selectedDS})</code>
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-300 rounded">
              <div className="text-center text-gray-500">
                <p className="mb-2">No data source selected</p>
                <p className="text-sm">Add a new data source or select an existing one to start editing</p>
              </div>
            </div>
          )}
        </div>

        {/* SQL Query Section */}
        <div className="h-80 border border-gray-300 rounded bg-white flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-300 bg-gray-50">
            <h3 className="text-md font-medium">SQL Query</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Ctrl+Enter to execute</span>
              <button
                onClick={executeQuery}
                disabled={isLoading || !sqlQuery.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '▶'
                )}
                {isLoading ? 'Executing...' : 'Execute Query'}
              </button>
            </div>
          </div>
          
          <div className="flex flex-1 min-h-0">
            {/* Query Input */}
            <div className="flex-1 flex flex-col p-3">
              <textarea
                className="flex-1 p-2 border border-gray-300 rounded font-mono text-sm resize-none"
                value={sqlQuery}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleQueryChange(e.target.value)}
                onKeyDown={handleQueryKeyPress}
                placeholder="Enter your SQL query here...
Example: SELECT * FROM users WHERE age > 18
Press Ctrl+Enter to execute"
              />
            </div>
            
            {/* Results */}
            <div className="flex-1 flex flex-col p-3 border-l border-gray-300">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Results:</h4>
                {queryResult && queryResult.success && (
                  <span className="text-xs text-gray-500">
                    {queryResult.rowCount} row(s)
                  </span>
                )}
              </div>
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 overflow-auto">
                {error && (
                  <div className="text-red-600 text-sm">
                    <strong>Error:</strong> {error}
                  </div>
                )}
                {queryResult && queryResult.success && (
                  <div>
                    {queryResult.message && (
                      <div className="text-blue-600 text-sm mb-2 italic">
                        {queryResult.message}
                      </div>
                    )}
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(queryResult.data, null, 2)}
                    </pre>
                  </div>
                )}
                {!queryResult && !error && !isLoading && (
                  <div className="text-gray-500 text-sm italic">
                    Query results will appear here...
                  </div>
                )}
                {isLoading && (
                  <div className="text-gray-500 text-sm italic">
                    Executing query...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}