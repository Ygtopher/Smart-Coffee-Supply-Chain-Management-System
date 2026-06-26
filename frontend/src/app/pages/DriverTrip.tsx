import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { CheckCircle2, Loader2, LocateFixed, MapPin, Package, ShieldCheck, Truck } from 'lucide-react';
import { toast } from 'sonner';
import apiService from '../services/api';
import LanguageToggle from '../components/LanguageToggle';

const eventLocations: Record<string, string> = {
  'Dispatch from Kigali': 'Kigali Dispatch',
  'Border Exit': 'Rwanda Border Exit',
  'Border Entry': 'Regional Border Entry',
  'Transit Checkpoint': 'Transit Corridor Checkpoint',
  'Port Arrival': 'Mombasa Port Arrival',
  'Vessel Loading': 'Mombasa Terminal Loading',
};

const eventTypes = Object.keys(eventLocations);

export default function DriverTrip() {
  const mombasaPort = 'Port of Mombasa, Mombasa, Kenya';
  const { accessToken = '' } = useParams();
  const [trip, setTrip] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [form, setForm] = useState({
    driverName: '',
    driverPhone: '',
    eventType: 'Dispatch from Kigali',
    checkpointName: eventLocations['Dispatch from Kigali'],
    sealCondition: 'Intact',
    notes: '',
  });

  const loadTrip = async () => {
    setLoading(true);
    try {
      const response = await apiService.getDriverTrip(accessToken);
      setTrip(response.data);
      setForm(current => ({
        ...current,
        driverName: response.data?.driverName || current.driverName,
        driverPhone: response.data?.driverPhone || current.driverPhone,
      }));
    } catch {
      setTrip(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTrip(); }, [accessToken]);

  const captureLocation = () => {
    if (!consent) {
      toast.error('Confirm location consent before capturing your checkpoint.');
      return;
    }
    if (!navigator.geolocation) {
      toast.error('This phone browser does not support location capture.');
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setCapturing(false);
        toast.success('Phone location captured for this checkpoint.');
      },
      error => {
        setCapturing(false);
        toast.error(`Location capture failed: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!location) {
      toast.error('Capture phone location before submitting this checkpoint.');
      return;
    }
    if (!form.driverName.trim()) {
      toast.error('Enter the assigned driver name before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await apiService.submitDriverTripCheckpoint(accessToken, {
        ...form,
        latitude: location.latitude,
        longitude: location.longitude,
        locationAccuracyM: location.accuracy,
      });
      toast.success('Checkpoint submitted to Logistics.');
      setLocation(null);
      setForm(current => ({ ...current, notes: '' }));
      await loadTrip();
    } catch (error: any) {
      toast.error(error.message || 'Checkpoint submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const latestGpsCheckpoint = useMemo(
    () => [...(trip?.checkpoints || [])].reverse().find((checkpoint: any) =>
      checkpoint.submissionSource === 'DRIVER_PHONE' && checkpoint.latitude && checkpoint.longitude
    ),
    [trip?.checkpoints],
  );
  const displayedPoint = location || (latestGpsCheckpoint ? {
    latitude: Number(latestGpsCheckpoint.latitude),
    longitude: Number(latestGpsCheckpoint.longitude),
    accuracy: Number(latestGpsCheckpoint.locationAccuracyM || 0),
  } : null);
  const routeStart = displayedPoint ? `${displayedPoint.latitude},${displayedPoint.longitude}` : '';
  const mapUrl = displayedPoint
    ? `https://maps.google.com/maps?saddr=${encodeURIComponent(routeStart)}&daddr=${encodeURIComponent(mombasaPort)}&output=embed`
    : '';

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  if (!trip) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-5">
      <div className="max-w-md bg-white border border-stone-200 rounded-xl p-6 text-center">
        <Truck className="w-9 h-9 text-stone-400 mx-auto mb-3" />
        <h1 className="font-bold text-stone-800">Trip link unavailable</h1>
        <p className="text-sm text-stone-500 mt-2">Ask your Logistics Coordinator for a valid driver trip link.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <LanguageToggle variant="floating" />
      <header className="bg-[#153328] text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center"><Truck className="w-5 h-5" /></div>
          <div>
            <p className="font-bold">Truck Company Trip Checkpoint</p>
            <p className="text-xs text-emerald-100">Assigned driver position to Port of Mombasa</p>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <section className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm grid sm:grid-cols-3 gap-3">
          <div><p className="text-xs text-stone-500">Container</p><p className="font-semibold text-stone-800">{trip.containerNo || '-'}</p></div>
          <div><p className="text-xs text-stone-500">Truck</p><p className="font-semibold text-stone-800">{trip.truckPlate}</p></div>
          <div><p className="text-xs text-stone-500">Seal</p><p className="font-semibold text-stone-800">{trip.sealNo || 'Not recorded'}</p></div>
          <div><p className="text-xs text-stone-500">Assigned Driver</p><p className="font-semibold text-stone-800">{trip.driverName || 'Enter below'}</p></div>
          <div><p className="text-xs text-stone-500">Batch QR</p><p className="font-semibold text-stone-800">{trip.batchQrCode || '-'}</p></div>
          <div><p className="text-xs text-stone-500">Road Status</p><p className="font-semibold text-emerald-700">{trip.status}</p></div>
        </section>

        <section className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-stone-800 mb-3">Route and Submitted Position</h2>
          <div className="relative flex h-64 items-center justify-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
            {displayedPoint ? (
              <iframe title="Driver route to Mombasa Port map" src={mapUrl} className="absolute inset-0 w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            ) : (
              <div className="max-w-xs text-center text-stone-600">
                <MapPin className="mx-auto mb-2 h-7 w-7 text-emerald-600" />
                <p className="font-medium text-stone-800">Capture your location</p>
                <p className="mt-1 text-sm">Your route to Port of Mombasa will appear after phone GPS is captured.</p>
              </div>
            )}
            {displayedPoint && (
              <div className="absolute left-3 top-3 rounded-lg border border-emerald-100 bg-white/95 p-3 shadow-sm pointer-events-none">
                <p className="text-xs font-semibold text-emerald-800">Driver Location</p>
                <p className="mt-1 text-[11px] text-stone-700">{displayedPoint.latitude.toFixed(6)}, {displayedPoint.longitude.toFixed(6)}</p>
                <p className="text-[11px] text-stone-500">Accuracy {Math.round(displayedPoint.accuracy)} m | Route to Port of Mombasa</p>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-2">
            {displayedPoint
              ? `Route from the captured driver location to ${mombasaPort}; reported accuracy about ${Math.round(displayedPoint.accuracy)} m.`
              : `Capture your phone location to display the route to ${mombasaPort}.`}
          </p>
        </section>

        <form onSubmit={submit} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-600" /><h2 className="font-semibold text-stone-800">Submit Checkpoint</h2></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-stone-500">
              Assigned Driver Name
              <input required value={form.driverName} onChange={event => setForm(current => ({ ...current, driverName: event.target.value }))} placeholder="Driver chosen by truck company" className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </label>
            <label className="text-xs text-stone-500">
              Driver Phone
              <input value={form.driverPhone} onChange={event => setForm(current => ({ ...current, driverPhone: event.target.value }))} placeholder="+250..." className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </label>
            <label className="text-xs text-stone-500">
              Checkpoint Event
              <select value={form.eventType} onChange={event => setForm(current => ({ ...current, eventType: event.target.value, checkpointName: eventLocations[event.target.value] }))} className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
                {eventTypes.map(type => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="text-xs text-stone-500">
              Checkpoint Name
              <input required value={form.checkpointName} onChange={event => setForm(current => ({ ...current, checkpointName: event.target.value }))} className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </label>
            <label className="text-xs text-stone-500">
              Seal Condition
              <select value={form.sealCondition} onChange={event => setForm(current => ({ ...current, sealCondition: event.target.value }))} className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
                {['Intact', 'Checked - Intact', 'Damaged', 'Replaced'].map(status => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="text-xs text-stone-500">
              Notes
              <input value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Delay, seal, or condition note" className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </label>
          </div>
          <label className="flex gap-2 text-sm text-stone-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
            <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1" />
            <span>I consent to sharing my current phone location for this checkpoint event. It will be visible to Logistics as journey evidence.</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={captureLocation} disabled={capturing || !consent} className="inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold disabled:opacity-50">
              {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
              Capture Phone Location
            </button>
            <button disabled={submitting || !location} className="inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Submit GPS Checkpoint
            </button>
          </div>
          {location && <p className="text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Ready: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} (accuracy {Math.round(location.accuracy)} m)</p>}
        </form>

        <section className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Package className="w-4 h-4 text-stone-500" /><h2 className="font-semibold text-stone-800">Submitted Checkpoints</h2></div>
          {(trip.checkpoints || []).length === 0 ? <p className="text-sm text-stone-500">No checkpoint has been submitted yet.</p> : (
            <div className="space-y-2">
              {trip.checkpoints.map((checkpoint: any) => (
                <div key={checkpoint.checkpointId} className="border border-stone-100 rounded-lg p-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{checkpoint.eventType}</p>
                    <p className="text-xs text-stone-500">{checkpoint.checkpointName} - {new Date(checkpoint.recordedAt).toLocaleString()}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
