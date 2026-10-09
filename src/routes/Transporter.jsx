import { useCallback, useEffect, useMemo, useState } from 'react'

const API_URL = '/api/trucks'

const EMPTY_FORM = {
  driverName: '',
  driverPhone: '',
  capacity: '',
  numberPlate: '',
  currentLocation: '',
  availableFrom: '',
  pricePerKm: '',
  status: 'available',
  passportPhotoUrl: '',
}

const styles = `
  .transporter-page {
    width: 100%;
    max-width: 1500px;
    margin: 0 auto;
    padding: 24px;
    color: #172033;
    box-sizing: border-box;
  }
  .transporter-page * { box-sizing: border-box; }
  .transporter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .transporter-title { margin: 0; font-size: 28px; font-weight: 800; }
  .transporter-subtitle { margin: 7px 0 0; color: #667085; font-size: 14px; }
  .transporter-btn {
    border: 0;
    border-radius: 9px;
    padding: 11px 16px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: opacity .15s ease, transform .15s ease;
  }
  .transporter-btn:hover { opacity: .9; }
  .transporter-btn:disabled { opacity: .55; cursor: not-allowed; }
  .transporter-btn-primary { background: #16803d; color: #fff; }
  .transporter-btn-secondary { background: #eef2f6; color: #344054; }
  .transporter-btn-danger { background: #fee4e2; color: #b42318; }
  .transporter-btn-small { padding: 7px 10px; font-size: 12px; }
  .transporter-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 22px;
  }
  .transporter-stat {
    background: #fff;
    border: 1px solid #e5eaf0;
    border-radius: 14px;
    padding: 19px;
    box-shadow: 0 2px 8px rgba(16,24,40,.03);
  }
  .transporter-stat-label { color: #667085; font-size: 13px; }
  .transporter-stat-value { margin-top: 8px; font-size: 27px; font-weight: 800; }
  .transporter-filters {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .transporter-input, .transporter-select {
    width: 100%;
    min-width: 0;
    border: 1px solid #d0d5dd;
    border-radius: 8px;
    padding: 11px 12px;
    background: #fff;
    color: #172033;
    font-size: 14px;
    outline: none;
  }
  .transporter-input:focus, .transporter-select:focus {
    border-color: #16803d;
    box-shadow: 0 0 0 3px rgba(22,128,61,.12);
  }
  .transporter-search { flex: 1; min-width: 220px; }
  .transporter-filter-select { width: 190px; }
  .transporter-table-wrap {
    width: 100%;
    overflow-x: auto;
    background: #fff;
    border: 1px solid #e5eaf0;
    border-radius: 14px;
  }
  .transporter-table { width: 100%; border-collapse: collapse; min-width: 850px; }
  .transporter-table th, .transporter-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #edf0f4;
    text-align: left;
    font-size: 13px;
    vertical-align: middle;
  }
  .transporter-table th {
    background: #f8fafc;
    color: #667085;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .04em;
  }
  .transporter-table tr:last-child td { border-bottom: 0; }
  .transporter-driver { display: flex; align-items: center; gap: 11px; min-width: 160px; }
  .transporter-avatar {
    width: 42px; height: 42px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: #e8f5ec; color: #16803d; font-weight: 800;
    overflow: hidden; flex-shrink: 0;
  }
  .transporter-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .transporter-driver-name { font-weight: 700; color: #172033; }
  .transporter-muted { color: #667085; margin-top: 4px; font-size: 12px; }
  .transporter-status {
    display: inline-flex; align-items: center; border-radius: 20px;
    padding: 5px 9px; font-size: 12px; font-weight: 700;
  }
  .transporter-status-available { background: #dcfae6; color: #067647; }
  .transporter-status-booked { background: #fef0c7; color: #93370d; }
  .transporter-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .transporter-empty { text-align: center; padding: 44px 20px; color: #667085; }
  .transporter-error {
    margin-bottom: 16px; padding: 12px 14px; border-radius: 9px;
    background: #fef3f2; color: #b42318; font-size: 14px;
  }
  .transporter-success {
    margin-bottom: 16px; padding: 12px 14px; border-radius: 9px;
    background: #ecfdf3; color: #067647; font-size: 14px;
  }
  .transporter-loading { padding: 35px; text-align: center; color: #667085; }
  .transporter-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(16,24,40,.58);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 24px 14px; overflow-y: auto;
  }
  .transporter-modal {
    width: 100%; max-width: 720px; background: #fff;
    border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.22);
    margin: auto 0; overflow: hidden;
  }
  .transporter-modal-header {
    padding: 20px 24px; border-bottom: 1px solid #eaecf0;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .transporter-modal-header h2 { margin: 0; font-size: 20px; }
  .transporter-modal-body { padding: 24px; }
  .transporter-form-grid {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px;
  }
  .transporter-field { min-width: 0; }
  .transporter-field-full { grid-column: 1 / -1; }
  .transporter-field label {
    display: block; font-size: 13px; font-weight: 700;
    color: #344054; margin-bottom: 7px;
  }
  .transporter-required { color: #d92d20; }
  .transporter-help { margin-top: 6px; font-size: 12px; color: #667085; }
  .transporter-photo-area {
    border: 1px dashed #cbd5e1; border-radius: 12px;
    padding: 15px; display: flex; align-items: center; gap: 16px;
    flex-wrap: wrap;
  }
  .transporter-photo-preview {
    width: 86px; height: 86px; border-radius: 10px;
    object-fit: cover; background: #f2f4f7;
  }
  .transporter-photo-placeholder {
    width: 86px; height: 86px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: #f2f4f7; color: #667085; font-size: 12px; text-align: center;
  }
  .transporter-modal-footer {
    padding: 17px 24px; background: #f9fafb; border-top: 1px solid #eaecf0;
    display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;
  }
  @media (max-width: 700px) {
    .transporter-page { padding: 16px; }
    .transporter-title { font-size: 23px; }
    .transporter-stats { grid-template-columns: 1fr; gap: 10px; }
    .transporter-stat { padding: 15px; }
    .transporter-stat-value { font-size: 23px; }
    .transporter-filter-select { width: 100%; }
    .transporter-search { min-width: 100%; }
    .transporter-form-grid { grid-template-columns: 1fr; }
    .transporter-field-full { grid-column: auto; }
    .transporter-modal-body { padding: 18px; }
    .transporter-modal-header, .transporter-modal-footer { padding: 16px 18px; }
    .transporter-overlay { padding: 12px; }
  }
`

function getErrorMessage(data, fallback) {
  if (typeof data?.error === 'string') return data.error
  if (typeof data?.message === 'string') return data.message
  return fallback
}

function toDateInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function getPhoto(truck) {
  return truck?.passportPhotoUrl ?? truck?.passport_photo_url ?? ''
}

function getStatus(truck) {
  return truck?.status || 'available'
}

function getTruckList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.trucks)) return data.trucks
  if (Array.isArray(data?.data)) return data.data
  return []
}

function getTruckId(truck) {
  return truck?.id ?? truck?.truckId
}

function toFormValues(truck) {
  return {
    driverName: truck?.driverName ?? truck?.driver_name ?? '',
    driverPhone: String(truck?.driverPhone ?? truck?.driver_phone ?? ''),
    capacity: truck?.capacity ?? '',
    numberPlate: truck?.numberPlate ?? truck?.number_plate ?? '',
    currentLocation: truck?.currentLocation ?? truck?.current_location ?? '',
    availableFrom: toDateInputValue(truck?.availableFrom ?? truck?.available_from),
    pricePerKm:
      truck?.pricePerKm == null && truck?.price_per_km == null
        ? ''
        : String(truck?.pricePerKm ?? truck?.price_per_km),
    status: getStatus(truck),
    passportPhotoUrl: getPhoto(truck),
  }
}

function toApiPayload(form, statusOverride) {
  const rawPrice = String(form.pricePerKm ?? '').trim()

  return {
    driver_phone: String(form.driverPhone ?? '').trim(),
    driver_name: String(form.driverName ?? '').trim(),
    capacity: String(form.capacity ?? '').trim(),
    number_plate: String(form.numberPlate ?? '').trim().toUpperCase(),
    current_location: String(form.currentLocation ?? '').trim(),
    available_from: form.availableFrom || null,
    price_per_km: rawPrice === '' ? null : Number(rawPrice),
    status: statusOverride ?? form.status,
    passport_photo_url: form.passportPhotoUrl || null,
  }
}

async function readResponse(response) {
  const text = await response.text()

  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function compressImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file.')
  }

  // Keep uploads small enough for the API request body.
  const imageUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the selected image.'))
    reader.readAsDataURL(file)
  })

  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not open the selected image.'))
    img.src = imageUrl
  })

  const maxDimension = 1200
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image processing is not supported by this browser.')

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL('image/jpeg', 0.78)
}

export default function Transporter() {
  const [trucks, setTrucks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTruck, setEditingTruck] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadTrucks = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            response.status === 401
              ? 'Your session has expired. Please sign in again.'
              : 'Could not load trucks.',
          ),
        )
      }

      setTrucks(getTruckList(data))
    } catch (err) {
      setError(err.message || 'Could not connect to the server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrucks()
  }, [loadTrucks])

  const filteredTrucks = useMemo(() => {
    const term = search.trim().toLowerCase()

    return trucks.filter((truck) => {
      const matchesSearch =
        !term ||
        [
          truck.driverName,
          truck.driver_name,
          truck.driverPhone,
          truck.driver_phone,
          truck.numberPlate,
          truck.number_plate,
          truck.capacity,
          truck.currentLocation,
          truck.current_location,
        ].some((value) => String(value ?? '').toLowerCase().includes(term))

      const matchesStatus =
        statusFilter === 'all' || getStatus(truck) === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [trucks, search, statusFilter])

  const totalTrucks = trucks.length
  const availableTrucks = trucks.filter(
    (truck) => getStatus(truck) === 'available',
  ).length
  const bookedTrucks = trucks.filter(
    (truck) => getStatus(truck) === 'booked',
  ).length

  function openCreateModal() {
    setEditingTruck(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setSuccess('')
    setModalOpen(true)
  }

  function openEditModal(truck) {
    setEditingTruck(truck)
    setForm(toFormValues(truck))
    setError('')
    setSuccess('')
    setModalOpen(true)
  }

  function closeModal() {
    if (saving || uploadingPhoto) return
    setModalOpen(false)
    setEditingTruck(null)
    setForm({ ...EMPTY_FORM })
  }

  function handleChange(event) {
    const { name, value } = event.target

    if (name === 'driverPhone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
      setForm((current) => ({ ...current, driverPhone: digitsOnly }))
      return
    }

    if (name === 'numberPlate') {
      setForm((current) => ({
        ...current,
        numberPlate: value.toUpperCase(),
      }))
      return
    }

    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setError('')
    setSuccess('')
    setUploadingPhoto(true)

    try {
      const compressedPhoto = await compressImage(file)
      setForm((current) => ({
        ...current,
        passportPhotoUrl: compressedPhoto,
      }))
    } catch (err) {
      setError(err.message || 'Could not process that image.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function removePhoto() {
    setForm((current) => ({ ...current, passportPhotoUrl: '' }))
  }

  function validateForm() {
    if (!form.driverName.trim()) return 'Driver name is required.'

    if (!/^\d{10}$/.test(form.driverPhone.trim())) {
      return 'Phone number must contain exactly 10 digits.'
    }

    if (!form.capacity.trim()) return 'Truck capacity is required.'
    if (!form.numberPlate.trim()) return 'Number plate is required.'
    if (!form.currentLocation.trim()) return 'Current location is required.'
    if (!form.availableFrom) return 'Available-from date is required.'

    const priceText = String(form.pricePerKm).trim()
    if (!priceText) return 'Price per kilometre is required.'

    const price = Number(priceText)
    if (!Number.isFinite(price) || price < 0) {
      return 'Enter a valid, non-negative price per kilometre.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const payload = toApiPayload(form)

    setSaving(true)

    try {
      const isEditing = Boolean(editingTruck)
      const url = isEditing
        ? `${API_URL}/${encodeURIComponent(getTruckId(editingTruck))}`
        : API_URL

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            response.status === 401
              ? 'Your session has expired. Please sign in again.'
              : `Could not ${isEditing ? 'update' : 'register'} the truck.`,
          ),
        )
      }

      setModalOpen(false)
      setEditingTruck(null)
      setForm({ ...EMPTY_FORM })
      setSuccess(isEditing ? 'Truck updated successfully.' : 'Truck registered successfully.')
      await loadTrucks()
    } catch (err) {
      setError(err.message || 'Could not connect to the server.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(truck) {
    const truckId = getTruckId(truck)

    if (truckId == null) {
      setError('This truck is missing its ID. Refresh the page and try again.')
      return
    }

    const nextStatus = getStatus(truck) === 'available' ? 'booked' : 'available'
    setError('')
    setSuccess('')
    setUpdatingId(truckId)

    try {
      // The backend expects snake_case fields, including driver_phone.
      const payload = toApiPayload(toFormValues(truck), nextStatus)

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(truckId)}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        },
      )

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, 'Could not update the truck status.'),
        )
      }

      setSuccess(`Truck marked ${nextStatus}.`)
      await loadTrucks()
    } catch (err) {
      setError(err.message || 'Could not connect to the server.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(truck) {
    const truckId = getTruckId(truck)

    if (truckId == null) {
      setError('This truck is missing its ID. Refresh the page and try again.')
      return
    }

    const confirmed = window.confirm(
      `Delete the truck registered to ${truck.driverName ?? truck.driver_name ?? 'this driver'}? This action cannot be undone.`,
    )

    if (!confirmed) return

    setError('')
    setSuccess('')
    setDeletingId(truckId)

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(truckId)}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        },
      )

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, 'Could not delete this truck.'),
        )
      }

      setSuccess('Truck deleted successfully.')
      await loadTrucks()
    } catch (err) {
      setError(err.message || 'Could not connect to the server.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="transporter-page">
      <style>{styles}</style>

      <div className="transporter-header">
        <div>
          <h1 className="transporter-title">Transporter Management</h1>
          <p className="transporter-subtitle">
            Register trucks, manage availability, and maintain driver details.
          </p>
        </div>

        <button
          type="button"
          className="transporter-btn transporter-btn-primary"
          onClick={openCreateModal}
        >
          + Register a Truck
        </button>
      </div>

      {error && !modalOpen && (
        <div className="transporter-error" role="alert">
          {error}
        </div>
      )}

      {success && !modalOpen && (
        <div className="transporter-success" role="status">
          {success}
        </div>
      )}

      <div className="transporter-stats">
        <div className="transporter-stat">
          <div className="transporter-stat-label">Total Trucks</div>
          <div className="transporter-stat-value">{totalTrucks}</div>
        </div>

        <div className="transporter-stat">
          <div className="transporter-stat-label">Available Trucks</div>
          <div className="transporter-stat-value">{availableTrucks}</div>
        </div>

        <div className="transporter-stat">
          <div className="transporter-stat-label">Booked Trucks</div>
          <div className="transporter-stat-value">{bookedTrucks}</div>
        </div>
      </div>

      <div className="transporter-filters">
        <input
          className="transporter-input transporter-search"
          type="search"
          placeholder="Search driver, phone, plate, location..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search trucks"
        />

        <select
          className="transporter-select transporter-filter-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="booked">Booked</option>
        </select>

        <button
          type="button"
          className="transporter-btn transporter-btn-secondary"
          onClick={loadTrucks}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="transporter-table-wrap">
        {loading ? (
          <div className="transporter-loading">Loading trucks...</div>
        ) : filteredTrucks.length === 0 ? (
          <div className="transporter-empty">
            <h3>{trucks.length ? 'No matching trucks' : 'No trucks registered yet'}</h3>
            <p>
              {trucks.length
                ? 'Try changing your search or status filter.'
                : 'Register your first truck to get started.'}
            </p>
            {!trucks.length && (
              <button
                type="button"
                className="transporter-btn transporter-btn-primary"
                onClick={openCreateModal}
              >
                Register a Truck
              </button>
            )}
          </div>
        ) : (
          <table className="transporter-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Truck Details</th>
                <th>Location</th>
                <th>Available From</th>
                <th>Price / KM</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredTrucks.map((truck) => {
                const truckId = getTruckId(truck)
                const driverName = truck.driverName ?? truck.driver_name ?? 'Unnamed driver'
                const driverPhone = truck.driverPhone ?? truck.driver_phone ?? ''
                const numberPlate = truck.numberPlate ?? truck.number_plate ?? '—'
                const location = truck.currentLocation ?? truck.current_location ?? '—'
                const availableFrom = truck.availableFrom ?? truck.available_from
                const price = truck.pricePerKm ?? truck.price_per_km
                const photo = getPhoto(truck)
                const status = getStatus(truck)
                const isBusy = updatingId === truckId || deletingId === truckId

                return (
                  <tr key={truckId ?? `${driverPhone}-${numberPlate}`}>
                    <td>
                      <div className="transporter-driver">
                        <div className="transporter-avatar">
                          {photo ? (
                            <img src={photo} alt={`${driverName}'s photo`} />
                          ) : (
                            driverName.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="transporter-driver-name">{driverName}</div>
                          <div className="transporter-muted">{driverPhone || 'No phone'}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="transporter-driver-name">{numberPlate}</div>
                      <div className="transporter-muted">{truck.capacity || 'Capacity not set'}</div>
                    </td>

                    <td>{location}</td>
                    <td>{toDateInputValue(availableFrom) || '—'}</td>
                    <td>
                      {price == null || price === ''
                        ? '—'
                        : `KES ${Number(price).toLocaleString('en-KE')}`}
                    </td>

                    <td>
                      <span
                        className={`transporter-status ${
                          status === 'booked'
                            ? 'transporter-status-booked'
                            : 'transporter-status-available'
                        }`}
                      >
                        {status === 'booked' ? 'Booked' : 'Available'}
                      </span>
                    </td>

                    <td>
                      <div className="transporter-actions">
                        <button
                          type="button"
                          className="transporter-btn transporter-btn-secondary transporter-btn-small"
                          onClick={() => openEditModal(truck)}
                          disabled={isBusy}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="transporter-btn transporter-btn-secondary transporter-btn-small"
                          onClick={() => toggleStatus(truck)}
                          disabled={isBusy}
                        >
                          {updatingId === truckId
                            ? 'Updating...'
                            : status === 'available'
                              ? 'Mark Booked'
                              : 'Mark Available'}
                        </button>

                        <button
                          type="button"
                          className="transporter-btn transporter-btn-danger transporter-btn-small"
                          onClick={() => handleDelete(truck)}
                          disabled={isBusy}
                        >
                          {deletingId === truckId ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div
          className="transporter-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <section
            className="transporter-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transporter-modal-title"
          >
            <div className="transporter-modal-header">
              <h2 id="transporter-modal-title">
                {editingTruck ? 'Edit Truck Details' : 'Register a Truck'}
              </h2>

              <button
                type="button"
                className="transporter-btn transporter-btn-secondary transporter-btn-small"
                onClick={closeModal}
                disabled={saving || uploadingPhoto}
                aria-label="Close form"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="transporter-modal-body">
                {error && (
                  <div className="transporter-error" role="alert">
                    {error}
                  </div>
                )}

                <div className="transporter-form-grid">
                  <div className="transporter-field">
                    <label htmlFor="driverName">
                      Driver Name <span className="transporter-required">*</span>
                    </label>
                    <input
                      id="driverName"
                      name="driverName"
                      className="transporter-input"
                      value={form.driverName}
                      onChange={handleChange}
                      placeholder="Enter driver's full name"
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="transporter-field">
                    <label htmlFor="driverPhone">
                      Phone Number <span className="transporter-required">*</span>
                    </label>
                    <input
                      id="driverPhone"
                      name="driverPhone"
                      className="transporter-input"
                      type="tel"
                      inputMode="numeric"
                      value={form.driverPhone}
                      onChange={handleChange}
                      placeholder="0712345678"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      title="Enter exactly 10 digits."
                      autoComplete="tel"
                      required
                    />
                    <div className="transporter-help">
                      Enter exactly 10 digits, without spaces or a country code.
                    </div>
                  </div>

                  <div className="transporter-field">
                    <label htmlFor="capacity">
                      Truck Capacity <span className="transporter-required">*</span>
                    </label>
                    <input
                      id="capacity"
                      name="capacity"
                      className="transporter-input"
                      value={form.capacity}
                      onChange={handleChange}
                      placeholder="e.g. 10-ton"
                      required
                    />
                  </div>

                  <div className="transporter-field">
                    <label htmlFor="numberPlate">
                      Number Plate <span className="transporter-required">*</span>
                    </label>
                    <input
                      id="numberPlate"
                      name="numberPlate"
                      className="transporter-input"
                      value={form.numberPlate}
                      onChange={handleChange}
                      placeholder="e.g. KDA 123A"
                      required
                    />
                  </div>

                  <div className="transporter-field transporter-field-full">
                    <label htmlFor="currentLocation">
                      Current Location <span className="transporter-required">*</span>
                    </label>
                    <input
                      id="currentLocation"
                      name="currentLocation"
                      className="transporter-input"
                      value={form.currentLocation}
                      onChange={handleChange}
                      placeholder="e.g. Machakos, Kenya"
                      required
                    />
                  </div>

                  <div className="transporter-field">
                    <label htmlFor="availableFrom">
                      Available From <span className="transporter-required">*</span>
                    </label>
                    <input
                      id="availableFrom"
                      name="availableFrom"
                      type="date"
                      className="transporter-input"
                      value={form.availableFrom}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="transporter-field">
                    <label htmlFor="pricePerKm">
                      Price per Kilometre (KES) <span className="transporter-required">*</span>
                    </label>
                    <input
                      id="pricePerKm"
                      name="pricePerKm"
                      type="number"
                      min="0"
                      step="0.01"
                      className="transporter-input"
                      value={form.pricePerKm}
                      onChange={handleChange}
                      placeholder="e.g. 150"
                      required
                    />
                  </div>

                  <div className="transporter-field">
                    <label htmlFor="status">Truck Status</label>
                    <select
                      id="status"
                      name="status"
                      className="transporter-select"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="available">Available</option>
                      <option value="booked">Booked</option>
                    </select>
                  </div>

                  <div className="transporter-field transporter-field-full">
                    <label htmlFor="passportPhoto">
                      Driver Photo
                    </label>

                    <div className="transporter-photo-area">
                      {form.passportPhotoUrl ? (
                        <img
                          className="transporter-photo-preview"
                          src={form.passportPhotoUrl}
                          alt="Driver photo preview"
                        />
                      ) : (
                        <div className="transporter-photo-placeholder">
                          No photo selected
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <input
                          id="passportPhoto"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          disabled={uploadingPhoto || saving}
                          className="transporter-input"
                          style={{ padding: '8px' }}
                        />

                        <div className="transporter-help">
                          Select a photo from your device. The image is resized before upload.
                        </div>

                        {uploadingPhoto && (
                          <div className="transporter-help">Processing photo...</div>
                        )}

                        {form.passportPhotoUrl && (
                          <button
                            type="button"
                            className="transporter-btn transporter-btn-danger transporter-btn-small"
                            style={{ marginTop: '9px' }}
                            onClick={removePhoto}
                            disabled={saving || uploadingPhoto}
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="transporter-modal-footer">
                <button
                  type="button"
                  className="transporter-btn transporter-btn-secondary"
                  onClick={closeModal}
                  disabled={saving || uploadingPhoto}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="transporter-btn transporter-btn-primary"
                  disabled={saving || uploadingPhoto}
                >
                  {saving
                    ? 'Saving...'
                    : editingTruck
                      ? 'Save Changes'
                      : 'Register Truck'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
