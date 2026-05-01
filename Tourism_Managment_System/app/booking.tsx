import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../src/config';

const API_URL = API_BASE;
const TRAVEL_STYLES = ['Relax', 'Adventure', 'Family', 'Luxury', 'Work'] as const;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const ROOM_ADULT_CAPACITY = 2;
const ROOM_CHILD_CAPACITY = 2;
const DEFAULT_ADULTS = '2';
const DEFAULT_CHILDREN = '0';
const formatPrice = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type DateField = 'checkInDate' | 'checkOutDate';

type Hotel = {
  _id: string;
  name: string;
  location: string;
  accommodationType: string;
  pricePerNight: number;
  availableRooms: number;
  rating?: number;
};

type Transportation = {
  _id: string;
  vehicleType: string;
  brandModel?: string;
  capacity: number;
  price: number;
};



const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

const parseDateString = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatDateForDisplay = (value: string) => {
  const parsed = parseDateString(value);
  if (!parsed) {
    return 'Select date';
  }

  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getCalendarDays = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = firstDayOfMonth.getDay();
  const calendarDays: (Date | null)[] = [];

  for (let i = 0; i < leadingEmptyDays; i += 1) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push(new Date(year, month, day));
  }

  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  return calendarDays;
};

export default function BookingScreen() {
  const router = useRouter();
  const { hotelId, tourPackId, transportId } = useLocalSearchParams<{
    hotelId?: string;
    tourPackId?: string;
    transportId?: string
  }>();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [tourPack, setTourPack] = useState<any | null>(null);
  const [vehicles, setVehicles] = useState<Transportation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    type: 'error' | 'success';
    title: string;
    message: string;
  } | null>(null);
  const [selectedTransport, setSelectedTransport] = useState(transportId ?? '');
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfDay(new Date()));
  const today = useMemo(() => startOfDay(new Date()), []);

  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phone: '',
    destination: '',
    checkInDate: '',
    checkOutDate: '',
    adults: DEFAULT_ADULTS,
    children: DEFAULT_CHILDREN,
    travelStyle: 'Relax',
    specialRequests: '',
  });

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (hotelId) {
      router.push({
        pathname: '/hotel-details',
        params: {
          id: hotelId,
          ...(transportId ? { transportId } : {}),
          ...(tourPackId ? { tourPackId } : {}),
        },
      });
      return;
    }

    if (tourPackId) {
      router.push(`/my-tourpacks/${tourPackId}`);
      return;
    }

    router.push('/explore');
  }, [hotelId, tourPackId, router, transportId]);

  const fetchBookingSetup = useCallback(async () => {
    try {
      const fetchTasks = [fetch(`${API_URL}/api/transportation`)];
      if (hotelId) fetchTasks.push(fetch(`${API_URL}/api/hotels/${hotelId}`));
      if (tourPackId) fetchTasks.push(fetch(`${API_URL}/api/tourpacks/${tourPackId}`));

      const responses = await Promise.all(fetchTasks);
      const vehiclesData = await responses[0].json();
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);

      let responseIdx = 1;
      if (hotelId) {
        const hotelResponse = responses[responseIdx++];
        const hotelData = await hotelResponse.json();
        if (hotelResponse.ok) {
          setHotel(hotelData);
          setFormData((prev) => ({ ...prev, destination: hotelData.location || prev.destination }));
        }
      }

      if (tourPackId) {
        const tourResponse = responses[responseIdx++];
        const tourData = await tourResponse.json();
        if (tourResponse.ok && tourData.success) {
          setTourPack(tourData.data);
          setFormData((prev) => ({ ...prev, destination: tourData.data?.destination || prev.destination }));
        }
      }
    } catch {
      Alert.alert('Connection Error', 'Could not load booking setup.');
      handleBack();
    } finally {
      setLoading(false);
    }
  }, [handleBack, hotelId, tourPackId]);

  useEffect(() => {
    if (hotelId || tourPackId) {
      fetchBookingSetup();
    }
  }, [hotelId, tourPackId, fetchBookingSetup]);

  useEffect(() => {
    setSelectedTransport(transportId ?? '');
  }, [transportId]);

  const checkInDateValue = parseDateString(formData.checkInDate);
  const checkOutDateValue = parseDateString(formData.checkOutDate);
  const selectedVehicle = vehicles.find((vehicle) => vehicle._id === selectedTransport);

  const bookingPreview = useMemo(() => {
    if (!hotel && !tourPack) {
      return {
        adults: 0,
        children: 0,
        guests: 0,
        rooms: 0,
        nights: 0,
        stayAmount: 0,
        packageAmount: 0,
        transportAmount: 0,
        serviceFee: 0,
        total: 0,
      };
    }

    const start = parseDateString(formData.checkInDate);
    const end = parseDateString(formData.checkOutDate);
    const rawNights = start && end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const nights = Number.isFinite(rawNights) && rawNights > 0 ? rawNights : 0;

    const adults = Math.max(Number(formData.adults) || 0, 0);
    const children = Math.max(Number(formData.children) || 0, 0);
    const guests = adults + children;
    const rooms = hotel ? (adults > 0 ? Math.max(Math.ceil(adults / ROOM_ADULT_CAPACITY), Math.ceil(children / ROOM_CHILD_CAPACITY), 1) : 0) : 0;

    const stayAmount = hotel ? nights * rooms * hotel.pricePerNight : 0;
    const packageAmount = tourPack ? tourPack.price * guests : 0;
    const transportAmount = selectedVehicle?.price || 0;
    const serviceFee = Math.round((stayAmount + packageAmount) * 0.08);
    const total = stayAmount + packageAmount + transportAmount + serviceFee;

    return {
      adults,
      children,
      guests,
      rooms,
      nights,
      stayAmount,
      packageAmount,
      transportAmount,
      serviceFee,
      total,
    };
  }, [formData.adults, formData.checkInDate, formData.checkOutDate, formData.children, hotel, tourPack, selectedVehicle]);

  const updateField = (field: string, value: string) => {
    setSubmitMessage(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updatePartyCount = (field: 'adults' | 'children', delta: number) => {
    setSubmitMessage(null);
    setFormData((prev) => {
      const current = Number(prev[field]) || 0;
      const minimum = field === 'adults' ? 1 : 0;
      const next = Math.max(current + delta, minimum);
      return { ...prev, [field]: String(next) };
    });
  };

  const showFeedback = useCallback(
    (type: 'error' | 'success', title: string, message: string) => {
      setSubmitMessage({ type, text: `${title}: ${message}` });
      setFeedbackModal({ type, title, message });
    },
    []
  );

  const getMinimumSelectableDate = useCallback(
    (field: DateField) => {
      if (field === 'checkOutDate' && checkInDateValue) {
        return addDays(checkInDateValue, 1);
      }

      return today;
    },
    [checkInDateValue, today]
  );

  const openDatePicker = (field: DateField) => {
    const selectedDate =
      (field === 'checkInDate' ? checkInDateValue : checkOutDateValue) ??
      (field === 'checkOutDate' && checkInDateValue ? addDays(checkInDateValue, 1) : today);

    setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setActiveDateField(field);
  };

  const handleDateSelection = (date: Date) => {
    if (!activeDateField) {
      return;
    }

    setSubmitMessage(null);
    const normalizedDate = startOfDay(date);
    const minimumDate = getMinimumSelectableDate(activeDateField);
    if (normalizedDate < minimumDate) {
      return;
    }

    const nextValue = formatDateForApi(normalizedDate);
    setFormData((prev) => {
      const nextForm = { ...prev, [activeDateField]: nextValue };

      if (activeDateField === 'checkInDate') {
        const existingCheckOut = parseDateString(prev.checkOutDate);
        if (existingCheckOut && existingCheckOut <= normalizedDate) {
          nextForm.checkOutDate = '';
        }
      }

      return nextForm;
    });
    setActiveDateField(null);
  };

  const handleBooking = async () => {
    Keyboard.dismiss();
    setSubmitMessage(null);

    if (!hotel && !tourPack) {
      showFeedback('error', 'Booking Unavailable', 'Details are still loading. Please try again.');
      return;
    }

    const guestName = formData.guestName.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();
    const destination = formData.destination.trim();
    const adults = Number.parseInt(formData.adults, 10);
    const children = Number.parseInt(formData.children, 10);
    const guests = bookingPreview.guests;

    const requiredFields = [
      guestName,
      email,
      phone,
      destination,
      formData.adults.trim(),
      formData.children.trim(),
    ];

    if (hotel) {
      requiredFields.push(formData.checkInDate.trim());
      requiredFields.push(formData.checkOutDate.trim());
    }

    if (requiredFields.some((value) => !value)) {
      showFeedback('error', 'Missing Information', 'Fill in all required booking details.');
      return;
    }

    if (hotel && bookingPreview.nights < 1) {
      showFeedback('error', 'Invalid Dates', 'Check-out date must be after check-in date.');
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      showFeedback('error', 'Invalid Email', 'Enter a valid email address.');
      return;
    }

    if (!PHONE_REGEX.test(phone)) {
      showFeedback('error', 'Invalid Phone', 'Enter a valid phone number.');
      return;
    }

    if (!Number.isInteger(adults) || adults < 1) {
      showFeedback('error', 'Invalid Party Size', 'At least one adult is required for the booking.');
      return;
    }

    if (!Number.isInteger(children) || children < 0) {
      showFeedback('error', 'Invalid Party Size', 'Children must be 0 or more.');
      return;
    }

    if (hotel) {
      const rooms = bookingPreview.rooms;
      if (rooms < 1) {
        showFeedback('error', 'Invalid Stay Details', 'Could not calculate a valid room count.');
        return;
      }
      if (hotel.availableRooms < 1) {
        showFeedback('error', 'Availability Issue', 'This hotel currently has no rooms available.');
        return;
      }
      if (rooms > hotel.availableRooms) {
        showFeedback('error', 'Availability Issue', 'Requested rooms exceed current availability.');
        return;
      }
    }

    if (selectedVehicle && guests > selectedVehicle.capacity) {
      showFeedback('error', 'Transport Capacity', 'Selected transport cannot accommodate all guests.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          hotel: hotelId || null,
          tourPack: tourPackId || null,
          transportation: selectedTransport || null,
          itineraryNotes: [
            hotelId
              ? `Stay at ${hotel?.name} for ${bookingPreview.nights} nights`
              : `Tour Package: ${tourPack?.name}`,
            selectedVehicle
              ? `Transfer via ${selectedVehicle.brandModel || selectedVehicle.vehicleType}`
              : 'No transfer selected',
          ],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        router.push({
          pathname: '/receipt',
          params: { bookingId: data._id },
        });
      } else {
        showFeedback('error', 'Booking Failed', data.message || 'Could not create booking.');
      }
    } catch {
      showFeedback('error', 'Connection Error', 'Could not connect to the booking service.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#003580" />
      </SafeAreaView>
    );
  }

  if (!hotel && !tourPack) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Craft Your Booking</Text>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="home-outline" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Signature Stay</Text>
            <Text style={styles.heroTitle}>{hotel ? hotel.name : tourPack?.name}</Text>
            <Text style={styles.heroMeta}>
              {hotel
                ? `${hotel.location} | ${hotel.accommodationType}`
                : `${tourPack?.destination} | Tour Package`}
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {hotel ? formatPrice(hotel.pricePerNight) : formatPrice(tourPack?.price || 0)}
                </Text>
                <Text style={styles.heroStatLabel}>
                  {hotel ? 'per night' : 'per person'}
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {hotel ? hotel.availableRooms : tourPack?.duration || 'N/A'}
                </Text>
                <Text style={styles.heroStatLabel}>
                  {hotel ? 'rooms left' : 'duration'}
                </Text>
              </View>
            </View>
          </View>

          {submitMessage ? (
            <View
              style={[
                styles.statusBanner,
                submitMessage.type === 'error' ? styles.statusBannerError : styles.statusBannerSuccess,
              ]}
            >
              <Text
                style={[
                  styles.statusBannerText,
                  submitMessage.type === 'error' ? styles.statusBannerErrorText : styles.statusBannerSuccessText,
                ]}
              >
                {submitMessage.text}
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guest Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Guest name"
              value={formData.guestName}
              onChangeText={(text) => updateField('guestName', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => updateField('phone', text)}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Setup</Text>
            <TextInput
              style={styles.input}
              placeholder="Destination"
              value={formData.destination}
              onChangeText={(text) => updateField('destination', text)}
            />

            {hotel && (
              <>
                <Text style={styles.subLabel}>Stay dates</Text>
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.dateField, styles.halfInput]} onPress={() => openDatePicker('checkInDate')}>
                    <View>
                      <Text style={styles.dateFieldLabel}>Check-in</Text>
                      <Text style={[styles.dateFieldValue, !formData.checkInDate && styles.dateFieldPlaceholder]}>
                        {formatDateForDisplay(formData.checkInDate)}
                      </Text>
                    </View>
                    <Ionicons name="calendar-outline" size={20} color="#003580" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dateField, styles.halfInput]}
                    onPress={() => openDatePicker('checkOutDate')}
                  >
                    <View>
                      <Text style={styles.dateFieldLabel}>Check-out</Text>
                      <Text style={[styles.dateFieldValue, !formData.checkOutDate && styles.dateFieldPlaceholder]}>
                        {formatDateForDisplay(formData.checkOutDate)}
                      </Text>
                    </View>
                    <Ionicons name="calendar-outline" size={20} color="#003580" />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.subLabel}>Guests</Text>
            <View style={styles.row}>
              <View style={[styles.counterCard, styles.halfInput]}>
                <View>
                  <Text style={styles.counterLabel}>Adults</Text>
                  <Text style={styles.counterHint}>2 adults per room</Text>
                </View>
                <View style={styles.counterActions}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => updatePartyCount('adults', -1)}
                  >
                    <Ionicons name="remove" size={18} color="#0F172A" />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{formData.adults}</Text>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => updatePartyCount('adults', 1)}
                  >
                    <Ionicons name="add" size={18} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.counterCard, styles.halfInput]}>
                <View>
                  <Text style={styles.counterLabel}>Children</Text>
                  <Text style={styles.counterHint}>Up to 2 per room</Text>
                </View>
                <View style={styles.counterActions}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => updatePartyCount('children', -1)}
                  >
                    <Ionicons name="remove" size={18} color="#0F172A" />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{formData.children}</Text>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => updatePartyCount('children', 1)}
                  >
                    <Ionicons name="add" size={18} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.subLabel}>Travel style</Text>
            <View style={styles.chipRow}>
              {TRAVEL_STYLES.map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[styles.chip, formData.travelStyle === style && styles.chipActive]}
                  onPress={() => updateField('travelStyle', style)}
                >
                  <Text style={[styles.chipText, formData.travelStyle === style && styles.chipTextActive]}>
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requests</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Room preference, late arrival notes, occasion details..."
              multiline
              numberOfLines={4}
              value={formData.specialRequests}
              onChangeText={(text) => updateField('specialRequests', text)}
            />
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
            <Text style={styles.summaryHint}>
              {hotel && tourPack
                ? (bookingPreview.nights > 0
                  ? `${bookingPreview.adults} adult(s), ${bookingPreview.children} child(ren), ${bookingPreview.rooms} room(s) + ${tourPack.name}`
                  : `Select dates for ${hotel.name} | ${tourPack.name} included`)
                : hotel
                  ? (bookingPreview.nights > 0
                    ? `${bookingPreview.adults} adult(s), ${bookingPreview.children} child(ren), ${bookingPreview.rooms} room(s)`
                    : 'Select check-in and check-out to calculate the total')
                  : tourPack
                    ? `${tourPack.name} for ${bookingPreview.adults} adult(s), ${bookingPreview.children} child(ren)`
                    : 'Select your trip details'}
            </Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Party size</Text>
              <Text style={styles.summaryValue}>{bookingPreview.guests} guest(s)</Text>
            </View>
            {hotel && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Rooms required</Text>
                  <Text style={styles.summaryValue}>{bookingPreview.rooms}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Nights</Text>
                  <Text style={styles.summaryValue}>{bookingPreview.nights}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Stay</Text>
                  <Text style={styles.summaryValue}>{formatPrice(bookingPreview.stayAmount)}</Text>
                </View>
              </>
            )}
            {tourPack && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Package</Text>
                <Text style={styles.summaryValue}>{formatPrice(bookingPreview.packageAmount)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Transport</Text>
              <Text style={styles.summaryValue}>{formatPrice(bookingPreview.transportAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service fee</Text>
              <Text style={styles.summaryValue}>{formatPrice(bookingPreview.serviceFee)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{formatPrice(bookingPreview.total)}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, saving && styles.buttonDisabled]}
          onPress={handleBooking}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmButtonText}>Confirm Booking</Text>}
        </TouchableOpacity>
      </View>

      <Modal
        visible={Boolean(activeDateField)}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDateField(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <View>
                <Text style={styles.calendarTitle}>
                  {activeDateField === 'checkInDate' ? 'Select check-in' : 'Select check-out'}
                </Text>
                <Text style={styles.calendarSubtitle}>
                  {activeDateField === 'checkOutDate' && checkInDateValue
                    ? `Must be after ${formatDateForDisplay(formData.checkInDate)}`
                    : 'Choose your stay date'}
                </Text>
              </View>
              <TouchableOpacity style={styles.calendarCloseButton} onPress={() => setActiveDateField(null)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarMonthRow}>
              <TouchableOpacity
                style={styles.calendarArrow}
                onPress={() => setCalendarMonth((prev) => addMonths(prev, -1))}
              >
                <Ionicons name="chevron-back" size={18} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthText}>
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                style={styles.calendarArrow}
                onPress={() => setCalendarMonth((prev) => addMonths(prev, 1))}
              >
                <Ionicons name="chevron-forward" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarWeekRow}>
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={styles.calendarWeekday}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {getCalendarDays(calendarMonth).map((day, index) => {
                if (!day) {
                  return <View key={`empty-${index}`} style={styles.calendarDayCell} />;
                }

                const minimumDate = getMinimumSelectableDate(activeDateField ?? 'checkInDate');
                const disabled = day < minimumDate;
                const isSelected =
                  (activeDateField === 'checkInDate' && checkInDateValue && isSameDay(day, checkInDateValue)) ||
                  (activeDateField === 'checkOutDate' && checkOutDateValue && isSameDay(day, checkOutDateValue));
                const isToday = isSameDay(day, today);

                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    style={[
                      styles.calendarDayCell,
                      styles.calendarDayButton,
                      isSelected && styles.calendarDaySelected,
                    ]}
                    onPress={() => handleDateSelection(day)}
                    disabled={disabled}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        disabled && styles.calendarDayDisabled,
                        isSelected && styles.calendarDaySelectedText,
                        isToday && !isSelected && styles.calendarDayToday,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>



      <Modal
        visible={Boolean(feedbackModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.feedbackModal}>
            <View
              style={[
                styles.feedbackIconWrap,
                feedbackModal?.type === 'error' ? styles.feedbackIconError : styles.feedbackIconSuccess,
              ]}
            >
              <Ionicons
                name={feedbackModal?.type === 'error' ? 'close-outline' : 'checkmark-outline'}
                size={28}
                color={feedbackModal?.type === 'error' ? '#991B1B' : '#065F46'}
              />
            </View>
            <Text style={styles.feedbackTitle}>{feedbackModal?.title}</Text>
            <Text style={styles.feedbackMessage}>{feedbackModal?.message}</Text>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                feedbackModal?.type === 'error' ? styles.feedbackButtonError : styles.feedbackButtonSuccess,
              ]}
              onPress={() => setFeedbackModal(null)}
            >
              <Text style={styles.feedbackButtonText}>
                {feedbackModal?.type === 'error' ? 'Try Again' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F6FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerSpacer: { width: 42 },
  content: { padding: 20, paddingBottom: 120, gap: 18 },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
  },
  heroEyebrow: { color: '#93C5FD', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  heroMeta: { color: '#CBD5E1', fontSize: 15, marginBottom: 18 },
  heroStats: { flexDirection: 'row', gap: 12 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 },
  heroStatValue: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  heroStatLabel: { color: '#CBD5E1', fontSize: 12, marginTop: 4 },
  statusBanner: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  statusBannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  statusBannerErrorText: {
    color: '#991B1B',
  },
  statusBannerSuccessText: {
    color: '#065F46',
  },
  section: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  counterCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  counterLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  counterHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  counterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 24,
    textAlign: 'center',
  },
  dateField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  dateFieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: 120,
  },
  dateFieldPlaceholder: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  chipActive: { backgroundColor: '#003580' },
  chipText: { color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  transportCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  transportCardActive: {
    borderColor: '#003580',
    backgroundColor: '#EAF2FF',
  },
  transportHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  transportTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1 },
  transportMeta: { fontSize: 14, color: '#64748B', marginTop: 4 },
  transportPrice: { fontSize: 15, fontWeight: '700', color: '#003580' },
  textArea: {
    minHeight: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  summaryCard: { backgroundColor: '#FFF7ED', borderRadius: 18, padding: 18, gap: 12 },
  summaryHint: {
    fontSize: 13,
    color: '#9A3412',
    lineHeight: 19,
    marginTop: -2,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 15, color: '#7C2D12' },
  summaryValue: { fontSize: 15, color: '#431407', fontWeight: '600' },
  summaryTotalRow: { borderTopWidth: 1, borderTopColor: '#FDBA74', paddingTop: 12, marginTop: 2 },
  summaryTotalLabel: { fontSize: 17, color: '#7C2D12', fontWeight: '700' },
  summaryTotalValue: { fontSize: 20, color: '#9A3412', fontWeight: '800' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#003580',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  buttonDisabled: { opacity: 0.75 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  calendarModal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
  },
  feedbackModal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  feedbackIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackIconError: {
    backgroundColor: '#FEE2E2',
  },
  feedbackIconSuccess: {
    backgroundColor: '#D1FAE5',
  },
  feedbackTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  feedbackMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
  },
  feedbackButton: {
    minWidth: 160,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 4,
  },
  feedbackButtonError: {
    backgroundColor: '#B91C1C',
  },
  feedbackButtonSuccess: {
    backgroundColor: '#047857',
  },
  feedbackButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 12,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  calendarSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  calendarCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  calendarDayButton: {
    height: 42,
  },
  calendarDayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  calendarDayDisabled: {
    color: '#CBD5E1',
  },
  calendarDaySelected: {
    backgroundColor: '#003580',
    borderRadius: 12,
  },
  calendarDaySelectedText: {
    color: '#FFF',
  },
  calendarDayToday: {
    color: '#003580',
  },
});
