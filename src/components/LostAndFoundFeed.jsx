import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { ref, onValue } from 'firebase/database';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MapPin, Tag, Image as ImageIcon, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { findPotentialMatches, runLocalMatchingFallback } from '../services/lostAndFoundAI';

export default function LostAndFoundFeed({ isAdmin = false }) {
  const { user } = useAppContext();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, LOST, FOUND
  const [matches, setMatches] = useState({});
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchError, setMatchError] = useState(null);
  const lastCheckedItemIdRef = useRef(null);

  useEffect(() => {
    const activeBuildingId = isAdmin ? localStorage.getItem('adminBuildingId') : user?.buildingId;
    if (!activeBuildingId) return;
    const itemsRef = ref(db, `lostAndFound/${activeBuildingId}`);
    
    const unsubscribe = onValue(itemsRef, (snapshot) => {
      if (snapshot.val()) {
        const rawItems = Object.values(snapshot.val());
        const sortedItems = rawItems
          .sort((a, b) => b.timestamp - a.timestamp);
        setItems(sortedItems);

        const openItems = sortedItems.filter(i => i.status === 'OPEN');
        if (openItems.length > 0) {
           detectMatches(openItems);
        }
      } else {
        setItems([]);
      }
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const detectMatches = async (openItems) => {
    // 1. Instantly calculate baseline matches for all items using local fallback
    const initialMatches = {};
    for (let i = 0; i < openItems.length; i++) {
      const item = openItems[i];
      const others = openItems.filter((_, idx) => idx !== i);
      const matchIds = runLocalMatchingFallback(item, others);
      if (matchIds && matchIds.length > 0) {
        initialMatches[item.itemId] = matchIds;
      }
    }
    setMatches(initialMatches);

    // 2. Refine with AI for the latest item
    const latestItem = openItems[0];
    if (latestItem && openItems.length > 1) {
      if (lastCheckedItemIdRef.current === latestItem.itemId) {
        return;
      }
      lastCheckedItemIdRef.current = latestItem.itemId;
      setMatchingLoading(true);
      setMatchError(null);
      try {
        const matchIds = await findPotentialMatches(latestItem, openItems.slice(1));
        if (matchIds && matchIds.length > 0) {
          setMatches(prev => {
            const updated = { ...prev, [latestItem.itemId]: matchIds };
            // Bidirectional mapping so both items show they are matched
            matchIds.forEach(id => {
              if (!updated[id]) {
                updated[id] = [];
              }
              if (!updated[id].includes(latestItem.itemId)) {
                updated[id].push(latestItem.itemId);
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.error("Match detection failed", err);
        setMatchError(err.message || err);
        lastCheckedItemIdRef.current = null; // Reset on failure to allow retry later
      } finally {
        setMatchingLoading(false);
      }
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'RESOLVED') {
      return item.status === 'RESOLVED';
    }
    
    if (item.status !== 'OPEN') return false;

    return filter === 'ALL' || item.type === filter;
  });

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-6">
        {['ALL', 'LOST', 'FOUND', ...(isAdmin ? ['RESOLVED'] : [])].map(f => (
          <button 
            key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === f ? (f === 'RESOLVED' ? 'bg-info text-white' : f === 'LOST' ? 'bg-alert-red text-white' : f === 'FOUND' ? 'bg-success text-white' : 'bg-primary-red text-white') : 'bg-dark-bg border border-card-border text-text-secondary hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>


      {matchingLoading && (
        <div className="mb-4 text-xs text-text-secondary animate-pulse flex items-center gap-1.5 bg-card-bg/40 p-2.5 rounded-lg border border-card-border max-w-sm">
          <RefreshCw size={12} className="animate-spin text-info" />
          <span>AI is analyzing items for potential matches...</span>
        </div>
      )}
      {matchError && (
        <div className="mb-4 text-xs text-alert-red bg-alert-red/10 border border-alert-red/20 p-2.5 rounded-lg flex items-center gap-1.5 max-w-md">
          <span>⚠️ AI Match Check Failed: {matchError}</span>
        </div>
      )}

      {filter === 'RESOLVED' ? (
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-bg text-text-secondary">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4">Type</th>
                <th className="p-4">Reported By</th>
                <th className="p-4">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {filteredItems.map(item => (
                <tr key={item.itemId} className="hover:bg-dark-bg/50">
                  <td className="p-4 font-bold">{item.title}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${item.type === 'LOST' ? 'bg-alert-red' : 'bg-success'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold">{item.reportedBy?.name || 'Anonymous'}</div>
                    <div className="text-text-secondary text-[10px]">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</div>
                  </td>
                  <td className="p-4 text-text-secondary italic">{item.resolutionNote ? `"${item.resolutionNote}"` : '--'}</td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-text-secondary">No resolved items yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredItems.map(item => (
              <motion.div 
                key={item.itemId}
                layout
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card-bg border border-card-border rounded-xl overflow-hidden flex flex-col"
              >
                {item.imageUrl ? (
                  <div className="h-48 w-full bg-black relative">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white shadow-lg ${item.type === 'LOST' ? 'bg-alert-red' : 'bg-success'}`}>
                      {item.type}
                    </div>
                  </div>
                ) : (
                  <div className={`h-24 w-full flex items-center justify-center relative ${item.type === 'LOST' ? 'bg-alert-red/10' : 'bg-success/10'}`}>
                    <ImageIcon size={32} className={item.type === 'LOST' ? 'text-alert-red/50' : 'text-success/50'} />
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white shadow-lg ${item.type === 'LOST' ? 'bg-alert-red' : 'bg-success'}`}>
                      {item.type}
                    </div>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-text-secondary mb-3 line-clamp-2">{item.description}</p>
                  
                  <div className="flex flex-col gap-2 text-xs text-text-secondary mb-4">
                    <div className="flex items-center gap-1 font-bold"><MapPin size={14} className="text-primary-red"/> {item.location}</div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex items-center gap-1"><Tag size={14} className="text-info"/> {item.tags.join(', ')}</div>
                    )}
                  </div>

                  {matches[item.itemId] && matches[item.itemId].length > 0 && (isAdmin || (user?.userId && user?.userId !== 'unknown' && (item.reportedBy?.userId === user?.userId || matches[item.itemId].some(matchId => {
                    const matchedItem = items.find(i => i.itemId === matchId);
                    return matchedItem?.reportedBy?.userId === user?.userId;
                  })))) && (
                    <div className="mb-4 bg-warning/20 border border-warning/50 text-warning p-3 rounded-lg text-xs flex flex-col gap-2 font-bold">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="animate-pulse" />
                        <span>AI Detected Potential Match!</span>
                      </div>
                      <div className="space-y-1.5 font-normal pl-1">
                        {matches[item.itemId].map(matchId => {
                          const matchedItem = items.find(i => i.itemId === matchId);
                          if (!matchedItem) return null;
                          return (
                            <div key={matchId} className="flex flex-col gap-0.5 bg-black/40 p-2 rounded border border-warning/30 text-[11px]">
                              <div className="flex justify-between items-center">
                                <span className={`px-1 rounded text-[9px] font-black text-white ${matchedItem.type === 'LOST' ? 'bg-alert-red' : 'bg-success'}`}>
                                  {matchedItem.type}
                                </span>
                                <span className="text-[10px] text-text-secondary">Location: {matchedItem.location}</span>
                              </div>
                              <span className="font-bold text-white mt-1">{matchedItem.title}</span>
                              {matchedItem.description && (
                                <span className="text-text-secondary line-clamp-1 italic">&quot;{matchedItem.description}&quot;</span>
                              )}
                              {matchedItem.reportedBy && (
                                <div className="mt-2 pt-2 border-t border-warning/10 flex items-center justify-between">
                                  <div>
                                    <span className="text-[9px] text-text-secondary uppercase block">Contact {matchedItem.type === 'LOST' ? 'Owner' : 'Finder'}</span>
                                    <span className="font-semibold text-white">{matchedItem.reportedBy.name}</span>
                                  </div>
                                  {matchedItem.reportedBy.mobile && (
                                    <a 
                                      href={`tel:${matchedItem.reportedBy.mobile}`}
                                      className="bg-info hover:bg-blue-600 text-white p-1 rounded-full transition flex items-center justify-center"
                                      title={`Call ${matchedItem.reportedBy.name}`}
                                    >
                                      <Phone size={10} fill="currentColor" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {item.resolutionNote && (
                    <div className="mt-2 text-xs bg-dark-bg/50 p-2 rounded border border-card-border mb-3">
                      <span className="text-text-secondary uppercase text-[10px] font-bold block">Resolution Note:</span>
                      <span className="text-white italic">&quot;{item.resolutionNote}&quot;</span>
                    </div>
                  )}
                  
                  <div className="mt-auto pt-4 border-t border-card-border flex items-center justify-between">
                    <div className="text-xs">
                      <span className="block text-text-secondary uppercase">Reported By</span>
                      <span className="font-bold text-white">{item.reportedBy?.name || 'Anonymous'}</span>
                      <span className="block text-text-secondary text-[10px] mt-0.5">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <button 
                          onClick={() => {
                            import('firebase/database').then(({ ref, update }) => {
                              const activeBuildingId = localStorage.getItem('adminBuildingId');
                              update(ref(db, `lostAndFound/${activeBuildingId}/${item.itemId}`), { 
                                status: 'RESOLVED'
                              });
                              import('react-hot-toast').then(m => m.default.success('Marked as Resolved'));
                            });
                          }}
                          className="bg-success hover:bg-green-600 text-white p-2 rounded-full transition shadow-[0_0_10px_rgba(0,200,83,0.4)]"
                          title="Mark Resolved"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}

                      {!isAdmin && user?.userId && user?.userId !== 'unknown' && item.reportedBy?.userId === user?.userId && (
                        <button 
                          onClick={() => {
                            import('firebase/database').then(({ ref, update }) => {
                              const activeBuildingId = user?.buildingId;
                              if(!activeBuildingId) return;
                              update(ref(db, `lostAndFound/${activeBuildingId}/${item.itemId}`), { 
                                status: 'RESOLVED',
                                resolvedBy: 'Owner'
                              });
                              import('react-hot-toast').then(m => m.default.success("Report removed from the feed."));
                            });
                          }}
                          className="bg-alert-red hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-[0_0_10px_rgba(255,23,68,0.4)] flex items-center"
                        >
                          Delete
                        </button>
                      )}
                      <a 
                        href={`tel:${item.reportedBy?.mobile}`} 
                        className="bg-info hover:bg-blue-600 text-white p-2 rounded-full transition shadow-[0_0_10px_rgba(0,176,255,0.4)]"
                        title="Call Reporter"
                      >
                        <Phone size={18} fill="currentColor"/>
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredItems.length === 0 && (
              <div className="col-span-full py-12 text-center text-text-secondary">
                <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>No open {filter === 'ALL' ? '' : filter} items right now.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
