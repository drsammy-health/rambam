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

export type ProgressCallback = (
  current: number,
  total: number,
  message: string,
) => void
