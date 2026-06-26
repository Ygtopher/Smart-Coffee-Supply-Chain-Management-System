import { useEffect, useState } from 'react';
import apiService from '../services/api';
import {
  Coffee, Package, CheckCircle2, Warehouse, AlertTriangle, Clock,
  FileCheck, TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';

export function EnhancedInventory() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ binCode: '', expiryDate: '', reorderLevelKg: '' });
  const [reconcileItem, setReconcileItem] = useState<any | null>(null);
  const [physicalQuantityKg, setPhysicalQuantityKg] = useState('');
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [reconciliationData, setReconciliationData] = useState({
    cherry: { system: 650, physical: 0, variance: 0 },
    parchment: { system: 1330, physical: 0, variance: 0 },
    green: { system: 2680, physical: 0, variance: 0 },
  });

  const loadInventory = () => {
    setLoading(true);
    apiService.getProcessorInventory()
      .then(res => setInventoryItems(res.data || []))
      .catch(() => toast.error('Failed to load live inventory'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const openEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({
      binCode: item.binCode === 'Unassigned' ? '' : item.binCode || '',
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : '',
      reorderLevelKg: item.reorderLevelKg ?? '',
    });
  };

  const saveInventoryItem = async () => {
    if (!editingItem) return;
    try {
      await apiService.updateInventoryItem(editingItem.id, editForm);
      toast.success('Inventory item updated');
      setEditingItem(null);
      loadInventory();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update inventory item');
    }
  };

  const openReconcile = (item: any) => {
    setReconcileItem(item);
    setPhysicalQuantityKg(String(item.weight ?? 0));
    setReconcileNotes('');
  };

  const saveReconciliation = async () => {
    if (!reconcileItem) return;
    try {
      await apiService.reconcileInventoryItem(reconcileItem.id, {
        physicalQuantityKg: Number(physicalQuantityKg),
        notes: reconcileNotes,
      });
      toast.success('Inventory reconciliation saved');
      setReconcileItem(null);
      loadInventory();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reconcile inventory item');
    }
  };

  const handlePhysicalCount = (type: keyof typeof reconciliationData, count: number) => {
    setReconciliationData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        physical: count,
        variance: prev[type].system - count
      }
    }));
  };

  // Calculate shelf life warnings
  const urgentItems = inventoryItems.filter(i => i.status === 'urgent' || i.alertStatus === 'LOW_STOCK');
  const agingItems = inventoryItems.filter(i => i.status === 'aging' || i.alertStatus === 'EXPIRING_SOON');
  const freshItems = inventoryItems.filter(i => i.status === 'fresh' || i.alertStatus === 'OK');

  const totalWeight = {
    cherry: inventoryItems.filter(i => i.coffeeType === 'cherry').reduce((s, i) => s + i.weight, 0),
    parchment: inventoryItems.filter(i => i.coffeeType === 'parchment').reduce((s, i) => s + i.weight, 0),
    green: inventoryItems.filter(i => i.coffeeType === 'green').reduce((s, i) => s + i.weight, 0),
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Inventory Management</h2>
          <p className="text-sm text-stone-500 mt-0.5">Track stock levels, expiry dates, and shelf-life monitoring</p>
        </div>
        <button
          onClick={() => {
            setShowReconciliation(!showReconciliation);
            toast.success(showReconciliation ? 'Closed reconciliation' : 'Opened stock reconciliation');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <FileCheck className="w-4 h-4" /> Stock Reconciliation
        </button>
      </div>

      {/* Expiry Alerts */}
      {(urgentItems.length > 0 || agingItems.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {urgentItems.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">Urgent: Process Immediately</p>
                  <p className="text-xs text-red-600">{urgentItems.length} item(s) require immediate attention</p>
                </div>
              </div>
              {urgentItems.map(item => (
                <div key={item.id} className="bg-white rounded-lg p-3 mb-2 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-stone-800 text-sm">{item.batchId} - {item.coffeeType}</p>
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">URGENT</span>
                  </div>
                  <p className="text-xs text-stone-600">{item.weight} kg • {item.location} • Received {item.ageInDays} days ago</p>
                  <p className="text-xs text-red-600 mt-1">⏰ Process within {Math.max(0, item.shelfLifeDays - item.ageInDays)} {item.coffeeType === 'cherry' ? 'hours' : 'days'}</p>
                </div>
              ))}
            </div>
          )}
          
          {agingItems.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">Aging Inventory</p>
                  <p className="text-xs text-amber-600">{agingItems.length} item(s) approaching shelf-life limit</p>
                </div>
              </div>
              {agingItems.map(item => (
                <div key={item.id} className="bg-white rounded-lg p-3 mb-2 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-stone-800 text-sm">{item.batchId} - {item.coffeeType}</p>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">AGING</span>
                  </div>
                  <p className="text-xs text-stone-600">{item.weight} kg • {item.location} • Age: {item.ageInDays}/{item.shelfLifeDays} days</p>
                  <div className="mt-2 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${(item.ageInDays / item.shelfLifeDays) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stock Reconciliation */}
      {showReconciliation && (
        <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Physical Stock Count</h3>
          <div className="bg-white rounded-lg overflow-hidden border border-stone-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase">Coffee Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase">System Stock (kg)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase">Physical Count (kg)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {(['cherry', 'parchment', 'green'] as const).map(type => (
                  <tr key={type} className="hover:bg-stone-50">
                    <td className="px-4 py-3 capitalize font-medium text-stone-800">{type}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{reconciliationData[type].system.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        placeholder="Enter count"
                        className="w-32 px-3 py-1.5 border border-stone-200 rounded text-right focus:outline-none focus:ring-2 focus:ring-violet-500"
                        onChange={(e) => handlePhysicalCount(type, Number(e.target.value))}
                      />
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      Math.abs(reconciliationData[type].variance) > 50 ? 'text-red-600' :
                      reconciliationData[type].variance !== 0 ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {reconciliationData[type].physical > 0 ? (
                        <>
                          {reconciliationData[type].variance > 0 ? '+' : ''}
                          {reconciliationData[type].variance}
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-4">
            <button 
              onClick={() => toast.info('Use the Reconcile button on a stock row to save a database reconciliation for a specific lot.')}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              Select Stock Row
            </button>
            <button 
              onClick={() => toast.info('Adjustment notes form opened')}
              className="px-4 py-2 border border-violet-300 text-violet-700 rounded-lg hover:bg-violet-50 transition-colors"
            >
              Add Adjustment Notes
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { type: 'Cherry', weight: totalWeight.cherry, color: 'bg-red-100 text-red-700 border-red-200', icon: Coffee },
          { type: 'Parchment', weight: totalWeight.parchment, color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Package },
          { type: 'Green Coffee', weight: totalWeight.green, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
          { type: 'Fresh Items', weight: freshItems.length, color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Warehouse, isCount: true },
        ].map(s => (
          <div key={s.type} className={`rounded-xl border-2 ${s.color} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider">{s.type}</p>
              <s.icon className="w-4 h-4 opacity-60" />
            </div>
            <p className="text-2xl font-bold">{s.weight.toLocaleString()} {s.isCount ? '' : 'kg'}</p>
          </div>
        ))}
      </div>

      {/* Detailed Inventory Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Stock Details & Shelf-Life Monitoring</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                {['Batch ID', 'Type', 'Bin', 'Expiry', 'Reorder', 'Grade', 'Weight (kg)', 'Age', 'Shelf Life', 'Status', 'Location', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
            {inventoryItems.map(item => (
                <tr key={item.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-emerald-700">{item.batchId}</td>
                  <td className="px-4 py-3 text-stone-800 capitalize">{item.coffeeType}</td>
                  <td className="px-4 py-3 text-stone-600">{item.binCode || '-'}</td>
                  <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-stone-600">{item.reorderLevelKg ?? '-'}</td>
                  <td className="px-4 py-3 text-stone-600">{item.grade || '—'}</td>
                  <td className="px-4 py-3 font-medium text-stone-800">{item.weight}</td>
                  <td className="px-4 py-3 text-stone-600">{item.ageInDays} days</td>
                  <td className="px-4 py-3 text-stone-600">{item.shelfLifeDays} days</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      item.status === 'urgent' ? 'bg-red-100 text-red-700' :
                      item.status === 'aging' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{item.location}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50">Edit</button>
                      <button onClick={() => openReconcile(item)} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700">Reconcile</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && inventoryItems.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-stone-400">No live inventory items yet. Complete processor output to create stock.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-stone-400">Loading inventory...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-800">Edit Inventory Lot</h3>
              <button onClick={() => setEditingItem(null)} className="text-sm text-stone-500">Close</button>
            </div>
            <input value={editForm.binCode} onChange={e => setEditForm(f => ({ ...f, binCode: e.target.value }))} placeholder="Bin code" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm" />
            <input type="date" value={editForm.expiryDate} onChange={e => setEditForm(f => ({ ...f, expiryDate: e.target.value }))} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm" />
            <input type="number" value={editForm.reorderLevelKg} onChange={e => setEditForm(f => ({ ...f, reorderLevelKg: e.target.value }))} placeholder="Reorder level kg" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm" />
            <button onClick={saveInventoryItem} className="w-full px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold">Save Inventory Details</button>
          </div>
        </div>
      )}

      {reconcileItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-800">Reconcile Stock</h3>
              <button onClick={() => setReconcileItem(null)} className="text-sm text-stone-500">Close</button>
            </div>
            <p className="text-sm text-stone-600">{reconcileItem.batchId} currently has <strong>{reconcileItem.weight} kg</strong> in the system.</p>
            <input type="number" value={physicalQuantityKg} onChange={e => setPhysicalQuantityKg(e.target.value)} placeholder="Physical quantity kg" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm" />
            <textarea value={reconcileNotes} onChange={e => setReconcileNotes(e.target.value)} placeholder="Adjustment notes" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm min-h-[90px]" />
            <button onClick={saveReconciliation} className="w-full px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-semibold">Save Reconciliation</button>
          </div>
        </div>
      )}
    </div>
  );
}
