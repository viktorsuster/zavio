import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import Slider from '@react-native-community/slider';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/Button';
import { Court, Booking } from '../types';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/AppNavigator';
import { apiService, Field } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { colors } from '../constants/colors';

// Konfigurácia lokalizácie pre kalendár
LocaleConfig.locales['sk'] = {
  monthNames: [
    'Január',
    'Február',
    'Marec',
    'Apríl',
    'Máj',
    'Jún',
    'Júl',
    'August',
    'September',
    'Október',
    'November',
    'December'
  ],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
  dayNames: ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'],
  dayNamesShort: ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'],
  today: 'Dnes'
};
LocaleConfig.defaultLocale = 'sk';

type BookingScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Booking'>;

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const getEndTime = (startTime: string, durationMinutes: number): string => {
  const startMins = timeToMinutes(startTime);
  return minutesToTime(startMins + durationMinutes);
};

// Map API Field type to Court type
const mapFieldToCourt = (field: Field): Court => {
  const typeMap: Record<string, Court['type']> = {
    'Tenis': 'tennis',
    'Padel': 'padel',
    'Futbal': 'football',
    'Basketbal': 'basketball'
  };

  return {
    id: field.id.toString(),
    name: field.name,
    type: typeMap[field.type] || 'tennis',
    pricePerHour: field.pricePerSlot,
    image: field.imageUrl || 'https://picsum.photos/800/400?random=' + field.id,
    location: field.location
  };
};

export default function BookingScreen() {
  const navigation = useNavigation<BookingScreenNavigationProp>();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [isPullRefreshingFields, setIsPullRefreshingFields] = useState(false);

  // Fetch fields from API
  const { data: fieldsData, isLoading: isLoadingFields, isFetching: isFetchingFields, error: fieldsError, refetch: refetchFields, isRefetching: isRefetchingFields } = useQuery({
    queryKey: ['fields'],
    queryFn: () => {
      console.log('[BookingScreen] Fetching fields from API...');
      return apiService.getFields();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  console.log('[BookingScreen] Fields state:', {
    isLoadingFields,
    isFetchingFields,
    isRefetchingFields,
    hasData: !!fieldsData,
    fieldsCount: fieldsData?.fields?.length || 0,
    error: fieldsError?.message
  });

  const courts = useMemo(() => {
    if (!fieldsData?.fields) return [];
    return fieldsData.fields.map(mapFieldToCourt);
  }, [fieldsData]);

  const handlePullToRefreshFields = async () => {
    setIsPullRefreshingFields(true);
    try {
      const minVisibleMs = 600;
      const start = Date.now();
      await refetchFields();
      const elapsed = Date.now() - start;
      if (elapsed < minVisibleMs) {
        await new Promise((r) => setTimeout(r, minVisibleMs - elapsed));
      }
    } finally {
      setIsPullRefreshingFields(false);
    }
  };
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [duration, setDuration] = useState<number>(60);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const { user, updateCredits } = useUser();
  const queryClient = useQueryClient();

  // Fetch availability from API
  const { data: availabilityData, isLoading: isLoadingAvailability } = useQuery({
    queryKey: ['availability', selectedCourt?.id, selectedDate, duration],
    queryFn: () => {
      if (!selectedCourt) throw new Error('No court selected');
      return apiService.getAvailability(
        parseInt(selectedCourt.id),
        selectedDate,
        duration
      );
    },
    enabled: !!selectedCourt && !!selectedDate && !!duration && step === 2,
    staleTime: 30 * 1000, // 30 seconds
  });

  const availableStartTimes = useMemo(() => {
    if (!availabilityData?.availableSlots) return [];
    return availabilityData.availableSlots.map(slot => slot.startTime);
  }, [availabilityData]);

  // Auto-select first available time when times change (only on step 2)
  useEffect(() => {
    if (step === 2 && availableStartTimes.length > 0) {
      if (!selectedTime || !availableStartTimes.includes(selectedTime)) {
        setSelectedTime(availableStartTimes[0]);
      }
    } else if (step === 2 && availableStartTimes.length === 0) {
      setSelectedTime(null);
    }
  }, [availableStartTimes, step]);

  // Find longest available slot for selected date (using API)
  const { data: longestSlotData } = useQuery({
    queryKey: ['longestSlot', selectedCourt?.id, selectedDate],
    queryFn: async () => {
      if (!selectedCourt) return null;
      
      // Try shorter durations
      const shorterDurations = [duration - 15, duration - 30, duration - 45, 120, 90, 60, 45, 30, 15].filter(
        (d) => d >= 15 && d < duration
      );

      for (const shorterDuration of shorterDurations) {
        try {
          const data = await apiService.getAvailability(
            parseInt(selectedCourt.id),
            selectedDate,
            shorterDuration
          );
          if (data.availableSlots.length > 0) {
            // Find the longest slot
            let longestSlot = data.availableSlots[0];
            for (const slot of data.availableSlots) {
              const slotDuration = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
              const longestDuration = timeToMinutes(longestSlot.endTime) - timeToMinutes(longestSlot.startTime);
              if (slotDuration > longestDuration) {
                longestSlot = slot;
              }
            }
            return {
              date: selectedDate,
              time: longestSlot.startTime,
              duration: timeToMinutes(longestSlot.endTime) - timeToMinutes(longestSlot.startTime)
            };
          }
        } catch (error) {
          continue;
        }
      }
      return null;
    },
    enabled: !!selectedCourt && !!selectedDate && step === 2 && availableStartTimes.length === 0,
  });

  const findLongestSlotForSelectedDate = longestSlotData;

  // Find nearest available time - simplified (would need multiple API calls for full implementation)
  const findNearestAvailableTime = null;

  // Get selected slot price from API data
  const selectedSlot = useMemo(() => {
    if (!availabilityData?.availableSlots || !selectedTime) return null;
    return availabilityData.availableSlots.find(slot => slot.startTime === selectedTime);
  }, [availabilityData, selectedTime]);

  const totalPrice = selectedSlot?.price || 0;

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: { fieldId: number; date: string; startTime: string; duration: number }) => {
      return apiService.createBooking(data);
    },
    onSuccess: (response) => {
      // Update user credits v kontexte (API niekedy vracia credits ako string)
      const nextCredits = Number((response as any)?.user?.credits);
      if (Number.isFinite(nextCredits)) {
        updateCredits(nextCredits);
      }

      // Ensure user cache is synced everywhere (Profile, headers, etc.)
      queryClient.invalidateQueries({ queryKey: ['user'] });

      // Invalidate bookings query to refresh MyGames screen
      queryClient.invalidateQueries({ queryKey: ['bookings'] });

      setShowConfirmModal(false);
      setStep(0);
      setSelectedCourt(null);
      setSelectedTime(null);
      setDuration(60);
      setIsCustomDuration(false);

      Alert.alert('Úspech', 'Rezervácia bola úspešne vytvorená!');
      (navigation as any).navigate('MyGames');
    },
    onError: (error: any) => {
      Alert.alert(
        'Chyba',
        error.message || 'Nepodarilo sa vytvoriť rezerváciu. Skúste to znova.'
      );
    },
  });

  const handleInitiateBooking = () => {
    if (selectedCourt && selectedTime && user) {
      if (user.credits < totalPrice) {
        Alert.alert(
          'Nedostatok kreditov',
          `Nemáte dostatok kreditov. Potrebujete ${totalPrice.toFixed(2)} €, máte ${user.credits.toFixed(2)} €.`
        );
        return;
      }
      setShowConfirmModal(true);
    }
  };

  const confirmBooking = () => {
    if (selectedCourt && selectedTime) {
      createBookingMutation.mutate({
        fieldId: parseInt(selectedCourt.id),
        date: selectedDate,
        startTime: selectedTime,
        duration: duration,
      });
    }
  };

  const renderCourtSelection = () => {
    if (fieldsError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Chyba pri načítaní</Text>
          <Text style={styles.errorText}>
            {fieldsError instanceof Error ? fieldsError.message : 'Nepodarilo sa načítať športoviská'}
          </Text>
        </View>
      );
    }

    if (courts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="football-outline" size={48} color="#64748b" />
          <Text style={styles.emptyText}>Žiadne športoviská k dispozícii</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.courtList}
        bounces
        alwaysBounceVertical
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshingFields}
            onRefresh={handlePullToRefreshFields}
            // Hide native spinner (we render our own guaranteed-white spinner above)
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="#000000"
            title=" "
            titleColor="#FFFFFF"
          />
        }
      >
        {courts.map((court) => (
          <TouchableOpacity
            key={court.id}
            onPress={() => {
              setSelectedCourt(court);
              setStep(1);
            }}
            style={styles.courtCard}
          >
            <Image source={{ uri: court.image }} style={styles.courtImage} />
            <View style={styles.courtPriceBadge}>
              <Text style={styles.courtPriceText}>{court.pricePerHour} € / hod</Text>
            </View>
            <View style={styles.courtInfo}>
              <Text style={styles.courtName}>{court.name}</Text>
              <View style={styles.courtLocation}>
                <Ionicons name="location" size={16} color={colors.gold} />
                <Text style={styles.courtLocationText}>{court.location}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderPreferences = () => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        iso: d.toISOString().split('T')[0],
        day: d.getDate(),
        weekday: d.toLocaleString('sk-SK', { weekday: 'short' }),
        isToday: i === 0
      };
    });

    const PRESET_DURATIONS = [15, 30, 45, 60, 90, 120];

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.preferencesContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.selectedCourtInfo}>
          <Image source={{ uri: selectedCourt?.image }} style={styles.selectedCourtImage} />
          <View style={styles.selectedCourtText}>
            <Text style={styles.selectedCourtName}>{selectedCourt?.name}</Text>
            <TouchableOpacity onPress={() => setStep(0)}>
              <Text style={styles.changeCourtText}>Zmeniť ihrisko</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          <Ionicons name="calendar-outline" size={20} color={colors.gold} /> Kedy chceš hrať?
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
          {dates.map((d) => (
            <TouchableOpacity
              key={d.iso}
              onPress={() => setSelectedDate(d.iso)}
              style={[
                styles.dateButton,
                selectedDate === d.iso && styles.dateButtonSelected
              ]}
            >
              <Text
                style={[
                  styles.dateWeekday,
                  selectedDate === d.iso && styles.dateWeekdaySelected
                ]}
              >
                {d.isToday ? 'Dnes' : d.weekday}
              </Text>
              <Text
                style={[
                  styles.dateDay,
                  selectedDate === d.iso && styles.dateDaySelected
                ]}
              >
                {d.day}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Custom Date Selection Button */}
        <TouchableOpacity
          onPress={() => setShowCalendar(true)}
          style={[
            styles.customDateButton,
            !dates.some((d) => d.iso === selectedDate) && styles.customDateButtonSelected
          ]}
        >
          <View style={styles.customDateButtonContent}>
            <View style={styles.customDateIcon}>
              <Ionicons name="calendar-outline" size={20} color={colors.gold} />
            </View>
            <View style={styles.customDateTextContainer}>
              <Text style={styles.customDateLabel}>Iný dátum</Text>
              <Text
                style={[
                  styles.customDateValue,
                  selectedDate && styles.customDateValueSelected
                ]}
              >
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString('sk-SK', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'Vybrať z kalendára'}
              </Text>
            </View>
          </View>
          {selectedDate && (
            <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>
          <Ionicons name="time-outline" size={20} color={colors.gold} /> Ako dlho?
        </Text>
        {!isCustomDuration ? (
          <View style={styles.durationGrid}>
            {PRESET_DURATIONS.map((min) => (
              <TouchableOpacity
                key={min}
                onPress={() => setDuration(min)}
                style={[
                  styles.durationButton,
                  duration === min && styles.durationButtonSelected
                ]}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    duration === min && styles.durationButtonTextSelected
                  ]}
                >
                  {min} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.customDurationContainer}>
            <View style={styles.customDurationHeader}>
              <Text style={styles.customDurationLabel}>Trvanie hry</Text>
              <Text style={styles.customDurationValue}>{duration} min</Text>
            </View>
            <Slider
              style={styles.durationSlider}
              minimumValue={15}
              maximumValue={480}
              step={15}
              value={duration}
              onValueChange={(value) => setDuration(Math.round(value))}
              minimumTrackTintColor={colors.gold}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.gold}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>15 min</Text>
              <Text style={styles.sliderLabel}>480 min</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() => setIsCustomDuration(!isCustomDuration)}
          style={styles.toggleCustomButton}
        >
          <Ionicons
            name={isCustomDuration ? 'time-outline' : 'options-outline'}
            size={16}
            color={colors.gold}
          />
          <Text style={styles.toggleCustomText}>
            {isCustomDuration ? 'Vybrať zo zoznamu' : 'Nastaviť vlastný čas'}
          </Text>
        </TouchableOpacity>

        <View style={styles.preferencesSpacer} />
      </ScrollView>
    );
  };

  const renderTimeSelection = () => (
    <View style={styles.timeSelectionContainer}>
      {/* Sticky Header */}
      <View style={styles.stickyTimeHeader}>
        <View>
          <Text style={styles.timeHeaderLabel}>Termín</Text>
          <Text style={styles.timeHeaderValue}>
            {new Date(selectedDate).toLocaleDateString('sk-SK', {
              day: 'numeric',
              month: 'long'
            })}{' '}
            • {duration} min
          </Text>
        </View>
        <TouchableOpacity onPress={() => setStep(1)} style={styles.editButton}>
          <Text style={styles.editButtonText}>Upraviť</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Times List */}
      <ScrollView
        style={styles.timesScrollView}
        contentContainerStyle={styles.timesScrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <Text style={styles.availableTimesTitle}>Dostupné časy</Text>

      {isLoadingAvailability ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Načítavam dostupné časy...</Text>
        </View>
      ) : availableStartTimes.length === 0 ? (
        <View style={styles.emptyTimesContainer}>
          <Ionicons name="calendar-outline" size={32} color="#64748b" />
          <Text style={styles.emptyTimesTitle}>Žiadne voľné termíny</Text>
          <Text style={styles.emptyTimesText}>
            Pre zvolený dátum a dĺžku hry sme nenašli voľné miesto.
          </Text>

          {findLongestSlotForSelectedDate && (
            <View style={styles.nearestTimeInfo}>
              <View style={styles.nearestTimeHeader}>
                <Ionicons name="information-circle" size={20} color={colors.gold} />
                <Text style={styles.nearestTimeTitle}>Najdlhší dostupný čas</Text>
              </View>
              <Text style={styles.nearestTimeText}>
                {findLongestSlotForSelectedDate.time} - {getEndTime(findLongestSlotForSelectedDate.time, findLongestSlotForSelectedDate.duration)} ({findLongestSlotForSelectedDate.duration} min) je voľné
              </Text>
            </View>
          )}

          {findNearestAvailableTime && (
            <View style={styles.nearestTimeInfo}>
              <View style={styles.nearestTimeHeader}>
                <Ionicons name="information-circle" size={20} color={colors.gold} />
                <Text style={styles.nearestTimeTitle}>Najbližší voľný termín</Text>
              </View>
              <Text style={styles.nearestTimeText}>
                {new Date(findNearestAvailableTime.date).toLocaleDateString('sk-SK', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}{' '}
                o {findNearestAvailableTime.time}
                {findNearestAvailableTime.duration !== duration && (
                  <Text style={styles.nearestTimeDurationNote}>
                    {' '}
                    ({findNearestAvailableTime.duration} min)
                  </Text>
                )}
              </Text>
            </View>
          )}

          <View style={styles.emptyTimesButtons}>
            {findLongestSlotForSelectedDate && (
              <Button
                onPress={() => {
                  setDuration(findLongestSlotForSelectedDate.duration);
                  // Time will be auto-selected by useEffect when availableStartTimes updates
                }}
                style={styles.selectNearestButton}
              >
                Rezervovať {findLongestSlotForSelectedDate.time} - {getEndTime(findLongestSlotForSelectedDate.time, findLongestSlotForSelectedDate.duration)} ({findLongestSlotForSelectedDate.duration} min)
              </Button>
            )}
            {findNearestAvailableTime && (
              <Button
                variant={findLongestSlotForSelectedDate ? "outline" : "primary"}
                onPress={() => {
                  setSelectedDate(findNearestAvailableTime.date);
                  setDuration(findNearestAvailableTime.duration);
                  // Time will be auto-selected by useEffect when availableStartTimes updates
                }}
                style={styles.selectNearestButton}
              >
                Vybrať najbližší termín
              </Button>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.timesList}>
          {availabilityData?.availableSlots.map((slot) => (
            <TouchableOpacity
              key={slot.startTime}
              onPress={() => setSelectedTime(slot.startTime)}
              style={[
                styles.timeSlot,
                selectedTime === slot.startTime && styles.timeSlotSelected
              ]}
            >
              <View style={styles.timeSlotInfo}>
                <Text
                  style={[
                    styles.timeSlotDate,
                    selectedTime === slot.startTime && styles.timeSlotDateSelected
                  ]}
                >
                  {new Date(selectedDate).toLocaleDateString('sk-SK', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'numeric'
                  })}
                </Text>
                <View style={styles.timeSlotTimeRow}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={selectedTime === slot.startTime ? colors.textPrimary : colors.gold}
                  />
                  <Text style={styles.timeSlotTime}>{slot.startTime}</Text>
                  <Text
                    style={[
                      styles.timeSlotEnd,
                      selectedTime === slot.startTime && styles.timeSlotEndSelected
                    ]}
                  >
                    do {slot.endTime}
                  </Text>
                </View>
              </View>
              <Text style={styles.timeSlotPrice}>{slot.price.toFixed(0)} €</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

        <View style={styles.timesListSpacer} />
      </ScrollView>
    </View>
  );

  const getStepTitle = () => {
    switch (step) {
      case 0:
        return 'Rezervovať ihrisko';
      case 1:
        return 'Nastavenie hry';
      case 2:
        return 'Výber času';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        {step > 0 && (
          <TouchableOpacity
            onPress={() => setStep((step - 1) as 0 | 1 | 2)}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#94a3b8" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{getStepTitle()}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentContainer}>
        {step === 0 && (
          <>
            {/* Custom pull-to-refresh indicator (always white) */}
            {isPullRefreshingFields ? (
              <View style={styles.pullRefreshBar}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.pullRefreshText}>Obnovujem…</Text>
              </View>
            ) : null}

            {isLoadingFields && courts.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Načítavam športoviská...</Text>
              </View>
            ) : (
              renderCourtSelection()
            )}
          </>
        )}
        {step === 1 && renderPreferences()}
        {step === 2 && renderTimeSelection()}
      </View>

      {/* Sticky Find Times Button */}
      {step === 1 && selectedDate && duration && (
        <View style={styles.stickyFindTimesButtonContainer}>
          <Button fullWidth onPress={() => setStep(2)} style={styles.findTimesButton}>
            Nájsť voľné časy
          </Button>
        </View>
      )}

      {/* Sticky Booking Button */}
      {step === 2 && selectedTime && (
        <View style={styles.stickyBookingButtonContainer}>
          <Button
            fullWidth
            onPress={handleInitiateBooking}
            style={styles.bookingButton}
          >
            Rezervovať • {totalPrice.toFixed(2)} €
          </Button>
        </View>
      )}

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>Vyberte dátum</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={(day: DateData) => {
                setSelectedDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: colors.gold,
                  selectedTextColor: '#fff'
                }
              }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                todayTextColor: colors.gold,
                selectedDayBackgroundColor: colors.gold,
                selectedDayTextColor: '#fff',
                textDayFontWeight: '400',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
                monthTextColor: '#fff',
                textSectionTitleColor: '#94a3b8',
                dayTextColor: '#e2e8f0',
                calendarBackground: colors.backgroundSecondary,
                arrowColor: colors.gold,
                disabledArrowColor: '#64748b',
                textDisabledColor: '#64748b'
              }}
            />
            <Button
              variant="secondary"
              onPress={() => setShowCalendar(false)}
              style={styles.calendarModalCloseButton}
            >
              Zrušiť
            </Button>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setShowConfirmModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.modalIconContainer}>
              <Ionicons name="checkmark-circle" size={32} color={colors.gold} />
            </View>
            <Text style={styles.modalTitle}>Potvrdenie rezervácie</Text>
            <Text style={styles.modalSubtitle}>
              Prosím skontrolujte údaje. Rezervácia je záväzná.
            </Text>

            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Ihrisko</Text>
                <Text style={styles.modalDetailValue}>{selectedCourt?.name}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Termín</Text>
                <View style={styles.modalDetailValueContainer}>
                  <Text style={styles.modalDetailValue}>
                    {new Date(selectedDate).toLocaleDateString('sk-SK', {
                      day: 'numeric',
                      month: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.modalDetailTime}>
                    {selectedTime} - {selectedSlot?.endTime || (selectedTime && getEndTime(selectedTime, duration))}
                  </Text>
                </View>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Cena</Text>
                <Text style={styles.modalDetailPrice}>{totalPrice.toFixed(2)} €</Text>
              </View>
            </View>

            <View style={styles.modalWarning}>
              <Ionicons name="alert-circle" size={20} color="#fbbf24" />
              <Text style={styles.modalWarningText}>
                Suma bude automaticky stiahnutá z vášho kreditu ({user?.credits.toFixed(2)} €).
              </Text>
            </View>

            <Button 
              onPress={confirmBooking} 
              style={styles.modalConfirmButton}
              loading={createBookingMutation.isPending}
              disabled={createBookingMutation.isPending}
            >
              Zaplatiť {totalPrice.toFixed(2)} €
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  backButton: {
    padding: 8,
    marginLeft: -8
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center'
  },
  headerSpacer: {
    width: 40
  },
  contentContainer: {
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  courtList: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1
  },
  courtCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  courtImage: {
    width: '100%',
    height: 128,
    backgroundColor: colors.backgroundTertiary
  },
  courtPriceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  courtPriceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  courtInfo: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  courtName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4
  },
  courtLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  courtLocationText: {
    fontSize: 14,
    color: colors.textTertiary
  },
  preferencesContent: {
    padding: 16,
    paddingBottom: 120,
    flexGrow: 1
  },
  preferencesSpacer: {
    height: 20
  },
  selectedCourtInfo: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  selectedCourtImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary
  },
  selectedCourtText: {
    flex: 1
  },
  selectedCourtName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4
  },
  changeCourtText: {
    fontSize: 12,
    color: '#10b981'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 24
  },
  datesScroll: {
    marginBottom: 24
  },
  dateButton: {
    minWidth: 72,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginRight: 12
  },
  dateButtonSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold
  },
  dateWeekday: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  dateWeekdaySelected: {
    color: colors.textPrimary
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textTertiary
  },
  dateDaySelected: {
    color: colors.textPrimary
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  durationButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  durationButtonSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff'
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textTertiary
  },
  durationButtonTextSelected: {
    color: '#000'
  },
  customDurationContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  customDurationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  customDurationLabel: {
    fontSize: 14,
    color: colors.textTertiary
  },
  customDurationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  customDurationHint: {
    fontSize: 12,
    color: colors.textDisabled,
    textAlign: 'center'
  },
  durationSlider: {
    width: '100%',
    height: 40,
    marginVertical: 16
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.textDisabled
  },
  toggleCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 24,
    gap: 8
  },
  toggleCustomText: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '600'
  },
  nextButton: {
    marginTop: 8
  },
  timeSelectionContainer: {
    flex: 1
  },
  stickyTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  timesScrollView: {
    flex: 1
  },
  timesScrollContent: {
    padding: 16,
    paddingBottom: 120,
    flexGrow: 1
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16
  },
  timeHeaderLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4
  },
  timeHeaderValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: `rgba(212, 175, 55, 0.1)`,
    borderRadius: 8
  },
  editButtonText: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: 'bold'
  },
  availableTimesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12
  },
  emptyTimesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: 16
  },
  emptyTimesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8
  },
  emptyTimesText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24
  },
  tryShorterButton: {
    marginTop: 8
  },
  emptyTimesButtons: {
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 0
  },
  nearestTimeInfo: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  nearestTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  nearestTimeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981'
  },
  nearestTimeText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20
  },
  nearestTimeDurationNote: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic'
  },
  selectNearestButton: {
    marginTop: 0,
    marginBottom: 0
  },
  timesList: {
    gap: 8,
    marginBottom: 16
  },
  timeSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border
  },
  timeSlotSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold
  },
  timeSlotInfo: {
    flex: 1
  },
  timeSlotDate: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textDisabled,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  timeSlotDateSelected: {
    color: 'rgba(255, 255, 255, 0.8)'
  },
  timeSlotTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  timeSlotTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  timeSlotEnd: {
    fontSize: 14,
    color: colors.textDisabled
  },
  timeSlotEndSelected: {
    color: 'rgba(255, 255, 255, 0.8)'
  },
  timeSlotPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  timesListSpacer: {
    height: 100
  },
  stickyFindTimesButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  findTimesButton: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  stickyBookingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  bookingButton: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative'
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24
  },
  modalDetails: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  modalDetailLabel: {
    fontSize: 14,
    color: colors.textTertiary
  },
  modalDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right'
  },
  modalDetailValueContainer: {
    alignItems: 'flex-end'
  },
  modalDetailTime: {
    fontSize: 12,
    color: colors.textDisabled,
    marginTop: 2
  },
  modalDetailPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981'
  },
  modalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    marginBottom: 24,
    gap: 8
  },
  modalWarningText: {
    fontSize: 12,
    color: '#fef3c7',
    flex: 1
  },
  modalConfirmButton: {
    width: '100%'
  },
  customDateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24
  },
  customDateButtonSelected: {
    borderColor: colors.gold,
    borderWidth: 2
  },
  customDateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  customDateIcon: {
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8
  },
  customDateTextContainer: {
    flex: 1
  },
  customDateLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textDisabled,
    textTransform: 'uppercase',
    marginBottom: 2
  },
  customDateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textTertiary
  },
  customDateValueSelected: {
    color: colors.textPrimary
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  calendarModalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  calendarModalCloseButton: {
    marginTop: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16
  },
  pullRefreshBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pullRefreshText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8
  },
  errorText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    color: colors.textDisabled,
    marginTop: 16,
    textAlign: 'center'
  }
});

