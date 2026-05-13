import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../firebase/config';
import { ref as dbRef, set, push, serverTimestamp } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppContext } from '../context/AppContext';
import { categorizeItem } from '../services/lostAndFoundAI';
import toast from 'react-hot-toast';
import { X, Image as ImageIcon, Upload } from 'lucide-react';

export default function ReportItemModal({ isOpen, onClose }) {
  const { user } = useAppContext();
  const [type, setType] = useState('LOST'); // 'LOST' or 'FOUND'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !location) {
      toast.error("Please provide at least a title and location.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;

      // 1. Upload Image (Optional)
      if (image) {
        toast("Uploading image...", { icon: '⏳' });
        const imgRef = storageRef(storage, `lostAndFound/${Date.now()}_${image.name}`);
        await uploadBytes(imgRef, image);
        imageUrl = await getDownloadURL(imgRef);
      }

      // 2. AI Categorization
      toast("Analyzing details...", { icon: '🤖' });
      const tags = await categorizeItem(title, description);

      // 3. Save to DB
      const buildingId = user.buildingId;
      const newRef = push(dbRef(db, `lostAndFound/${buildingId}`));
      const itemId = newRef.key;

      const itemData = {
        itemId,
        type,
        title: title || '',
        description: description || '',
        location: location || '',
        reportedBy: {
          userId: user.userId || user.uid || 'unknown',
          name: user.name || 'Anonymous',
          mobile: user.mobile || 'Not provided',
          role: user.role || 'guest'
        },
        status: 'OPEN',
        tags,
        imageUrl,
        timestamp: serverTimestamp(),
      };

      await set(newRef, itemData);
      
      toast.success(`Successfully reported as ${type}!`);
      onClose();
    } catch (error) {
      console.error("Report Error:", error);
      toast.error("Failed to report item. Please try again.");
    } finally {
      setLoading(false);
      setTitle('');
      setDescription('');
      setLocation('');
      setImage(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="bg-card-bg border border-card-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-white z-10">
            <X size={24} />
          </button>
          
          <div className="bg-dark-bg p-6 border-b border-card-border">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Report an Item
            </h2>
          </div>

          <div className="p-6">
            <div className="flex gap-2 mb-6 p-1 bg-dark-bg rounded-lg border border-card-border">
              <button 
                onClick={() => setType('LOST')}
                className={`flex-1 py-2 rounded font-bold text-sm transition ${type === 'LOST' ? 'bg-alert-red text-white' : 'text-text-secondary hover:text-white'}`}
              >
                I Lost Something
              </button>
              <button 
                onClick={() => setType('FOUND')}
                className={`flex-1 py-2 rounded font-bold text-sm transition ${type === 'FOUND' ? 'bg-success text-white' : 'text-text-secondary hover:text-white'}`}
              >
                I Found Something
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-text-secondary uppercase font-bold mb-1 block">Title (What is it?)</label>
                <input 
                  type="text" placeholder="e.g., Black Leather Wallet" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:border-info outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-text-secondary uppercase font-bold mb-1 block">Location</label>
                <input 
                  type="text" placeholder={type === 'LOST' ? "e.g., Near the main lobby cafe" : "e.g., Bench outside 2nd floor elevator"} 
                  value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:border-info outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-text-secondary uppercase font-bold mb-1 block">Description (Optional)</label>
                <textarea 
                  placeholder="Any identifying marks or details?" value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:border-info outline-none h-20 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-text-secondary uppercase font-bold mb-1 block">Photo (Optional)</label>
                <div className="relative border-2 border-dashed border-card-border rounded-lg p-4 text-center hover:border-info transition">
                  <input 
                    type="file" accept="image/*" onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {image ? (
                    <span className="text-info font-bold flex items-center justify-center gap-2"><ImageIcon size={18}/> {image.name}</span>
                  ) : (
                    <span className="text-text-secondary flex items-center justify-center gap-2"><Upload size={18}/> Tap to upload image</span>
                  )}
                </div>
              </div>

              <button 
                type="submit" disabled={loading}
                className={`w-full font-bold py-4 rounded-xl text-lg mt-2 transition text-white ${type === 'LOST' ? 'bg-alert-red hover:bg-red-700' : 'bg-success hover:bg-green-700'}`}
              >
                {loading ? 'SUBMITTING...' : `REPORT AS ${type}`}
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
