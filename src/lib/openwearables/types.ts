export type ApiUser = {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  email?: string
}

export type ApiDataPoint = {
  timestamp: string
  value: number
  source?: {
    provider: string
    device: string | null
  }
}

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export type SeriesType =
  | 'heart_rate'
  | 'resting_heart_rate'
  | 'heart_rate_variability_sdnn'
  | 'heart_rate_recovery_one_minute'
  | 'walking_heart_rate_average'
  | 'heart_rate_variability_rmssd'
  | 'oxygen_saturation'
  | 'blood_glucose'
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic'
  | 'respiratory_rate'
  | 'sleeping_breathing_disturbances'
  | 'breathing_disturbance_index'
  | 'blood_alcohol_content'
  | 'peripheral_perfusion_index'
  | 'forced_vital_capacity'
  | 'forced_expiratory_volume_1'
  | 'peak_expiratory_flow_rate'
  | 'height'
  | 'weight'
  | 'body_fat_percentage'
  | 'body_mass_index'
  | 'lean_body_mass'
  | 'body_temperature'
  | 'skin_temperature'
  | 'skin_temperature_deviation'
  | 'skin_temperature_trend_deviation'
  | 'waist_circumference'
  | 'body_fat_mass'
  | 'skeletal_muscle_mass'
  | 'vo2_max'
  | 'six_minute_walk_test_distance'
  | 'cardiovascular_age'
  | 'steps'
  | 'energy'
  | 'basal_energy'
  | 'stand_time'
  | 'exercise_time'
  | 'physical_effort'
  | 'flights_climbed'
  | 'average_met'
  | 'active_time'
  | 'distance_walking_running'
  | 'distance_cycling'
  | 'distance_swimming'
  | 'distance_downhill_snow_sports'
  | 'distance_other'
  | 'walking_step_length'
  | 'walking_speed'
  | 'walking_double_support_percentage'
  | 'walking_asymmetry_percentage'
  | 'walking_steadiness'
  | 'stair_descent_speed'
  | 'stair_ascent_speed'
  | 'running_power'
  | 'running_speed'
  | 'running_vertical_oscillation'
  | 'running_ground_contact_time'
  | 'running_stride_length'
  | 'running_vertical_ratio'
  | 'running_stance_time_balance'
  | 'swimming_stroke_count'
  | 'underwater_depth'
  | 'cadence'
  | 'power'
  | 'speed'
  | 'workout_effort_score'
  | 'estimated_workout_effort_score'
  | 'environmental_audio_exposure'
  | 'headphone_audio_exposure'
  | 'environmental_sound_reduction'
  | 'time_in_daylight'
  | 'water_temperature'
  | 'uv_exposure'
  | 'inhaler_usage'
  | 'weather_temperature'
  | 'weather_humidity'
  | 'elevation'
  | 'latitude'
  | 'longitude'
  | 'air_temperature'
  | 'garmin_stress_level'
  | 'garmin_skin_temperature'
  | 'garmin_fitness_age'
  | 'garmin_body_battery'
  | 'electrodermal_activity'
  | 'push_count'
  | 'atrial_fibrillation_burden'
  | 'insulin_delivery'
  | 'number_of_times_fallen'
  | 'number_of_alcoholic_beverages'
  | 'nike_fuel'
  | 'hydration'

export type SourceMetadata = {
  provider: string
  device: string | null
}

export type TimeSeriesSample = {
  timestamp: string
  zone_offset: string | null
  type: SeriesType
  value: number
  unit: string
  source: SourceMetadata | null
  is_daily_total: boolean | null
}

type Pagination = {
  has_more: boolean
  next_cursor: string | null
  previous_cursor: string | null
  total_count: number | null
}

type TimeseriesMetadata = {
  sample_count: number
  start_time: string
  end_time: string
}

export type PaginatedApiData = {
  data: TimeSeriesSample[]
  pagination: Pagination
  metadata: TimeseriesMetadata
}

export type ApiWorkout = {
  id: string
  type: string
  name: string | null
  start_time: string
  end_time: string
  zone_offset: string | null
  duration_seconds: number | null
  source: SourceMetadata
  calories_kcal: number | null
  distance_meters: number | null
  avg_heart_rate_bpm: number | null
  max_heart_rate_bpm: number | null
  avg_pace_sec_per_km: number | null
  elevation_gain_meters: number | null
}

export type ApiSleep = {
  id: string
  start_time: string
  end_time: string
  zone_offset: string | null
  source: SourceMetadata
  duration_seconds: number
  sleep_duration_seconds: number | null
  efficiency_percent: number | null
  is_nap: boolean
}

// ── Summary Types ──────────────────────────────────────────────────────────

export type IntensityMinutes = {
  light: number | null
  moderate: number | null
  vigorous: number | null
}

export type HeartRateStats = {
  avg_bpm: number | null
  max_bpm: number | null
  min_bpm: number | null
}

export type ActivitySummary = {
  date: string
  source: SourceMetadata
  steps: number | null
  distance_meters: number | null
  floors_climbed: number | null
  elevation_meters: number | null
  active_calories_kcal: number | null
  total_calories_kcal: number | null
  active_minutes: number | null
  sedentary_minutes: number | null
  intensity_minutes: IntensityMinutes | null
  heart_rate: HeartRateStats | null
}

export type SleepStagesSummary = {
  awake_minutes: number | null
  light_minutes: number | null
  deep_minutes: number | null
  rem_minutes: number | null
}

export type SleepSessionSummary = {
  start_time: string
  end_time: string
  zone_offset: string | null
  duration_minutes: number | null
  is_nap: boolean
}

export type SleepSummary = {
  date: string
  source: SourceMetadata
  start_time: string | null
  end_time: string | null
  zone_offset: string | null
  duration_minutes: number | null
  total_duration_minutes: number | null
  time_in_bed_minutes: number | null
  efficiency_percent: number | null
  stages: SleepStagesSummary | null
  interruptions_count: number | null
  nap_count: number | null
  nap_duration_minutes: number | null
  sessions: SleepSessionSummary[] | null
  avg_heart_rate_bpm: number | null
  avg_hrv_sdnn_ms: number | null
  avg_hrv_rmssd_ms: number | null
  avg_respiratory_rate: number | null
  avg_spo2_percent: number | null
}

export type RecoverySummary = {
  date: string
  source: SourceMetadata
  sleep_duration_seconds: number | null
  sleep_efficiency_percent: number | null
  resting_heart_rate_bpm: number | null
  avg_hrv_sdnn_ms: number | null
  avg_spo2_percent: number | null
  recovery_score: number | null
}

export type BodySlowChanging = {
  weight_kg: number | null
  height_cm: number | null
  body_fat_percent: number | null
  muscle_mass_kg: number | null
  bmi: number | null
  age: number | null
}

export type BodyAveraged = {
  period_days: number
  period_start: string
  period_end: string
  resting_heart_rate_bpm: number | null
  avg_hrv_sdnn_ms: number | null
  avg_hrv_rmssd_ms: number | null
}

export type BloodPressure = {
  avg_systolic_mmhg: number | null
  avg_diastolic_mmhg: number | null
  max_systolic_mmhg: number | null
  max_diastolic_mmhg: number | null
  min_systolic_mmhg: number | null
  min_diastolic_mmhg: number | null
  reading_count: number | null
}

export type BodyLatest = {
  body_temperature_celsius: number | null
  body_temperature_measured_at: string | null
  skin_temperature_celsius: number | null
  skin_temperature_measured_at: string | null
  blood_pressure: BloodPressure | null
  blood_pressure_measured_at: string | null
}

export type BodySummary = {
  source: SourceMetadata
  slow_changing: BodySlowChanging
  averaged: BodyAveraged
  latest: BodyLatest
}

export type ProviderDataCount = {
  provider: string
  data_points: number
  series_counts: Record<string, number>
  workout_count: number
  sleep_count: number
}

export type UserDataSummaryResponse = {
  user_id: string
  total_data_points: number
  total_workouts: number
  total_sleep_events: number
  series_type_counts: Record<string, number>
  workout_type_counts: Record<string, number>
  by_provider: ProviderDataCount[]
  has_womens_health_data: boolean
}

export type ProgressCallback = (
  current: number,
  total: number,
  message: string,
) => void
