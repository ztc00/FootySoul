import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useCreateGame } from '@/hooks/useGames';
import { geocodeAddress, suggestAddresses, searchVenues, getVenueDetails, buildPlacePhotoUrl, type AddressSuggestion } from '@/lib/geocode';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';

const DEBOUNCE_MS = 350;

/** Round a Date to the nearest 15-minute mark (0, 15, 30, 45). */
function roundTo15(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(Math.round(d.getMinutes() / 15) * 15, 0, 0);
  return d;
}

/** Next clean 15-min slot at least 15 min from now. */
function nextSlot(): Date {
  return roundTo15(new Date(Date.now() + 15 * 60 * 1000));
}

export default function CreateGameScreen() {
  const createGame = useCreateGame();
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [prefillCoords, setPrefillCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [venueSuggestions, setVenueSuggestions] = useState<AddressSuggestion[]>([]);
  const [venueLoading, setVenueLoading] = useState(false);
  const venueDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [rules, setRules] = useState('');
  const [startTime, setStartTime] = useState(nextSlot);
  const [endTime, setEndTime] = useState(() => new Date(nextSlot().getTime() + 2 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'invite_only'>('public');
  const PITCH_CAPACITY: Record<string, string> = { '5-a-side': '10', '7-a-side': '14', '11-a-side': '22' };
  const [pitchType, setPitchType] = useState<'5-a-side' | '7-a-side' | '11-a-side'>('5-a-side');
  const [requirePaymentNow, setRequirePaymentNow] = useState(true);
  const [creating, setCreating] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null); // local file from camera roll
  const [venuePhotoUrl, setVenuePhotoUrl] = useState<string | null>(null); // auto-fetched Google photo
  const [fetchingVenuePhoto, setFetchingVenuePhoto] = useState(false);

  const handleLocationNameChange = useCallback((text: string) => {
    setLocationName(text);
    setVenueSuggestions([]);
    // Clear prefilled data when user manually edits
    setPrefillCoords(null);
    setPlaceId(null);
    setVenuePhotoUrl(null);
    if (venueDebounceRef.current) {
      clearTimeout(venueDebounceRef.current);
      venueDebounceRef.current = null;
    }
    if (text.trim().length < 2) {
      setVenueLoading(false);
      return;
    }
    setVenueLoading(true);
    venueDebounceRef.current = setTimeout(async () => {
      venueDebounceRef.current = null;
      try {
        const results = await searchVenues(text);
        setVenueSuggestions(results);
      } catch {
        setVenueSuggestions([]);
      } finally {
        setVenueLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleAddressChange = useCallback((text: string) => {
    setAddress(text);
    setAddressSuggestions([]);
    setAddressError(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (text.trim().length < 3) {
      setAddressLoading(false);
      return;
    }
    setAddressLoading(true);
    const context = locationName.trim() || null;
    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
      try {
        const results = await suggestAddresses(text, context);
        setAddressSuggestions(results);
        setAddressError(null);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not load suggestions';
        setAddressError(message);
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    }, DEBOUNCE_MS);
  }, [locationName]);

  const handleSubmit = async () => {
    if (!title || !locationName || !address || !price || !capacity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setCreating(true);
    setAddressSuggestions([]);
    setVenueSuggestions([]);
    try {
      // Use pre-filled coordinates from venue selection; fall back to geocoding if needed
      let latitude: number | null = prefillCoords?.lat ?? null;
      let longitude: number | null = prefillCoords?.lng ?? null;
      if (!latitude || !longitude) {
        const fullAddress = [locationName, address].filter(Boolean).join(', ');
        try {
          const coords = await geocodeAddress(fullAddress);
          if (coords) {
            latitude = coords.latitude;
            longitude = coords.longitude;
          }
        } catch (_) {
          // Game still created; it just won't show on the map until address is fixed
        }
      }

      // Resolve cover image URL:
      // 1. If organizer picked a local photo → upload to Supabase Storage
      // 2. Else if Google venue photo was auto-fetched → use that URL directly
      let image_url: string | null = venuePhotoUrl;
      if (imageUri && supabase) {
        try {
          const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
          const fileName = `game-${Date.now()}.${ext}`;
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const { error: uploadError } = await supabase.storage
            .from('game-images')
            .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('game-images').getPublicUrl(fileName);
            image_url = urlData.publicUrl;
          }
        } catch (_) {
          // Upload failed — fall back to venue photo if available
          image_url = venuePhotoUrl;
        }
      }

      await createGame.mutateAsync({
        title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location_name: locationName,
        address,
        map_url: null,
        latitude,
        longitude,
        price: parseFloat(price),
        currency: 'AED',
        capacity: parseInt(capacity, 10),
        rules: rules || null,
        visibility,
        invite_code: visibility === 'invite_only' ? generateInviteCode() : null,
        pitch_type: pitchType,
        require_payment_now: requirePaymentNow,
        place_id: placeId,
        image_url,
      });

      Alert.alert('Success', 'Game created!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create game');
    } finally {
      setCreating(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to add a cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const generateInviteCode = () => {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(36)).join('').substring(0, 8).toUpperCase();
  };

  const isPending = creating || createGame.isPending;

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {/* Cover image — auto-filled from Google Maps when venue selected, or tap to pick manually */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
          {(imageUri || venuePhotoUrl) ? (
            <>
              <Image source={{ uri: imageUri ?? venuePhotoUrl! }} style={styles.imagePreview} resizeMode="cover" />
              <View style={styles.imageEditBadge}>
                <Ionicons name={imageUri ? 'camera' : 'map'} size={14} color={colors.white} />
                <Text style={styles.imageEditText}>{imageUri ? 'Change' : 'From Google Maps · Tap to replace'}</Text>
              </View>
            </>
          ) : fetchingVenuePhoto ? (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.imagePlaceholderText}>Fetching venue photo…</Text>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
              <Text style={styles.imagePlaceholderText}>Add cover photo</Text>
              <Text style={styles.imagePlaceholderSub}>Auto-filled from Google Maps when you pick a venue</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Game Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Friday Night Football"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Venue *</Text>
        <View style={styles.statusRow}>
          {venueLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons
              name={prefillCoords ? 'checkmark-circle' : 'search-outline'}
              size={14}
              color={prefillCoords ? colors.accent : colors.textMuted}
            />
          )}
          <Text style={styles.statusHint}>
            {venueLoading ? 'Searching…' : prefillCoords ? 'Venue confirmed — address auto-filled below' : 'Type the venue name to search'}
          </Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="e.g., Al Wasl Sports Club"
          placeholderTextColor={colors.textMuted}
          value={locationName}
          onChangeText={handleLocationNameChange}
        />
        {venueSuggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {venueSuggestions.map((s, index) => (
              <TouchableOpacity
                key={`${s.place_id ?? s.address}-${index}`}
                style={[styles.suggestionItem, index === venueSuggestions.length - 1 && styles.suggestionItemLast]}
                onPress={async () => {
                  const name = s.location_name || s.label.split(',')[0].trim();
                  setLocationName(name);
                  setVenueSuggestions([]);
                  setAddressSuggestions([]);

                  if (s.place_id) {
                    setPlaceId(s.place_id);
                    // Fetch full details (address + coords + photo) from Google Places
                    setFetchingVenuePhoto(true);
                    try {
                      const details = await getVenueDetails(s.place_id);
                      if (details) {
                        setAddress(details.address);
                        setPrefillCoords({ lat: details.latitude, lng: details.longitude });
                        if (details.photoReference && !imageUri) {
                          setVenuePhotoUrl(buildPlacePhotoUrl(details.photoReference));
                        }
                      } else {
                        // Fallback to autocomplete data
                        setAddress(s.address);
                        if (s.latitude != null && s.longitude != null) {
                          setPrefillCoords({ lat: s.latitude, lng: s.longitude });
                        }
                      }
                    } catch {
                      setAddress(s.address);
                      if (s.latitude != null && s.longitude != null) {
                        setPrefillCoords({ lat: s.latitude, lng: s.longitude });
                      }
                    } finally {
                      setFetchingVenuePhoto(false);
                    }
                  } else {
                    setAddress(s.address);
                    if (s.latitude != null && s.longitude != null) {
                      setPrefillCoords({ lat: s.latitude, lng: s.longitude });
                    }
                  }
                }}
              >
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.suggestionText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Full Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Dubai Sports City, Dubai, UAE"
          placeholderTextColor={colors.textMuted}
          value={address}
          onChangeText={handleAddressChange}
        />
        <View style={styles.statusRow}>
          {addressLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons
              name={addressSuggestions.length > 0 ? 'checkmark-circle' : 'search-outline'}
              size={14}
              color={addressSuggestions.length > 0 ? colors.accent : colors.textMuted}
            />
          )}
          <Text style={styles.statusHint}>
            {addressLoading
              ? 'Searching…'
              : addressSuggestions.length > 0
                ? 'Tap a suggestion to confirm'
                : address.trim().length < 3
                  ? 'Type to search for an address'
                  : 'No results — try a different search'}
          </Text>
        </View>
        {addressError && <Text style={styles.addressError}>{addressError}</Text>}
        {addressSuggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {addressSuggestions.map((s, index) => (
              <TouchableOpacity
                key={`${s.address}-${index}`}
                style={[styles.suggestionItem, index === addressSuggestions.length - 1 && styles.suggestionItemLast]}
                onPress={() => {
                  setAddress(s.address);
                  setAddressSuggestions([]);
                  setAddressError(null);
                }}
              >
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.suggestionText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Date & Time *</Text>
        <View style={styles.dateSection}>
          <View style={styles.dateRow}>
            <View style={styles.dateColumn}>
              <Text style={styles.dateSublabel}>Start</Text>
              <TouchableOpacity
                style={[styles.dateButton, showStartPicker && styles.dateButtonActive]}
                onPress={() => { setShowStartPicker((v) => !v); setShowEndPicker(false); }}
              >
                <Ionicons name="calendar-outline" size={16} color={showStartPicker ? colors.accent : colors.textSecondary} />
                <Text style={styles.dateText}>{format(startTime, 'EEE, MMM d · h:mm a')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateColumn}>
              <Text style={styles.dateSublabel}>End</Text>
              <TouchableOpacity
                style={[styles.dateButton, showEndPicker && styles.dateButtonActive]}
                onPress={() => { setShowEndPicker((v) => !v); setShowStartPicker(false); }}
              >
                <Ionicons name="time-outline" size={16} color={showEndPicker ? colors.accent : colors.textSecondary} />
                <Text style={styles.dateText}>{format(endTime, 'EEE, MMM d · h:mm a')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {showStartPicker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={startTime}
                mode="datetime"
                is24Hour={false}
                minuteInterval={15}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') setShowStartPicker(false);
                  if (selectedDate) {
                    // On Android minuteInterval isn't supported — snap manually
                    const snapped = Platform.OS === 'android' ? roundTo15(selectedDate) : selectedDate;
                    setStartTime(snapped);
                    // Auto-adjust end time to stay 2 hours after start
                    if (snapped >= endTime) {
                      setEndTime(new Date(snapped.getTime() + 2 * 60 * 60 * 1000));
                    }
                  }
                }}
              />
            </View>
          )}
          {showEndPicker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={endTime}
                mode="datetime"
                is24Hour={false}
                minuteInterval={15}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date(startTime.getTime() + 30 * 60 * 1000)}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') setShowEndPicker(false);
                  if (selectedDate) {
                    const snapped = Platform.OS === 'android' ? roundTo15(selectedDate) : selectedDate;
                    setEndTime(snapped);
                  }
                }}
              />
            </View>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Price (AED) *</Text>
            <TextInput
              style={styles.input}
              placeholder="50"
              placeholderTextColor={colors.textMuted}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.halfWidth}>
            <Text style={styles.label}>Capacity *</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              placeholderTextColor={colors.textMuted}
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>Pitch type</Text>
        <View style={styles.toggleContainer}>
          {(['5-a-side', '7-a-side', '11-a-side'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.toggle, pitchType === p && styles.toggleActive]}
              onPress={() => {
                setPitchType(p);
                setCapacity(PITCH_CAPACITY[p]);
              }}
            >
              <Text style={[styles.toggleText, pitchType === p && styles.toggleTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Payment</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggle, requirePaymentNow && styles.toggleActive]}
            onPress={() => setRequirePaymentNow(true)}
          >
            <Text style={[styles.toggleText, requirePaymentNow && styles.toggleTextActive]}>Pay now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggle, !requirePaymentNow && styles.toggleActive]}
            onPress={() => setRequirePaymentNow(false)}
          >
            <Text style={[styles.toggleText, !requirePaymentNow && styles.toggleTextActive]}>Pay later</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Visibility</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggle, visibility === 'public' && styles.toggleActive]}
            onPress={() => setVisibility('public')}
          >
            <Text style={[styles.toggleText, visibility === 'public' && styles.toggleTextActive]}>Public</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggle, visibility === 'invite_only' && styles.toggleActive]}
            onPress={() => setVisibility('invite_only')}
          >
            <Text style={[styles.toggleText, visibility === 'invite_only' && styles.toggleTextActive]}>Invite Only</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Rules <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g., Bring boots, no slide tackles"
          placeholderTextColor={colors.textMuted}
          value={rules}
          onChangeText={setRules}
          multiline
          numberOfLines={4}
        />

        {/* Bottom padding so content isn't behind sticky button */}
        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {/* Sticky submit */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, isPending && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Create game</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  imagePicker: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: spacing[2],
    marginBottom: spacing[2],
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  imagePreview: { width: '100%', height: '100%' },
  imageEditBadge: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  imageEditText: { color: colors.white, fontSize: fontSizes.xs },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[1] },
  imagePlaceholderText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.semibold },
  imagePlaceholderSub: { fontSize: fontSizes.xs, color: colors.textMuted },
  outer: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  form: { padding: spacing[4], paddingTop: spacing[2] },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  optional: { fontWeight: fontWeights.normal, color: colors.textMuted },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
    marginBottom: spacing[2],
  },
  statusHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  addressError: {
    fontSize: fontSizes.xs,
    color: colors.danger,
    marginBottom: spacing[2],
  },
  suggestionsBox: {
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  suggestionItemLast: { borderBottomWidth: 0 },
  suggestionText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSizes.base,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  halfWidth: { flex: 1 },
  dateSection: {
    marginBottom: spacing[2],
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dateColumn: { flex: 1 },
  dateSublabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing[1],
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
  },
  dateButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  dateText: { fontSize: fontSizes.xs, color: colors.text, flex: 1 },
  pickerWrap: {
    marginTop: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: 4,
    marginBottom: spacing[2],
  },
  toggle: {
    flex: 1,
    paddingVertical: spacing[2] + 2,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  toggleTextActive: { color: colors.text, fontWeight: fontWeights.semibold },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing[4],
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: fontSizes.base, fontWeight: fontWeights.semibold },
});

