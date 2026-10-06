import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COUNTIES, CROPS, GRADES, UNITS, cropById } from '@/data/catalog'
import { useMarket } from '@/context/marketContext'
import { useAuth } from '@/context/authContext'
import { createListing } from '@/data/market'
import { describeError } from '@/lib/supabase'
import { money, percent, weight } from '@/lib/format'
import { PageHeader } from '@/components/layout/PageHeader'
import { AmountInput, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/Icon'

const EMPTY = {
  crop: '',
  grade: 'g1',
  quantity: '',
  price: '',
  county: '',
  ward: '',
  readyIn: '0',
  note: '',
}

function validate(form) {
  const errors = {}
  if (!form.crop) errors.crop = 'Pick the crop you are selling.'
  if (!form.county) errors.county = 'Buyers filter by county, so this one is needed.'
  // Required because a buyer arranging a lorry needs somewhere to send it, and
  // because `listings.ward` is not null — an empty one would be refused anyway.
  if (!form.ward.trim()) errors.ward = 'Name the ward or nearest town.'
  if (!form.quantity || Number(form.quantity) <= 0) errors.quantity = 'How many units do you have?'
  if (!form.price || Number(form.price) <= 0) errors.price = 'Name a price per unit.'
  return errors
}

/**
 * Post a harvest.
 *
 * Kept to one column and eight fields, because the target is a farmer filling
 * this in on a phone at the edge of a field. The board price for the chosen crop
 * appears the moment it is picked — the number they most need in order to answer
 * the next question.
 */
export function NewListing() {
  const navigate = useNavigate()
  const { boardRowFor, reload } = useMarket()
  const { profile } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) => {
    const { value } = event.target
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
    setFailure(null)
  }

  const crop = form.crop ? cropById(form.crop) : null
  const unit = crop ? UNITS[crop.unit] : null
  const board = form.crop ? boardRowFor(form.crop) : null

  const summary = useMemo(() => {
    const quantity = Number(form.quantity) || 0
    const price = Number(form.price) || 0
    if (!unit || !quantity || !price) return null

    return {
      total: quantity * price,
      totalKg: Math.round(quantity * unit.kg),
      vsBoard: board ? Math.round(((price - board.price) / board.price) * 1000) / 10 : null,
    }
  }, [form.quantity, form.price, unit, board])

  const onSubmit = async (event) => {
    event.preventDefault()
    setFailure(null)
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }

    // The insert policy requires an active farmer. Saying so here is kinder than
    // letting Postgres answer with "you don't have permission to do that".
    if (profile && profile.state !== 'active') {
      setFailure(
        profile.state === 'pending'
          ? 'Your ID check is still with our team. You can post as soon as it clears.'
          : 'This account can’t post lots. Get in touch and we’ll sort it out.',
      )
      return
    }

    setSubmitting(true)
    try {
      const result = await createListing(profile, form)
      // Nowhere to save it means the lot does not exist. Navigating to the
      // dashboard would show four seeded lots and imply this was one of them.
      if (result.local) {
        setFailure('No project is connected, so this lot was not saved anywhere.')
        setSubmitting(false)
        return
      }
      reload()
      navigate(`/market/${result.id}`)
    } catch (caught) {
      setFailure(describeError(caught))
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="New lot"
        title="Post a harvest"
        description="Eight fields. Verified buyers see it as soon as you publish, and you keep every shilling you are quoted."
      />

      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-6">
        <Field label="Crop" required error={errors.crop}>
          {(props) => (
            <Select {...props} value={form.crop} onChange={update('crop')}>
              <option value="">Choose a crop</option>
              {CROPS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {board ? (
          <div className="-mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-field bg-brand-wash px-3 py-2.5 text-sm">
            <Icon name="board" className="text-base text-brand" />
            <span className="text-fg-2">Today&rsquo;s board for {board.crop}:</span>
            <span className="tnum font-mono font-semibold text-brand">{money(board.price)}</span>
            <span className="text-fg-3">per {board.unit}</span>
          </div>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Grade" required hint="Buyers pay more for a graded lot.">
            {(props) => (
              <Select {...props} value={form.grade} onChange={update('grade')}>
                {GRADES.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.label} — {grade.note}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Ready to collect"
            required
            hint="Counted from the day a buyer confirms."
          >
            {(props) => (
              <Select {...props} value={form.readyIn} onChange={update('readyIn')}>
                <option value="0">Today</option>
                <option value="1">Tomorrow</option>
                <option value="2">In 2 days</option>
                <option value="3">In 3 days</option>
                <option value="7">In a week</option>
              </Select>
            )}
          </Field>

          <Field label="Quantity" required error={errors.quantity}>
            {(props) => (
              <AmountInput
                {...props}
                min="1"
                placeholder="0"
                suffix={unit?.short ?? 'units'}
                value={form.quantity}
                onChange={update('quantity')}
              />
            )}
          </Field>

          <Field
            label="Your price"
            required
            error={errors.price}
            hint={unit ? `Per ${unit.short}, at the farm gate.` : 'Per unit, at the farm gate.'}
          >
            {(props) => (
              <AmountInput
                {...props}
                min="1"
                placeholder="0"
                suffix="KSh"
                value={form.price}
                onChange={update('price')}
              />
            )}
          </Field>

          <Field label="County" required error={errors.county}>
            {(props) => (
              <Select {...props} value={form.county} onChange={update('county')}>
                <option value="">Choose a county</option>
                {COUNTIES.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Ward or town" required error={errors.ward} hint="Where a lorry collects.">
            {(props) => (
              <Input {...props} placeholder="e.g. Mwea" value={form.ward} onChange={update('ward')} />
            )}
          </Field>
        </div>

        <Field
          label="Anything a buyer should know"
          hint="Variety, when it was picked, whether a lorry can reach you."
        >
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              placeholder="Picked this morning, still firm. A 3-tonne pickup can reach the shed."
              value={form.note}
              onChange={update('note')}
            />
          )}
        </Field>

        {summary ? (
          <div className="panel p-4" aria-live="polite">
            <p className="eyebrow text-fg-3">What you are asking</p>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="tnum font-mono text-2xl font-semibold text-fg">
                {money(summary.total)}
              </p>
              <p className="text-sm text-fg-3">
                <span className="tnum font-mono">{weight(summary.totalKg)}</span> in total
              </p>
            </div>
            {summary.vsBoard === null ? null : (
              <p className="mt-2 border-t border-rule pt-2 text-xs text-fg-2">
                {summary.vsBoard === 0 ? (
                  'Exactly the board price — buyers accept these fastest.'
                ) : summary.vsBoard > 0 ? (
                  <>
                    <span className="tnum font-mono font-semibold text-fg">
                      {percent(summary.vsBoard)}
                    </span>{' '}
                    above the board. Fair for a strong lot, slower to sell.
                  </>
                ) : (
                  <>
                    <span className="tnum font-mono font-semibold text-up">
                      {percent(summary.vsBoard)}
                    </span>{' '}
                    below the board. This will move quickly — you could ask for more.
                  </>
                )}
              </p>
            )}
          </div>
        ) : null}

        <div className="grid gap-3 border-t border-rule pt-6">
          {failure ? (
            <p
              className="flex items-start gap-2 rounded-field border border-alert/40 bg-alert-wash px-3 py-2.5 text-sm text-alert-fg"
              role="alert"
            >
              <Icon name="info" className="mt-0.5 shrink-0 text-base" />
              {failure}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              icon={submitting ? undefined : 'sprout'}
            >
              {submitting ? 'Publishing…' : 'Publish this lot'}
            </Button>
            <Button type="button" variant="ghost" size="lg" to="/dashboard">
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
