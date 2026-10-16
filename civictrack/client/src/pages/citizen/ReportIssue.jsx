import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { LocateFixed, ImagePlus, X, Info, MapPin, FileText, Camera, Check, UploadCloud, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Field, PageHeader, PriorityBadge } from '../../components/ui.jsx';
import { MapPicker } from '../../components/Maps.jsx';
import { CATEGORIES } from '../../utils/constants.js';
import { post } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { applyServerErrors, errMsg } from '../../utils/format.js';

const MAX_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 5;
const MAX_FILES = 3;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ReportIssue() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const submitting = useRef(false);
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { category: CATEGORIES.some((c) => c.key === params.get('category')) ? params.get('category') : '' },
  });
  const [coords, setCoords] = useState(null);
  const [geoState, setGeoState] = useState({ loading: false, msg: '' });
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const category = watch('category');
  const suggested = CATEGORIES.find((c) => c.key === category)?.priority;
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const useGps = () => {
    if (!('geolocation' in navigator)) {
      setGeoState({ loading: false, msg: 'Your browser does not support GPS location. Click the map or describe the location instead.' });
      return;
    }
    setGeoState({ loading: true, msg: '' });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) });
        setGeoState({ loading: false, msg: `Location captured (accuracy ≈ ${Math.round(p.coords.accuracy)} m). Drag marker to refine.` });
      },
      (err) => setGeoState({
        loading: false,
        msg: err.code === 1
          ? 'Location permission denied. You can still click the map or type the address below.'
          : 'Could not determine location. Click the map or type the address instead.'
      }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const processFileList = (picked) => {
    setFileError('');
    const next = [...files];
    for (const f of picked) {
      if (!TYPES.includes(f.type)) {
        setFileError(`"${f.name}" is not a JPEG, PNG or WebP image.`);
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setFileError(`"${f.name}" exceeds ${MAX_MB} MB.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setFileError(`You can attach up to ${MAX_FILES} photos.`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const onFiles = (e) => {
    const picked = [...e.target.files];
    e.target.value = '';
    processFileList(picked);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      processFileList([...e.dataTransfer.files]);
    }
  };

  const setCoordField = (key, val) => {
    const n = val === '' ? NaN : Number(val);
    setCoords((c) => ({ ...(c || { lat: NaN, lng: NaN }), [key]: n }));
  };
  const coordsValid = coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng) && Math.abs(coords.lat) <= 90 && Math.abs(coords.lng) <= 180;
  const coordsPartial = coords && !coordsValid && (Number.isFinite(coords.lat) || Number.isFinite(coords.lng));

  const onSubmit = async (v) => {
    if (submitting.current) return;
    if (coordsPartial) { setFormError('Enter both a valid latitude and longitude, or clear them.'); return; }
    submitting.current = true; setFormError('');
    try {
      const fd = new FormData();
      Object.entries({ title: v.title, description: v.description, category: v.category, locationDescription: v.locationDescription }).forEach(([k, val]) => fd.append(k, val));
      if (coordsValid) { fd.append('latitude', coords.lat); fd.append('longitude', coords.lng); }
      files.forEach((f) => fd.append('images', f));
      const r = await post('/complaints', fd);
      toast.success('Complaint submitted successfully!');
      navigate(`/report/success/${r.data.complaint.referenceNumber}`, { replace: true, state: { complaint: r.data.complaint } });
    } catch (e) {
      if (!applyServerErrors(e, setError, ['title', 'description', 'category', 'locationDescription'])) setFormError(errMsg(e));
      else setFormError('Please fix the highlighted fields.');
      submitting.current = false;
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <PageHeader
        title="Report a Civic Issue"
        subtitle="Submit problems directly to municipal authorities. Fast, verified, and transparent."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {formError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Submission Error</p>
              <p>{formError}</p>
            </div>
          </motion.div>
        )}

        {/* Section 1: Problem Details */}
        <section className="card p-6 border border-slate-200/80 shadow-card">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              1
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-main">Issue Details</h2>
              <p className="text-xs text-slate-muted">Categorize and summarize the problem accurately</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Field
                as="select"
                label="Infrastructure Category"
                required
                error={errors.category?.message}
                {...register('category', { required: 'Select a category' })}
              >
                <option value="">Choose category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Field>
              {suggested && (
                <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <Info className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                  <span>Default category priority:</span>
                  <PriorityBadge priority={suggested} />
                  <span className="text-slate-400">(Admin may adjust based on urgency)</span>
                </div>
              )}
            </div>

            <Field
              label="Issue Title"
              required
              placeholder="e.g. Deep pothole near Anna Nagar bus stand"
              hint="A short, descriptive summary (5–120 characters)."
              error={errors.title?.message}
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 5, message: 'At least 5 characters' },
                maxLength: { value: 120, message: 'At most 120 characters' }
              })}
            />

            <Field
              as="textarea"
              rows={4}
              label="Detailed Description"
              required
              placeholder="Provide exact details: When did it start? Is it causing vehicle damage or flooding? Is it hazardous at night?"
              hint="Be as specific as possible to help municipal dispatchers."
              error={errors.description?.message}
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 10, message: 'At least 10 characters' },
                maxLength: { value: 2000, message: 'At most 2000 characters' }
              })}
            />
          </div>
        </section>

        {/* Section 2: Location & GPS */}
        <section className="card p-6 border border-slate-200/80 shadow-card">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              2
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-main">Location & Map Pin</h2>
              <p className="text-xs text-slate-muted">Provide the exact street location or capture your GPS</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field
              label="Street Address / Landmark"
              required
              placeholder="e.g. Opposite Pillar 42, 2nd Avenue, Anna Nagar, Chennai"
              hint="Street name, building landmark, or ward number."
              error={errors.locationDescription?.message}
              {...register('locationDescription', {
                required: 'Location description is required',
                minLength: { value: 3, message: 'At least 3 characters' },
                maxLength: { value: 300, message: 'At most 300 characters' }
              })}
            />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={useGps}
                loading={geoState.loading}
                className="inline-flex items-center gap-2 text-xs"
              >
                <LocateFixed className="h-4 w-4 text-secondary" />
                Capture Current GPS
              </Button>
              {coords && (
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline font-medium"
                  onClick={() => { setCoords(null); setGeoState({ loading: false, msg: '' }); }}
                >
                  Clear Coordinates
                </button>
              )}
            </div>

            {geoState.msg && (
              <p role="status" className="text-xs font-medium text-secondary bg-teal-50/70 p-2.5 rounded-lg border border-teal-100">
                {geoState.msg}
              </p>
            )}

            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner">
              <MapPicker value={coordsValid ? coords : null} onChange={setCoords} />
            </div>
            <p className="text-xs text-slate-400">
              Tip: Click anywhere on the map to drop a pin, or drag it to pinpoint the exact location.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label htmlFor="lat" className="label text-xs">Latitude</label>
                <input
                  id="lat"
                  className="input font-mono text-xs"
                  inputMode="decimal"
                  value={coords && Number.isFinite(coords.lat) ? coords.lat : ''}
                  onChange={(e) => setCoordField('lat', e.target.value)}
                  placeholder="e.g. 13.0827"
                />
              </div>
              <div>
                <label htmlFor="lng" className="label text-xs">Longitude</label>
                <input
                  id="lng"
                  className="input font-mono text-xs"
                  inputMode="decimal"
                  value={coords && Number.isFinite(coords.lng) ? coords.lng : ''}
                  onChange={(e) => setCoordField('lng', e.target.value)}
                  placeholder="e.g. 80.2707"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Photos & Evidence */}
        <section className="card p-6 border border-slate-200/80 shadow-card">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              3
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-main">Photographs & Evidence (Optional)</h2>
              <p className="text-xs text-slate-muted">Photographs speed up municipal assessment and priority assignment</p>
            </div>
          </div>

          <div>
            <label
              htmlFor="photos"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-secondary bg-teal-50/60 ring-4 ring-secondary/15 scale-[1.01]'
                  : 'border-slate-300 hover:border-secondary hover:bg-slate-50'
              }`}
            >
              <div className="p-3 rounded-full bg-teal-50 text-secondary">
                <UploadCloud className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-700">
                  Click to upload or drag & drop photos here
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Attach up to {MAX_FILES} images (JPEG, PNG, WebP · Max {MAX_MB} MB each)
                </p>
              </div>
              <input
                id="photos"
                type="file"
                accept={TYPES.join(',')}
                multiple
                className="sr-only"
                onChange={onFiles}
                disabled={files.length >= MAX_FILES}
              />
            </label>

            {fileError && (
              <p role="alert" className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {fileError}
              </p>
            )}

            {previews.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Attached Photos ({previews.length}/{MAX_FILES}):</p>
                <div className="grid grid-cols-3 gap-3">
                  {previews.map((src, i) => (
                    <motion.div
                      key={src}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square shadow-sm"
                    >
                      <img
                        src={src}
                        alt={`Selected photo ${i + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="absolute top-2 right-2 rounded-full bg-red-600 text-white p-1 shadow-md hover:bg-red-700 transition-colors"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Submit Action Bar */}
        <div className="card p-4 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white shadow-card">
          <p className="text-xs text-slate-muted">
            By submitting, you certify that the information provided is accurate to the best of your knowledge.
          </p>
          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 text-sm font-semibold shadow-md shrink-0"
          >
            {isSubmitting ? 'Submitting Complaint…' : 'Submit Complaint'}
          </Button>
        </div>
      </form>
    </div>
  );
}
