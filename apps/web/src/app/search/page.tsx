'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, Train, MapPin, Clock, Hash } from 'lucide-react';

interface Station {
  _id: string;
  code: string;
  name: string;
  city: string;
  arrivalTime?: string;
  departureTime?: string;
  day: number;
  distance?: number;
}

interface TrainResult {
  _id: string;
  number: string;
  name: string;
  from: { code: string; name: string; city: string };
  to: { code: string; name: string; city: string };
  schedule: { station: Station; arrivalTime?: string; departureTime?: string; day: number }[];
  runningDays: number[];
}

interface PNRResult {
  pnr: string;
  trainNumber: string;
  trainName: string;
  journeyDate: string;
  from: string;
  to: string;
  passengerName: string;
  seatClass: string;
  schedule: { station: Station }[];
  trainId: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SearchPage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<'train' | 'pnr'>('train');
  const [query, setQuery] = useState('');
  const [pnr, setPnr] = useState('');
  const [loading, setLoading] = useState(false);
  const [trainResults, setTrainResults] = useState<TrainResult[]>([]);
  const [pnrResult, setPnrResult] = useState<PNRResult | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<TrainResult | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>('');

  const handleTrainSearch = async () => {
    if (query.trim().length < 2) { toast.error('Enter at least 2 characters'); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/trains/search?q=${encodeURIComponent(query)}`);
      setTrainResults(data.data.trains);
      if (!data.data.trains.length) toast('No trains found', { icon: '🔍' });
    } catch {
      toast.error('Search failed. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handlePNRSearch = async () => {
    if (!/^\d{10}$/.test(pnr)) { toast.error('Enter valid 10-digit PNR'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/trains/pnr', { pnr });
      setPnrResult(data.data);
      toast.success('PNR found!');
    } catch {
      toast.error('PNR lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStation = (stationId: string) => {
    setSelectedStation(stationId);
  };

  const handleOrderFromTrain = (train: TrainResult) => {
    if (!selectedStation) { toast.error('Please select your delivery station'); return; }
    router.push(`/restaurants?station=${selectedStation}&trainId=${train._id}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Find Your Train</h1>
      <p className="text-gray-500 mb-8">Search by train number, name, or PNR to start ordering</p>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setSearchMode('train')}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${searchMode === 'train' ? 'bg-white dark:bg-gray-700 shadow text-primary-600' : 'text-gray-500'}`}
        >
          <Train className="inline w-4 h-4 mr-1" /> Train Search
        </button>
        <button
          onClick={() => setSearchMode('pnr')}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${searchMode === 'pnr' ? 'bg-white dark:bg-gray-700 shadow text-primary-600' : 'text-gray-500'}`}
        >
          <Hash className="inline w-4 h-4 mr-1" /> PNR Lookup
        </button>
      </div>

      {/* Search inputs */}
      {searchMode === 'train' ? (
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="Enter train number or name (e.g., 12301 or Rajdhani)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTrainSearch()}
          />
          <button onClick={handleTrainSearch} disabled={loading} className="btn-primary flex items-center gap-2">
            <Search className="w-4 h-4" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      ) : (
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="Enter 10-digit PNR number"
            value={pnr}
            onChange={(e) => setPnr(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onKeyDown={(e) => e.key === 'Enter' && handlePNRSearch()}
            maxLength={10}
          />
          <button onClick={handlePNRSearch} disabled={loading} className="btn-primary flex items-center gap-2">
            <Search className="w-4 h-4" />
            {loading ? 'Looking up...' : 'Lookup'}
          </button>
        </div>
      )}

      {/* PNR Result */}
      {pnrResult && (
        <div className="card p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{pnrResult.trainName}</h2>
              <p className="text-gray-500">Train #{pnrResult.trainNumber} • PNR: {pnrResult.pnr}</p>
            </div>
            <span className="badge bg-green-100 text-green-700">✓ Confirmed</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div><span className="text-gray-500">Passenger:</span> <span className="font-medium">{pnrResult.passengerName}</span></div>
            <div><span className="text-gray-500">Class:</span> <span className="font-medium">{pnrResult.seatClass}</span></div>
            <div><span className="text-gray-500">From:</span> <span className="font-medium">{pnrResult.from}</span></div>
            <div><span className="text-gray-500">To:</span> <span className="font-medium">{pnrResult.to}</span></div>
            <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(pnrResult.journeyDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
          </div>

          <h3 className="font-semibold mb-3">Select delivery station:</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pnrResult.schedule.map((stop, i) => (
              <label key={i} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:border-primary-500 transition-colors">
                <input type="radio" name="station" value={stop.station._id} onChange={() => handleSelectStation(stop.station._id)} />
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{stop.station.name}</span>
                <span className="text-gray-500 text-sm">{stop.station.code}</span>
                {stop.station.arrivalTime && <span className="ml-auto text-sm text-gray-500"><Clock className="inline w-3 h-3 mr-1" />{stop.station.arrivalTime}</span>}
              </label>
            ))}
          </div>

          <button
            onClick={() => router.push(`/restaurants?station=${selectedStation}&trainId=${pnrResult.trainId}&pnr=${pnrResult.pnr}`)}
            disabled={!selectedStation}
            className="btn-primary w-full mt-4"
          >
            Browse Restaurants at Selected Station
          </button>
        </div>
      )}

      {/* Train Search Results */}
      {trainResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{trainResults.length} trains found</h2>
          {trainResults.map((train) => (
            <div
              key={train._id}
              className={`card p-6 cursor-pointer border-2 transition-all ${selectedTrain?._id === train._id ? 'border-primary-500' : 'border-transparent'}`}
              onClick={() => setSelectedTrain(train._id === selectedTrain?._id ? null : train)}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg">{train.name}</h3>
                  <p className="text-gray-500 text-sm">#{train.number}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div className="flex gap-1">
                    {DAY_NAMES.map((d, i) => (
                      <span key={d} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${train.runningDays.includes(i) ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                        {d[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{train.from?.code}</span>
                <span className="flex-1 border-t border-dashed border-gray-300" />
                <Train className="w-4 h-4 text-primary-500" />
                <span className="flex-1 border-t border-dashed border-gray-300" />
                <span className="font-medium">{train.to?.code}</span>
              </div>

              {selectedTrain?._id === train._id && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium mb-2">Select your delivery station:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {train.schedule.map((stop, i) => (
                      <label key={i} className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:border-primary-400 transition-colors">
                        <input type="radio" name={`station-${train._id}`} value={stop.station._id} onChange={() => handleSelectStation(stop.station._id)} />
                        <span className="font-medium">{stop.station.name}</span>
                        <span className="text-gray-500 text-xs">{stop.station.code}</span>
                        {stop.arrivalTime && <span className="ml-auto text-xs text-gray-500">{stop.arrivalTime}</span>}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => handleOrderFromTrain(train)}
                    disabled={!selectedStation}
                    className="btn-primary w-full mt-3"
                  >
                    Browse Restaurants →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {trainResults.length === 0 && !pnrResult && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Train className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Search for your train to get started</p>
          <p className="text-sm mt-2">{'Try "Rajdhani" or "12301"'}</p>
        </div>
      )}
    </div>
  );
}
