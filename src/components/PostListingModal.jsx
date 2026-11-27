import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, ChevronDown, ImagePlus, MapPin, Tag, FileText,
  ArrowRight, LoaderCircle, CheckCircle2, Clock3,
  Smartphone, ShieldCheck, RefreshCw, ShoppingBag, Eye,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { friendlyError } from '../lib/errors';
import { LISTING_DAYS } from '../lib/site';
import { usePaymentStatus } from '../lib/usePaymentStatus';
import ListingImageUploader from './ListingImageUploader';
import WhatsAppPrompt from './WhatsAppPrompt';

const TYPES = [
  { value: 'sale', label: 'For sale', short: 'Sell', description: 'I want to sell an item' },
  { value: 'wanted', label: 'Wanted', short: 'Want', description: 'I am looking for something' },
  { value: 'free', label: 'Free', short: 'Give', description: 'I am giving something away' },
  { value: 'lost_found', label: 'Lost & Found', short: 'Lost', description: 'I lost or found something' },
];

const OPERATORS = [
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'tnm', label: 'TNM Mpamba' },
];

const PRICE_HINTS = {
  'Books': 'MK 10k – 100k',
  'Electronics': 'MK 15k – 800k',
  'Clothes': 'MK 5k – 60k',
  'Food': 'MK 3k – 30k',
  'Furniture & Appliances': 'MK 8k – 80k',
  'Services': 'MK 3k – 50k',
  'Sports & Fitness': 'MK 5k – 50k',
  'Beauty & Personal Care': 'MK 4k – 40k',
};

export default function PostListingModal({
  open,
  onClose,
  session,
  onCreated,
}) {
  const [categories, setCategories] = useState([]);
  const [spots, setSpots] = useState([]);

  const [kind, setKind] = useState('sale');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [meetingSpotId, setMeetingSpotId] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [createdListing, setCreatedListing] = useState(null);
  const [photosUploaded, setPhotosUploaded] = useState(false);

  const [operator, setOperator] = useState('airtel');
  const [phone, setPhone] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [chargeId, setChargeId] = useState('');
  const [paidWithCredit, setPaidWithCredit] = useState(false);
  const [credits, setCredits] = useState(0);

  const photoRef = useRef(null);
  const listingPaymentKey = useRef(null);
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    if (!open || !supabase) return;
    let alive = true;

    async function loadOptions() {
      const [categoryResult, spotResult] = await Promise.all([
        supabase.from('categories').select('id,name').order('name'),
        supabase.from('meeting_spots').select('id,name').eq('is_active', true).order('name'),
      ]);

      if (!alive) return;

      if (!categoryResult.error) {
        setCategories(categoryResult.data || []);
        setCategoryId(current => current || categoryResult.data?.[0]?.id || '');
      }
      if (!spotResult.error) {
        setSpots(spotResult.data || []);
        setMeetingSpotId(current => current || spotResult.data?.[0]?.id || '');
      }

      if (session?.user?.id) {
        // referral_credits is not a readable column; the stats function is how the Account page reads it.
        const { data: stats } = await supabase.rpc('get_referral_stats');
        if (alive && stats?.success) setCredits(Number(stats.credits) || 0);
        const { data } = await supabase
          .from('seller_contacts')
          .select('whatsapp_number')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (alive && data?.whatsapp_number) setPhone(data.whatsapp_number);
      }
    }

    loadOptions();
    return () => { alive = false; };
  }, [open, session?.user?.id]);

  useEffect(() => {
    if (!open) {
      setError(''); setBusy(false); setPaymentError('');
      setPaymentBusy(false);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, []);

  usePaymentStatus({
    chargeId,
    onStatus: status => {
      if (status === 'successful') {
        setPaymentStatus('successful');
        setPaymentError('');
        setChargeId('');
        setPaymentBusy(false);
        const activeListing = createdListing ? { ...createdListing, status: 'active' } : null;
        if (activeListing) {
          setCreatedListing(activeListing);
          onCreated?.(activeListing);
        }
      } else if (status === 'failed') {
        setPaymentStatus('failed');
        setChargeId('');
        setPaymentBusy(false);
        setPaymentError('Payment was unsuccessful. You can start another attempt.');
      } else if (status === 'timeout') {
        setPaymentError('Payment is taking longer than expected. Check your phone, then tap "Check payment status" again.');
      }
    }
  });

  // Escape closes the post screen, like every other overlay.
  const finishRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === 'Escape') finishRef.current?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function clearFallbackTimer() {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  function finish() {
    clearFallbackTimer();
    setCreatedListing(null);
    setPhotosUploaded(false);
    setError('');
    setTitle(''); setDescription(''); setPrice(''); setKind('sale');
    setChargeId('');
    setPaymentStatus('idle'); setPaymentError('');
    setPaymentBusy(false); setPaidWithCredit(false);
    listingPaymentKey.current = null;
    onClose?.();
  }

  finishRef.current = finish;

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!session?.user?.id) { setError('Please sign in before posting.'); return; }
    if (!title.trim() || !description.trim() || !categoryId || !meetingSpotId) {
      setError('Please complete all required fields.'); return;
    }
    const numericPrice = kind === 'sale' ? Number(price) : null;
    if (kind === 'sale' && (!Number.isFinite(numericPrice) || numericPrice <= 0)) {
      setError('Enter a valid price greater than MK 0.'); return;
    }

    // Buyers can only reach a seller through their WhatsApp number, so a post without one is useless.
    const { data: contact, error: contactError } = await supabase
      .from('seller_contacts')
      .select('whatsapp_number')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (contactError) { setError(friendlyError(contactError, 'Could not check your contact number.')); return; }
    if (!contact?.whatsapp_number) {
      setError('Add your WhatsApp number in the box above and tap Save first, so buyers can contact you.');
      return;
    }

    setBusy(true);
    const status = kind === 'sale' ? 'pending_payment' : 'active';

    const { data, error: insertError } = await supabase
      .from('listings')
      .insert({
        seller_id: session.user.id,
        category_id: categoryId,
        meeting_spot_id: meetingSpotId,
        title: title.trim(),
        description: description.trim(),
        price: numericPrice,
        kind,
        status,
      })
      .select('id,status,kind,title')
      .single();

    setBusy(false);
    if (insertError) { setError(friendlyError(insertError, 'Could not publish your listing.')); return; }

    // Photos chosen on this form are uploaded right away, before payment or publishing.
    let photosOk = true;
    if (photoRef.current?.count() > 0) {
      setBusy(true);
      photosOk = await photoRef.current.upload(data.id);
      setBusy(false);
      if (photosOk) setPhotosUploaded(true);
      else setPaymentError('Some photos could not upload. You can add them again below.');
    }

    setCreatedListing(data);
    setPaymentStatus('idle'); setChargeId('');
    setPaymentError(''); setPaidWithCredit(false);
    listingPaymentKey.current = null;
    onCreated?.(data);
    if (kind === 'sale' && data.status === 'pending_payment' && credits > 0) {
      startPayment({ listing: data, useCredit: true });
    }
  }

  async function manuallyCheckPayment() {
    if (!chargeId || paymentBusy) return;
    setPaymentBusy(true); setPaymentError('');
    try {
      const { data, error: queryError } = await supabase
        .from('payments').select('status').eq('charge_id', chargeId).maybeSingle();
      if (queryError) throw queryError;
      if (data?.status === 'successful') {
        setPaymentStatus('successful'); setChargeId('');
        const activeListing = createdListing ? { ...createdListing, status: 'active' } : null;
        if (activeListing) { setCreatedListing(activeListing); onCreated?.(activeListing); }
      } else if (data?.status === 'failed') {
        setPaymentStatus('failed'); setChargeId('');
        setPaymentError('Payment was unsuccessful. You can start another attempt.');
      } else {
        setPaymentError('Payment is not confirmed yet. Check your phone and try again shortly.');
      }
    } catch (err) {
      console.error('Manual payment check failed:', err);
      setPaymentError(friendlyError(err, 'Could not check payment right now. Please try again.'));
    } finally { setPaymentBusy(false); }
  }

  function cancelPayment() {
    clearFallbackTimer();
    setPaymentStatus('idle'); setChargeId(''); setPaymentError('');
    setPaymentBusy(false); setPaidWithCredit(false);
    listingPaymentKey.current = null;
  }

  async function startPayment(opts = {}) {
    const useCredit = opts.useCredit === true;
    const target = opts.listing || createdListing;
    setPaymentError(''); setPaidWithCredit(false);
    clearFallbackTimer(); setChargeId('');
    if (!target?.id || !session?.user?.id) { setPaymentError('Your listing information is missing.'); return; }
    if (!useCredit && !phone.trim()) { setPaymentError('Enter your mobile-money phone number.'); return; }
    setPaymentBusy(true);

    try {
      if (!listingPaymentKey.current) listingPaymentKey.current = crypto.randomUUID();
      const { data, error: invokeError } = await supabase.functions.invoke(
        'campusflip-payment',
        {
          body: {
            listingId: target.id,
            paymentType: 'listing',
            ...(useCredit ? {} : { operator, phone: phone.trim() }),
            idempotencyKey: listingPaymentKey.current,
          },
        }
      );
      if (invokeError) {
        const message = invokeError.message?.toLowerCase().includes('session')
          ? 'Your session expired. Please sign out and back in, then retry.'
          : invokeError.message || 'Could not contact the payment service.';
        throw new Error(message);
      }
      if (!data?.success || !data?.charge_id) {
        throw new Error(data?.error || 'PayChangu could not start your payment.');
      }
      if (data.paid_with_credit) {
        setPaidWithCredit(true); setPaymentStatus('successful');
        setChargeId(''); setPaymentBusy(false);
        const activeListing = { ...target, status: 'active' };
        setCreatedListing(activeListing); onCreated?.(activeListing);
        setCredits(c => Math.max(0, c - 1));
        return;
      }
      setChargeId(data.charge_id); setPaymentStatus('pending');

      const capturedChargeId = data.charge_id;
      fallbackTimerRef.current = window.setTimeout(async () => {
        fallbackTimerRef.current = null;
        try {
          const { data: row } = await supabase
            .from('payments').select('status').eq('charge_id', capturedChargeId).maybeSingle();
          if (row?.status === 'successful') {
            setPaymentStatus('successful'); setPaymentError(''); setChargeId(''); setPaymentBusy(false);
            const activeListing = createdListing ? { ...createdListing, status: 'active' } : null;
            if (activeListing) { setCreatedListing(activeListing); onCreated?.(activeListing); }
          } else if (row?.status === 'failed') {
            setPaymentStatus('failed'); setChargeId(''); setPaymentBusy(false);
            setPaymentError('Payment was unsuccessful. You can start another attempt.');
          }
        } catch (pollErr) {
          console.warn('Fallback poll failed (non-fatal):', pollErr);
        }
      }, 2000);
    } catch (err) {
      console.error('CampusFlip payment initiation error:', err);
      setPaymentError(friendlyError(err, 'Payment could not be initiated. Please try again.'));
    } finally { setPaymentBusy(false); }
  }

  function handleRetryPayment() {
    listingPaymentKey.current = null;
    clearFallbackTimer(); setChargeId(''); setPaymentStatus('idle');
    startPayment();
  }

  const isLive = createdListing?.status === 'active';
  const isPaid = paymentStatus === 'successful' || isLive;
  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedSpot = spots.find(s => s.id === meetingSpotId);
  const priceHint = selectedCategory ? PRICE_HINTS[selectedCategory.name] : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cf-post-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={event => {
            if (event.target === event.currentTarget) onClose?.();
          }}
        >
          <motion.section
            className="cf-post-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cf-post-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="cf-post-heading">
              <div>
                <span className="cf-eyebrow">YOUR CAMPUS MARKETPLACE</span>
                <h2 id="cf-post-title">
                  {createdListing
                    ? isPaid ? 'You are all set!' : 'Almost there!'
                    : 'Create a post'}
                </h2>
                <p>
                  {createdListing
                    ? 'Your post has been saved successfully.'
                    : 'Give your item a good introduction.'}
                </p>
              </div>
              <button
                type="button"
                className="cf-icon-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            {createdListing ? (
              <div className="cf-upload-step">
                <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
                  {isPaid ? (
                    <CheckCircle2 size={46} color="#15803D" style={{ marginBottom: 12 }} />
                  ) : (
                    <Clock3 size={46} color="#D97706" style={{ marginBottom: 12 }} />
                  )}
                  <h3 style={{ margin: '0 0 8px' }}>
                    {isPaid ? 'Your listing is live!' : 'Your listing is awaiting payment'}
                  </h3>
                  <p style={{ margin: 0 }}>
                    <strong>{createdListing.title}</strong>
                  </p>
                  <p style={{ marginTop: 8 }}>
                    {isPaid
                      ? paidWithCredit
                        ? 'Activated with your referral credit. No payment was needed.'
                        : 'Students can now discover your post on CampusFlip.'
                      : 'Complete the payment below to publish your sale listing.'}
                  </p>
                </div>

                {createdListing.kind === 'sale' && !isPaid && (
                  <div style={{
                    border: '1px solid var(--cf-line)',
                    borderRadius: 16,
                    padding: 18,
                    marginBottom: 22,
                    background: '#F8FBFF',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 16,
                    }}>
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--cf-body)', fontWeight: 700 }}>
                          STANDARD LISTING FEE
                        </span>
                        <h2 style={{ margin: '4px 0 0', color: 'var(--cf-navy)', fontSize: 27 }}>
                          MK 200
                        </h2>
                        <small style={{ color: 'var(--cf-body)' }}>
                          Active for {LISTING_DAYS} days · Free with referral credits
                        </small>
                      </div>
                      <div style={{
                        width: 46, height: 46, borderRadius: 13,
                        background: '#E8F0FF', color: 'var(--cf-blue)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <Smartphone size={23} />
                      </div>
                    </div>

                    {paymentStatus === 'pending' ? (
                      <div style={{
                        background: '#fff', border: '1px solid var(--cf-line)',
                        borderRadius: 12, padding: 16, textAlign: 'center',
                      }}>
                        <LoaderCircle size={30} color="#2563EB" className="cf-spin" />
                        <h4 style={{ margin: '10px 0 6px', color: 'var(--cf-navy)' }}>Checking payment status</h4>
                        <p style={{ fontSize: 13, color: 'var(--cf-body)', lineHeight: 1.6 }}>
                          Check your phone for the PayChangu prompt and enter your mobile-money PIN to authorise payment.
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--cf-subtle)', marginTop: 12, overflowWrap: 'anywhere' }}>
                          Reference: {chargeId}
                        </p>
                        <button
                          type="button"
                          className="cf-post-submit"
                          onClick={manuallyCheckPayment}
                          disabled={paymentBusy}
                          style={{ marginTop: 12 }}
                        >
                          {paymentBusy ? (<><LoaderCircle size={17} className="cf-spin" />Checking...</>) : (<><RefreshCw size={17} />Check payment status</>)}
                        </button>
                        <button
                          type="button"
                          onClick={cancelPayment}
                          disabled={paymentBusy}
                          style={{
                            display: 'block', width: '100%', marginTop: 10,
                            padding: 10, border: 0, background: 'transparent',
                            color: 'var(--cf-subtle)', fontSize: 12, fontWeight: 600,
                            cursor: paymentBusy ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Cancel and start a new payment
                        </button>
                        {paymentError && <p className="cf-post-error" role="alert">{paymentError}</p>}
                      </div>
                    ) : paymentStatus === 'failed' ? (
                      <div style={{
                        background: '#fff', border: '1px solid #F0D9A5',
                        borderRadius: 12, padding: 16, textAlign: 'center',
                      }}>
                        <Clock3 size={30} color="#D28A00" />
                        <h4 style={{ margin: '10px 0 6px', color: 'var(--cf-navy)' }}>Payment not successful</h4>
                        <p style={{ fontSize: 13, color: 'var(--cf-body)', margin: 0, lineHeight: 1.6 }}>{paymentError}</p>
                        <button
                          type="button"
                          className="cf-post-submit"
                          onClick={handleRetryPayment}
                          disabled={paymentBusy || !phone.trim()}
                          style={{ marginTop: 14 }}
                        >
                          {paymentBusy ? 'Connecting...' : 'Try payment again'}
                        </button>
                      </div>
                    ) : credits > 0 ? (
                      <>
                        <p style={{ fontSize: 14, color: 'var(--cf-body)', lineHeight: 1.6, margin: '0 0 12px' }}>
                          You have <strong>{credits} free listing {credits === 1 ? 'credit' : 'credits'}</strong>.
                          Publishing uses one. No payment and no phone number needed.
                        </p>
                        {paymentError && <p className="cf-post-error" role="alert">{paymentError}</p>}
                        <button
                          type="button"
                          className="cf-post-submit"
                          onClick={() => startPayment({ useCredit: true })}
                          disabled={paymentBusy}
                        >
                          {paymentBusy ? (
                            <><LoaderCircle className="cf-spin" size={17} />Publishing...</>
                          ) : (
                            <>Publish free with 1 credit <ArrowRight size={17} /></>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="cf-field">
                          <span>Mobile-money provider</span>
                          <div className="cf-select-wrap">
                            <select
                              value={operator}
                              onChange={e => setOperator(e.target.value)}
                              disabled={paymentBusy}
                            >
                              {OPERATORS.map(item => (
                                <option value={item.value} key={item.value}>{item.label}</option>
                              ))}
                            </select>
                            <ChevronDown size={16} />
                          </div>
                        </label>

                        <label className="cf-field">
                          <span><Smartphone size={15} /> Mobile-money phone number</span>
                          <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="e.g. 0991234567"
                            disabled={paymentBusy}
                          />
                        </label>

                        {paymentError && <p className="cf-post-error" role="alert">{paymentError}</p>}

                        <button
                          type="button"
                          className="cf-post-submit"
                          onClick={handleRetryPayment}
                          disabled={paymentBusy || !phone.trim()}
                        >
                          {paymentBusy ? (
                            <><LoaderCircle className="cf-spin" size={17} />Connecting to PayChangu...</>
                          ) : (
                            <>Pay MK 200 <ArrowRight size={17} /></>
                          )}
                        </button>
                      </>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      marginTop: 13,
                      color: 'var(--cf-body)',
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}>
                      <ShieldCheck size={16} color="#15803D" style={{ flexShrink: 0 }} />
                      <span>
                        Your PIN is entered privately on your phone. CampusFlip never asks for or stores
                        your mobile-money PIN. Your listing goes live only after payment verification.
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 18 }}>
                  <h4 style={{ marginBottom: 6 }}>
                    Add photos <span style={{ fontWeight: 400 }}>(optional)</span>
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--cf-body)' }}>
                    Photos help buyers understand what you are offering. You can skip this step and add them later.
                  </p>
                  <ListingImageUploader
                    listingId={createdListing.id}
                    onUploaded={() => setPhotosUploaded(true)}
                  />
                </div>

                {photosUploaded && (
                  <p style={{ color: 'var(--cf-success)', fontSize: 13, textAlign: 'center' }}>
                    <CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                    Photos uploaded successfully.
                  </p>
                )}

                {isPaid ? (
                  <button type="button" className="cf-post-submit" onClick={finish}>
                    Done <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={finish}
                    style={{
                      display: 'block', width: '100%', marginTop: 12,
                      padding: 12, border: 'none', background: 'transparent',
                      color: 'var(--cf-body)', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Finish later
                  </button>
                )}
              </div>
            ) : (
              <form className="cf-post-form" onSubmit={submit}>
                {/* Fee shown up front, before the seller fills anything in */}
                <div className={kind === 'sale' ? 'cf-fee-banner' : 'cf-fee-banner cf-fee-banner-free'} role="note">
                  {kind === 'sale' ? (
                    <>
                      {credits > 0 ? (
                        <><strong>Free</strong> · uses 1 of your {credits} free listing {credits === 1 ? 'credit' : 'credits'} · live for {LISTING_DAYS} days</>
                      ) : (
                        <><strong>MK 200</strong> to publish · live for {LISTING_DAYS} days · free with referral credits</>
                      )}
                    </>
                  ) : (
                    <>
                      <strong>Free</strong> to post · no listing fee for Wanted, Free and Lost &amp; Found
                    </>
                  )}
                </div>
                {/* Live preview card */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                    color: 'var(--cf-subtle)',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <Eye size={12} /> HOW IT WILL LOOK
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    borderRadius: 16,
                    background: 'linear-gradient(145deg, #F8FBFF 0%, #EFF5FF 100%)',
                    border: '1px solid var(--cf-line)',
                    minHeight: 80,
                  }}>
                    <div style={{
                      width: 68, height: 68, flexShrink: 0,
                      borderRadius: 12,
                      background: 'var(--cf-surface-2)',
                      display: 'grid', placeItems: 'center',
                      overflow: 'hidden',
                    }}>
                      <ShoppingBag size={22} color="#9AACC8" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 700,
                        color: title ? 'var(--cf-navy)' : 'var(--cf-subtle)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.3,
                        minHeight: 34,
                      }}>
                        {title || 'Your listing title'}
                      </h4>
                      <div style={{
                        marginTop: 'auto',
                        fontSize: 12,
                        color: 'var(--cf-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <MapPin size={9} />
                        {selectedSpot?.name || 'Meeting spot'}
                      </div>
                      {kind === 'sale' && (
                        <b style={{
                          marginTop: 4,
                          fontSize: 15,
                          color: 'var(--cf-blue)',
                        }}>
                          {price ? `MK ${Number(price).toLocaleString()}` : 'MK —'}
                        </b>
                      )}
                      {kind !== 'sale' && (
                        <b style={{ marginTop: 4, fontSize: 13, color: 'var(--cf-success)' }}>
                          {TYPES.find(t => t.value === kind)?.label}
                        </b>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post type */}
                <div className="cf-post-types" aria-label="Post type">
                  {TYPES.map(type => (
                    <button
                      type="button"
                      key={type.value}
                      className={kind === type.value ? 'selected' : ''}
                      onClick={() => setKind(type.value)}
                    >
                      <b>{type.label}</b>
                      <small>{type.description}</small>
                    </button>
                  ))}
                </div>

                <label className="cf-field">
                  <span><Tag size={15} /> Listing title</span>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={90}
                    placeholder="e.g. HP laptop, barely used"
                    required
                  />
                </label>

                <label className="cf-field">
                  <span><FileText size={15} /> Description</span>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={1500}
                    rows={4}
                    placeholder="Describe the condition, details, or what you are looking for..."
                    required
                  />
                </label>

                <div className="cf-post-two-col">
                  <label className="cf-field">
                    <span>Category</span>
                    <div className="cf-select-wrap">
                      <select
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                        required
                      >
                        <option value="">Choose category</option>
                        {categories.map(category => (
                          <option value={category.id} key={category.id}>{category.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} />
                    </div>
                  </label>

                  {kind === 'sale' && (
                    <label className="cf-field">
                      <span>Price (MWK)</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder={priceHint ? priceHint.replace('MK ', '') : 'e.g. 45000'}
                        required
                      />
                    </label>
                  )}
                </div>

                {priceHint && kind === 'sale' && (
                  <p className="cf-field-hint" style={{ marginTop: -12, marginBottom: 14 }}>
                    Typical for {selectedCategory?.name}: <b>{priceHint}</b>
                  </p>
                )}

                <label className="cf-field">
                  <span><MapPin size={15} /> Safe meeting spot</span>
                  <div className="cf-select-wrap">
                    <select
                      value={meetingSpotId}
                      onChange={e => setMeetingSpotId(e.target.value)}
                      required
                    >
                      <option value="">Choose a campus meeting spot</option>
                      {spots.map(spot => (
                        <option value={spot.id} key={spot.id}>{spot.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                  {spots.length === 0 && (
                    <small className="cf-field-hint">No active meeting spots are configured yet.</small>
                  )}
                  {meetingSpotId && (
                    <small className="cf-field-hint">
                      Buyers see this spot with a directions link when they tap it.
                    </small>
                  )}
                </label>

                <div className="cf-form-photos">
                  <ListingImageUploader ref={photoRef} deferred />
                </div>

                <WhatsAppPrompt session={session} onSaved={() => setError('')} />

                {error && <p className="cf-post-error" role="alert">{error}</p>}

                <button
                  className="cf-post-submit"
                  type="submit"
                  disabled={busy || !categories.length || !spots.length}
                >
                  {busy ? (
                    <><LoaderCircle className="cf-spin" size={17} />Posting...</>
                  ) : kind === 'sale' ? (
                    credits > 0
                      ? <>Post listing free <ArrowRight size={17} /></>
                      : <>Continue to payment <ArrowRight size={17} /></>
                  ) : (
                    <>Create post <ArrowRight size={17} /></>
                  )}
                </button>

                {kind === 'sale' ? (
                  <p className="cf-post-note">
                    {credits > 0
                      ? 'This post is published with a free credit. You can add photos right after.'
                      : 'Sale posts require a one-time MK 200 publication payment (free if you have referral credits).'}
                    {credits > 0 ? '' : ' Your listing will remain pending until payment is confirmed.'}
                  </p>
                ) : (
                  <p className="cf-post-note">
                    Wanted, Free, and Lost & Found posts are published without a listing fee.
                  </p>
                )}
              </form>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}