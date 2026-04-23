import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Plane, CheckCircle, Clock, Navigation, Navigation2, Wind, Thermometer, Cloud, Eye } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

// Radar Map Settings (Centered on Kempegowda / BLR)
const HOST_IATA = 'BLR';
const MAP_CENTER_LAT = 13.1989;
const MAP_CENTER_LON = 77.7068;
const MAP_SPAN_LAT = 15; // Zoomed in more for airport orientation
const MAP_SPAN_LON = 15; 

export default function ATCDashboard() {
  const [flights, setFlights] = useState([]);
  const [runways, setRunways] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [commsInput, setCommsInput] = useState('');

  // Pan & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Weather state (Mock)
  const [weather, setWeather] = useState({
    wind: "240/12KT",
    temp: "28°C",
    visibility: "8000m",
    conditions: "PARTLY CLOUDY",
    altimeter: "1013 HPA"
  });

  const fetchData = async () => {
    try {
      const [fRes, rRes, cRes, lRes] = await Promise.all([
        fetch(`${API_URL}/flights`),
        fetch(`${API_URL}/runways`),
        fetch(`${API_URL}/conflicts`),
        fetch(`${API_URL}/logs`)
      ]);
      const fData = await fRes.json();
      const rData = await rRes.json();
      const cData = await cRes.json();
      const lData = await lRes.json();
      
      setFlights(fData.data || []);
      setRunways(rData.data || []);
      setConflicts(cData.data || []);
      setLogs(lData.data || []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); 
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (flightId, runwayId, action) => {
    try {
      const res = await fetch(`${API_URL}/flights/${flightId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runwayId, action })
      });
      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const sendLog = async () => {
    if (!selectedFlight || !commsInput) return;
    try {
      await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          flightId: selectedFlight, 
          controllerId: 'b75b8a53-33e1-4c12-9c98-1e4a6a5f5734',
          message: commsInput 
        })
      });
      setCommsInput('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getCoordinates = (lat, lon) => {
    const baseX = ((lon - (MAP_CENTER_LON - MAP_SPAN_LON/2)) / MAP_SPAN_LON) * 100;
    const baseY = 100 - (((lat - (MAP_CENTER_LAT - MAP_SPAN_LAT/2)) / MAP_SPAN_LAT) * 100);
    
    // Apply pan and zoom
    const x = (baseX - 50) * zoom + 50 + pan.x;
    const y = (baseY - 50) * zoom + 50 + pan.y;
    
    return { left: `${x}%`, top: `${y}%` };
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    const newZoom = zoom * (e.deltaY > 0 ? 0.9 : 1.1);
    setZoom(Math.max(0.5, Math.min(10, newZoom)));
  };

  const activeFlight = flights.find(f => f.flight_id === selectedFlight);
  const blrArrivals = flights.filter(f => f.dest_code === HOST_IATA && f.status !== 'LANDED');
  const blrDepartures = flights.filter(f => f.origin_code === HOST_IATA && f.status !== 'ENROUTE');
  
  // Find the airport ID for BLR reliably
  const blrAirportId = runways.find(r => r.designator.includes('09') || r.designator.includes('27'))?.airport_id;
  const hostRunways = runways.filter(r => r.airport_id === blrAirportId);

  return (
    <div className="min-h-screen bg-[#0a0f18] text-gray-200 p-4 font-sans select-none overflow-hidden flex flex-col h-screen">
      
      {/* Top Console Bar */}
      <header className="flex justify-between items-center bg-gradient-to-b from-[#1c2635] to-[#121922] p-4 rounded-xl shadow-2xl border border-gray-700 mb-4 shrink-0 z-10 relative">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
          <Plane className="text-cyan-400" />
          AdiVansh ATC <span className="text-xs text-gray-400 bg-[#0a0f18] px-2 py-1 rounded shadow-inner border border-gray-800 tracking-tighter">HOST: KEMPEGOWDA INT'L (BLR)</span>
        </h1>
        
        {/* Weather Zone */}
        <div className="flex gap-4 bg-black/40 px-4 py-2 rounded-lg border border-blue-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 border-r border-gray-800 pr-4">
            <Wind size={18} className="text-blue-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 font-bold uppercase">Wind</span>
              <span className="text-xs font-mono text-blue-200">{weather.wind}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 border-r border-gray-800 pr-4">
            <Cloud size={18} className="text-gray-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 font-bold uppercase">Cond</span>
              <span className="text-xs font-mono text-gray-200">{weather.conditions}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-green-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 font-bold uppercase">Vis</span>
              <span className="text-xs font-mono text-green-200">{weather.visibility}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 bg-[#0a0f18] px-6 py-2 rounded-lg border border-gray-800 shadow-inner">
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Active</span>
            <span className="text-xl font-mono text-cyan-400">{flights.length}</span>
          </div>
          <div className="w-px bg-gray-800"></div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Alerts</span>
            <span className={`text-xl font-mono ${conflicts.length > 0 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>{conflicts.length}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 relative">
        
        {/* Left Panel: Radar Map with Pan/Zoom */}
        <div 
          className="col-span-8 bg-[#050a10] rounded-xl border border-gray-700 shadow-2xl relative overflow-hidden flex flex-col cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            <span className="font-mono text-sm text-green-400 bg-black/80 px-2 py-1 rounded border border-green-900/50">LIVE RADAR FEED</span>
            <span className="font-mono text-[10px] text-gray-500 bg-black/80 px-2 py-1 rounded border border-gray-800 ml-2">ZOOM: {zoom.toFixed(1)}x</span>
          </div>

          <div className="relative flex-1">
            {/* Grid & Sweeper */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-[800px] h-[800px] border border-green-500/20 rounded-full"></div>
              <div className="absolute w-[600px] h-[600px] border border-green-500/10 rounded-full"></div>
              <div className="absolute w-[400px] h-[400px] border border-green-500/10 rounded-full"></div>
              <div className="absolute w-full h-px bg-green-500/10"></div>
              <div className="absolute h-full w-px bg-green-500/10"></div>
            </div>

            <div className="absolute inset-0 rounded-full origin-center animate-[spin_6s_linear_infinite] pointer-events-none" 
                   style={{ background: 'conic-gradient(from 0deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.02) 80%, rgba(16,185,129,0.2) 100%)' }}>
            </div>

            {/* Flights */}
            {flights.map(f => {
              const pos = getCoordinates(f.latitude, f.longitude);
              const isSelected = selectedFlight === f.flight_id;
              const isConflict = conflicts.some(c => c.flight1_id === f.flight_id || c.flight2_id === f.flight_id);
              const isHostFlight = f.dest_code === HOST_IATA || f.origin_code === HOST_IATA;
              
              return (
                <div 
                  key={f.flight_id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-30 transition-all duration-2000 ease-linear"
                  style={pos}
                >
                  <div 
                    className="relative cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setSelectedFlight(f.flight_id); }}
                  >
                    <div className={`w-3 h-3 rounded-sm ${
                      isConflict ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 
                      isSelected ? 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]' : 
                      isHostFlight ? 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-pulse' :
                      'bg-green-400 shadow-[0_0_8px_#4ade80]'
                    } transform rotate-45`}></div>
                    
                    <div className="absolute w-6 h-px bg-green-400/30 origin-left -rotate-90 bottom-1/2 left-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className={`absolute top-4 left-4 p-1 text-[9px] font-mono whitespace-nowrap rounded backdrop-blur-md border ${
                      isSelected ? 'bg-cyan-900/80 text-cyan-100 border-cyan-500' : 
                      isConflict ? 'bg-red-900/80 text-red-100 border-red-500' :
                      'bg-black/60 text-green-400 border-gray-800'
                    }`}>
                      <div className="font-bold">{f.flight_number}</div>
                      <div>{Math.floor(f.altitude_ft/100)} {f.airspeed_kts}KT</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panels */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* BLR Operations Panel */}
          <div className="bg-gradient-to-br from-[#1c2635] to-[#0d131c] rounded-xl border border-yellow-900/30 shadow-xl overflow-hidden shrink-0">
            <div className="bg-yellow-900/20 px-4 py-2 border-b border-yellow-900/30 flex justify-between items-center">
              <h2 className="text-[10px] uppercase tracking-widest font-bold text-yellow-500">BLR Operations Control</h2>
              <div className="flex gap-2">
                <span className="text-[9px] bg-black/40 px-2 py-0.5 rounded text-gray-400 border border-gray-800">ARR: {blrArrivals.length}</span>
                <span className="text-[9px] bg-black/40 px-2 py-0.5 rounded text-gray-400 border border-gray-800">DEP: {blrDepartures.length}</span>
              </div>
            </div>
            <div className="p-3 max-h-[150px] overflow-y-auto custom-scrollbar space-y-2">
              {blrArrivals.length === 0 && blrDepartures.length === 0 && (
                <p className="text-[10px] text-gray-600 italic text-center py-4 font-mono">NO ACTIVE HOST OPERATIONS</p>
              )}
              {blrArrivals.map(f => (
                <div key={f.flight_id} 
                     onClick={() => setSelectedFlight(f.flight_id)}
                     className={`flex justify-between items-center p-2 rounded border cursor-pointer transition-all ${selectedFlight === f.flight_id ? 'bg-yellow-900/30 border-yellow-500' : 'bg-black/20 border-gray-800 hover:border-gray-600'}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                    <span className="font-mono text-xs font-bold text-yellow-400">{f.flight_number}</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 italic">ARRIVAL</div>
                </div>
              ))}
              {blrDepartures.map(f => (
                <div key={f.flight_id} 
                     onClick={() => setSelectedFlight(f.flight_id)}
                     className={`flex justify-between items-center p-2 rounded border cursor-pointer transition-all ${selectedFlight === f.flight_id ? 'bg-blue-900/30 border-blue-500' : 'bg-black/20 border-gray-800 hover:border-gray-600'}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="font-mono text-xs font-bold text-blue-400">{f.flight_number}</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 italic">DEPARTURE</div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Info Panel */}
          <div className="bg-gradient-to-br from-[#1c2635] to-[#121922] p-5 rounded-xl border border-gray-700 shadow-xl relative">
            <h2 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-4 border-b border-gray-800 pb-2">Target Telemetry</h2>
            
            {activeFlight ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-4xl font-mono font-bold text-cyan-400 drop-shadow-sm">{activeFlight.flight_number}</h3>
                    <p className="text-gray-500 text-xs font-mono">{activeFlight.aircraft_type} | {activeFlight.airline_code}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-blue-900/40 border border-blue-700/50 text-blue-300 rounded font-bold text-xs shadow-inner uppercase">
                      {activeFlight.status}
                    </span>
                  </div>
                </div>

                {/* Route Information */}
                <div className="flex items-center justify-between p-3 bg-black/40 rounded border border-gray-800 shadow-inner">
                  <div className="flex-1">
                    <p className="text-[8px] text-gray-500 uppercase font-bold">Origin</p>
                    <p className="text-sm font-mono text-cyan-400">{activeFlight.origin_code || '---'}</p>
                    <p className="text-[9px] text-gray-500 truncate max-w-[100px]">{activeFlight.origin_name}</p>
                  </div>
                  <div className="flex-none px-4 text-gray-600">
                    <Navigation2 size={16} className="rotate-90"/>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[8px] text-gray-500 uppercase font-bold">Destination</p>
                    <p className="text-sm font-mono text-cyan-400">{activeFlight.dest_code || '---'}</p>
                    <p className="text-[9px] text-gray-500 truncate max-w-[100px]">{activeFlight.dest_name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/30 p-2 rounded border border-gray-800">
                    <p className="text-[8px] text-gray-500 uppercase">Altitude</p>
                    <p className="font-mono text-sm text-gray-200">{activeFlight.altitude_ft.toLocaleString()} FT</p>
                  </div>
                  <div className="bg-black/30 p-2 rounded border border-gray-800">
                    <p className="text-[8px] text-gray-500 uppercase">Airspeed</p>
                    <p className="font-mono text-sm text-gray-200">{activeFlight.airspeed_kts} KTS</p>
                  </div>
                </div>

                {/* Assignment Controls */}
                <div className="pt-2 bg-black/20 p-3 rounded-lg border border-gray-800 shadow-inner">
                  <h4 className="text-[10px] text-yellow-500 uppercase mb-3 flex items-center gap-2 font-bold">
                    <Navigation2 size={14}/> {activeFlight.dest_code === HOST_IATA || activeFlight.origin_code === HOST_IATA ? '🚨 BLR CLEARANCE CONTROL' : 'REGIONAL TRAFFIC CONTROL'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {(activeFlight.dest_code === HOST_IATA || activeFlight.origin_code === HOST_IATA ? hostRunways : runways).map(r => (
                      <div key={r.runway_id} className={`flex flex-col gap-1 p-2 rounded border transition-colors ${r.status === 'AVAILABLE' ? 'bg-gray-800/50 border-gray-700' : 'bg-red-900/20 border-red-900/50 opacity-60'}`}>
                        <div className="flex justify-between items-center px-1">
                          <span className="font-mono text-xs text-white font-bold">{r.designator}</span>
                          <span className={`text-[8px] px-1 rounded ${r.status === 'AVAILABLE' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                            {r.status}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          <button 
                            disabled={r.status !== 'AVAILABLE'}
                            onClick={() => handleAction(activeFlight.flight_id, r.runway_id, 'LANDING')}
                            className="flex-1 text-[9px] font-bold bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/30 py-1.5 rounded transition disabled:opacity-30"
                          >
                            LAND
                          </button>
                          <button 
                            disabled={r.status !== 'AVAILABLE'}
                            onClick={() => handleAction(activeFlight.flight_id, r.runway_id, 'TAKEOFF')}
                            className="flex-1 text-[9px] font-bold bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 py-1.5 rounded transition disabled:opacity-30"
                          >
                            T/O
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-gray-800 rounded bg-black/20 opacity-40">
                <p className="text-[10px] font-mono">STANDBY FOR SELECTION</p>
              </div>
            )}
          </div>

          {/* Comms & Alerts */}
          <div className="bg-[#0d131b] p-4 rounded-xl border border-gray-700 flex-1 flex flex-col min-h-[350px]">
            <h2 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">VHF Radio</h2>
            
            <div className="flex-1 overflow-y-auto mb-4 pr-1 custom-scrollbar space-y-2">
              {logs.map(l => (
                <div key={l.log_id} className={`p-2 rounded border-l-2 text-[11px] ${l.sender_type === 'FLIGHT' ? 'border-orange-500 bg-orange-500/5' : 'border-cyan-500 bg-cyan-500/5'}`}>
                  <div className="flex justify-between opacity-60 text-[9px] mb-1">
                    <span className="font-bold">{l.sender_type || 'ATC'}</span>
                    <span>{new Date(l.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="font-mono">{l.message}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={commsInput}
                onChange={(e) => setCommsInput(e.target.value)}
                placeholder="Radio signal..."
                className="flex-1 bg-black/40 border border-gray-700 rounded px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                disabled={!selectedFlight}
                onKeyDown={(e) => e.key === 'Enter' && sendLog()}
              />
              <button 
                onClick={sendLog}
                className="bg-blue-600 hover:bg-blue-500 px-4 rounded text-xs font-bold transition shadow-lg active:scale-95"
              >
                TX
              </button>
            </div>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
      `}} />
    </div>
  );
}
