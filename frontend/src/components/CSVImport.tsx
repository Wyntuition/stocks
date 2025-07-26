import React, { useState, useEffect } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { parseCSV, CSVImportResult } from '../utils/csvUtils';
import { portfolioApi, listApi } from '../services/api';

interface CSVImportProps {
  onImportSuccess?: () => void;
  onCancel?: () => void;
}

export const CSVImport: React.FC<CSVImportProps> = ({ onImportSuccess, onCancel }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [csvText, setCsvText] = useState<string | null>(null);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const data = await listApi.getAllLists();
      setLists(data);
      // Set default list as selected if available
      const defaultList = data.find((w: any) => w.isDefault);
      if (defaultList) {
        setSelectedListId(defaultList.id);
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    }
  };

  const handleCreateNewList = async () => {
    if (!newListName.trim()) return;
    
    setCreatingList(true);
    try {
      const newList = await listApi.createList({
        name: newListName.trim()
      });
      setLists(prev => [...prev, newList]);
      setSelectedListId(newList.id);
      setNewListName('');
      setShowNewList(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    } finally {
      setCreatingList(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const handleFileSelection = (files: File[]) => {
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    if (csvFile) {
      setFile(csvFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvText(text);
      };
      reader.readAsText(csvFile);
    } else {
      alert('Please select a CSV file');
    }
  };

  const handleImport = async () => {
    if (!csvText) return;
    setImporting(true);
    try {
      const result = await portfolioApi.importCsv(csvText, selectedListId || undefined);
      setImportResult({
        successful: result.successful.length,
        failed: result.failed.length,
        errors: result.errors || []
      });
      if (result.successful.length > 0 && onImportSuccess) {
        onImportSuccess();
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      setImportResult({
        successful: 0,
        failed: 0,
        errors: ['Import failed: ' + error.message]
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Import Stocks from CSV</h2>
        {onCancel && (
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!file && (
        <div className="mb-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop your CSV file here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse files
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileSelection(Array.from(e.target.files || []))}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Select CSV File
            </label>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">CSV Format:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Required columns: Symbol, Quantity, Purchase Price, Purchase Date</li>
              <li>Quantity can be 0 for list-only items (stocks to watch)</li>
              <li>Date format: YYYY-MM-DD</li>
              <li>Supports both individual stocks and list items</li>
            </ul>
          </div>
        </div>
      )}

      {file && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="font-medium">{file.name}</span>
            <button
              onClick={() => {
                setFile(null);
                setCsvText(null);
                setImportResult(null);
              }}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* List Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Import to List
            </label>
            <div className="space-y-2">
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Main Portfolio</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} {list.isDefault ? '(Default)' : ''} ({list._count?.portfolios || 0} items)
                  </option>
                ))}
              </select>

              {!showNewList ? (
                <button
                  type="button"
                  onClick={() => setShowNewList(true)}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create New List</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewList}
                    disabled={!newListName.trim() || creatingList}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {creatingList ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewList(false);
                      setNewListName('');
                    }}
                    className="px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {importResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="text-sm text-blue-800">
                <p className="font-medium">Import Complete</p>
                <p>✅ {importResult.successful} imported successfully</p>
                {importResult.failed > 0 && (
                  <>
                    <p>❌ {importResult.failed} failed</p>
                    <ul className="mt-2 list-disc list-inside">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            {!importResult && csvText && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-md"
              >
                {importing ? 'Importing...' : `Import CSV`}
              </button>
            )}
            <button
              onClick={() => {
                setFile(null);
                setCsvText(null);
                setImportResult(null);
              }}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
