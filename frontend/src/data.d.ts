type CensusHouseholdsTimeSeries = CensusHouseholdsValue[];
type CensusRaceEthnicityTimeSeries = CensusRaceEthnicityValue[];
type CensusPopulationTotalTimeSeries = CensusPopulationTotalValue[];
type CensusEducationalAttainmentTimeSeries = CensusEducationalAttainmentValue[];
type CombinedCensusDataTimeSeries = CombinedCensusData[];
type ReplicaNetworkSegments = GeoJSON<{ frequency: number; frequency_bucket: number }>;
type ReplicaAreaPolygon = GeoJSON<{ name: string }>;
type ReplicaSyntheticPeople = ReplicaSyntheticPerson[];
type ReplicaTrips = ReplicaTrip[];

interface CoreCensusValue {
  NAME: string;
  ucgid: string;
  GEOID: string;
}

interface CensusHouseholdsValue extends CoreCensusValue {
  households__total: number;
  households__no_vehicle: number;
  households__1_vehicle: number;
  households__2_vehicles: number;
  households__3_vehicles: number;
  households__4_plus_vehicles: number;
}

interface CensusRaceEthnicityValue extends CoreCensusValue {
  race_ethnicity__white_alone: number;
  race_ethnicity__black_alone: number;
  race_ethnicity__native_alone: number;
  race_ethnicity__asian_alone: number;
  race_ethnicity__pacific_islander_alone: number;
  race_ethnicity__other_alone: number;
  race_ethnicity__multiple: number;
  race_ethnicity__hispanic: number;
}

interface CensusPopulationTotalValue extends CoreCensusValue {
  population__total: number;
}

interface CensusEducationalAttainmentValue extends CoreCensusValue {
  educational_attainment__no_high_school: number;
  educational_attainment__some_high_school: number;
  educational_attainment__high_school_graduate_or_equivalent: number;
  educational_attainment__some_college: number;
  educational_attainment__associate_degree: number;
  educational_attainment__bachelor_degree: number;
  educational_attainment__graduate_or_professional_degree: number;
}

type CombinedCensusData = {
  areas: string[];
  /** The Census ACS year range */
  YEAR: string;
} & CensusHouseholdsValue &
  CensusRaceEthnicityValue &
  CensusPopulationTotalValue &
  CensusEducationalAttainmentValue;

type ArrayString = string;
type LineString = string;

interface ReplicaNetworkSegment {
  stableEdgeId: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  streetName: string;
  distance: number;
  osmid: string;
  speed: number;
  flags: ArrayString;
  lanes: number;
  highway: string;
  geometry: LineString;
}

interface ReplicaSyntheticPerson {
  household_id: string;
  person_id: string;
  BLOCKGROUP: string;
  BLOCKGROUP_work: string;
  BLOCKGROUP_school: any;
  TRACT: string;
  TRACT_work: string;
  TRACT_school: any;
  age_group: string;
  age: number;
  sex: string;
  race: string;
  ethnicity: string;
  individual_income_group: string;
  individual_income: number;
  employment: string;
  education: string;
  school_grade_attending: string;
  industry: string;
  household_role: string;
  subfamily_number: number;
  subfamily_relationship: string;
  commute_mode: string;
  tenure: string;
  migration: string;
  household_size: string;
  household_income_group: string;
  household_income: number;
  family_structure: string;
  vehicles: string;
  building_type: string;
  resident_type: string;
  language: string;
  lat: number;
  lng: number;
  lat_work: number;
  lng_work: number;
  lat_school: any;
  lng_school: any;
  wfh: string;
}

interface ReplicaTrip {
  household_id: string;
  activity_id: string;
  person_id: string;
  mode: string;
  travel_purpose: string;
  tour_type: string;
  transit_route_ids: string[];
  network_link_ids: string[];
  vehicle_type: any;
  start_lng: number;
  start_lat: number;
  end_lng: number;
  end_lat: number;
  source_table: string;
}

interface ReplicaStatistics {
  synthetic_demographics: ReplicaSyntheticDemographicsStatistics;
  saturday_trip: ReplicaTripStatistics;
  thursday_trip: ReplicaTripStatistics;
  thursday_trip__public_transit_synthetic_population_demographics?: ReplicaSyntheticDemographicsStatistics;
  saturday_trip__public_transit_synthetic_population_demographics?: ReplicaSyntheticDemographicsStatistics;
}

interface ReplicaSyntheticDemographicsStatistics {
  race: {
    white?: number;
    blac_african_american?: number;
    two_or_more_races?: number;
    other_race_alone?: number;
    asian?: number;
    american_indian_alaska_native?: number;
    hawaiian_pacific?: number;
  };
  ethnicity: {
    hispanic_or_latino?: number;
    not_hispanic_or_latino?: number;
  };
  education: {
    k_12?: number;
    high_school?: number;
    some_college?: number;
    bachelors_degree?: number;
    advanced_degree?: number;
    no_school?: number;
    under_3?: number;
  };
  commute_mode: {
    not_working?: number;
    driving?: number;
    carpool?: number;
    worked_from_home?: number;
    walking?: number;
    transit?: number;
    biking?: number;
  };
  households?: number;
  population?: number;
  households_in_service_area?: { walk: number; bike: number };
  population_in_service_area?: { walk: number; bike: number };
}

interface ReplicaTripStatistics {
  /** Mode statistics broken down by tour type */
  methods: {
    __all: ReplicaTripModeStatistics;
    commute: ReplicaTripModeStatistics;
    work_based: ReplicaTripModeStatistics;
    undirected: ReplicaTripModeStatistics;
    other_home_based: ReplicaTripModeStatistics;
  };
  /** The median duration in minutes broken down by tour type */
  median_duration: {
    __all: number;
    commute: number;
    work_based: number;
    undirected: number;
    other_home_based: number;
  };
  possible_conversions: {
    via_walk?: number;
    via_bike?: number;
  };
  destination_building_use?: {
    via_walk: {
      type_counts: ReplicaDesinationUseTypeStatistics;
      subtype_counts: ReplicaDesinationUseSubTypeStatistics;
    };
    via_bike: {
      type_counts: ReplicaDesinationUseTypeStatistics;
      subtype_counts: ReplicaDesinationUseSubTypeStatistics;
    };
  };
}

interface ReplicaTripModeStatistics {
  private_auto?: number;
  carpool?: number;
  walking?: number;
  commercial?: number;
  other_travel_mode?: number;
  biking?: number;
  on_demand_auto?: number;
  public_transit?: number;
}

interface ReplicaDesinationUseTypeStatistics {
  residential?: number;
  commercial?: number;
  civic_institutional?: number;
  industrial?: number;
  transportation_utilities?: number;
  open_space?: number;
  unknown?: number;
  agriculture?: number;
  other?: number;
}

interface ReplicaDesinationUseSubTypeStatistics {
  single_family?: number;
  retail?: number;
  education?: number;
  office?: number;
  multi_family?: number;
  civic_institutional?: number;
  industrial?: number;
  non_retail_attraction?: number;
  healthcare?: number;
}

interface GeoJSON<T = Record<string, any>, K = string> {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: K;
      coordinates: any;
    };
    properties: T;
  }>;
}

namespace GTFS {
  interface RouteProperties {
    ID: string;
    Name?: string | null;
    route_url?: string | null;
    Color?: string | null;
    TextColor?: string | null;
  }

  interface StopProperties {
    ID: string;
    Name?: string | null;
    stop_url?: string | null;
    stop_timezone?: string | null;
  }

  export type Routes = GeoJSON<RouteProperties, 'LineString' | 'MultiLineString'>;
  export type Stops = GeoJSON<StopProperties, 'Point'>;
  export type WalkServiceArea = GeoJSON<StopProperties, 'Polygon' | 'MultiPolygon'>;
  export type BikeServiceArea = GeoJSON<StopProperties, 'Polygon' | 'MultiPolygon'>;
  export type ParatransitServiceArea = GeoJSON<RouteProperties, 'Polygon' | 'MultiPolygon'>;
}

interface StopRidership {
  period: string;
  stop_point: number;
  boarding: number;
  alighting: number;
  areas: string[] | null;
}

interface ServiceCoverage {
  year: number;
  quarter: 'Q2' | 'Q4';
  /** The name of the area. If null, these stats apply to the entire network. */
  area: string | null;
  routes_distance_meters: number;
  stops_count: number;
  walk_service_area_perimeter_meters: number;
  walk_service_area_area_square_meters: number;
  bike_service_area_perimeter_meters: number;
  bike_service_area_area_square_meters: number;
  paratransit_service_area_perimeter_meters: number;
  paratransit_service_area_area_square_meters: number;
}

interface EssentialServicesAccessStatistic {
  area: string;
  season: string;
}

interface EssentialServicesTripAccessStatistic extends EssentialServicesAccessStatistic {
  replica_table: 'thursday_trip' | 'saturday_trip';
  child_care__mean_travel_time?: number;
  commercial_zone__mean_travel_time?: number;
  healthcare__mean_travel_time?: number;
  grocery_store__mean_travel_time?: number;
}

interface EssentialServicesPopulationAccessStatistic extends EssentialServicesAccessStatistic {
  replica_table: 'population';
  child_care__access_fraction?: number;
  commercial_zone__access_fraction?: number;
  healthcare__access_fraction?: number;
  grocery_store__access_fraction?: number;
}

type EssentialServicesAccessStats =
  | EssentialServicesTripAccessStatistic
  | EssentialServicesPopulationAccessStatistic;

type MergedEssentialServicesAccessStats = Omit<
  EssentialServicesTripAccessStatistic,
  'replica_table'
> &
  Omit<EssentialServicesPopulationAccessStatistic, 'replica_table'>;

interface FutureRouteStatistics {
  /** Mode statistics broken down by tour type */
  methods: {
    __all: ReplicaTripModeStatistics;
    commute: ReplicaTripModeStatistics;
    work_based: ReplicaTripModeStatistics;
    undirected: ReplicaTripModeStatistics;
    other_home_based: ReplicaTripModeStatistics;
  };
  /** The median duration in minutes broken down by tour type */
  median_duration: {
    __all: number;
    commute: number;
    work_based: number;
    undirected: number;
    other_home_based: number;
  };
  possible_conversions: {
    via_walk?: number;
    via_bike?: number;
  };
  destination_building_use?: {
    via_walk: {
      type_counts: ReplicaDesinationUseTypeStatistics;
      subtype_counts: ReplicaDesinationUseSubTypeStatistics;
    };
    via_bike: {
      type_counts: ReplicaDesinationUseTypeStatistics;
      subtype_counts: ReplicaDesinationUseSubTypeStatistics;
    };
  };
  synthetic_demographics: {
    households_in_service_area: { walk: number; bike: number };
    population_in_service_area: { walk: number; bike: number };
  };
  route_distance_meters: number;
  stops_count: number;
  walk_service_area_perimeter_meters: number;
  walk_service_area_area_square_meters: number;
  bike_service_area_perimeter_meters: number;
  bike_service_area_area_square_meters: number;
}

interface NorthsideDataProcessing {
  neighborhood_name?: string | null;
  GISJOIN?: string | null;
  age__65_over?: number | null;
  age__under_5?: number | null;
  disability__18_34__female?: number | null;
  disability__18_34__male?: number | null;
  disability__35_64__female?: number | null;
  disability__35_64__male?: number | null;
  disability__5_17__female?: number | null;
  disability__5_17__male?: number | null;
  disability__65_74__female?: number | null;
  disability__65_74__male?: number | null;
  disability__75_over__female?: number | null;
  disability__75_over__male?: number | null;
  disability__under_5__female?: number | null;
  disability__under_5__male?: number | null;
  edu_enrollment__black__college_undergraduate?: number | null;
  edu_enrollment__black__graduate_professional?: number | null;
  edu_enrollment__black__k12?: number | null;
  edu_enrollment__black__nursery_preschool?: number | null;
  edu_enrollment__black__total?: number | null;
  edu_enrollment__college_undergraduate?: number | null;
  edu_enrollment__graduate_professional?: number | null;
  edu_enrollment__hispanic__college_undergraduate?: number | null;
  edu_enrollment__hispanic__graduate_professional?: number | null;
  edu_enrollment__hispanic__k12?: number | null;
  edu_enrollment__hispanic__nursery_preschool?: number | null;
  edu_enrollment__hispanic__total?: number | null;
  edu_enrollment__k12?: number | null;
  edu_enrollment__nursery_preschool?: number | null;
  edu_enrollment__total?: number | null;
  edu_enrollment__white__college_undergraduate?: number | null;
  edu_enrollment__white__graduate_professional?: number | null;
  edu_enrollment__white__k12?: number | null;
  edu_enrollment__white__nursery_preschool?: number | null;
  edu_enrollment__white__total?: number | null;
  education__associates_degree?: number | null;
  education__bachelors_degree?: number | null;
  education__doctorate_degree?: number | null;
  education__ged_or_alternative_credential?: number | null;
  education__masters_degree?: number | null;
  education__professional_school_degree?: number | null;
  education__regular_high_school_diploma?: number | null;
  education__some_college_no_degree?: number | null;
  employment__black__employed?: number | null;
  employment__black__unemployed?: number | null;
  employment__employed?: number | null;
  employment__hispanic__employed?: number | null;
  employment__hispanic__unemployed?: number | null;
  employment__unemployed?: number | null;
  employment__white__employed?: number | null;
  employment__white__unemployed?: number | null;
  ethnicity__hispanic_or_latino?: number | null;
  ethnicity__hispanic_or_latino__amer_indian_alaskan_native?: number | null;
  ethnicity__hispanic_or_latino__asian?: number | null;
  ethnicity__hispanic_or_latino__black?: number | null;
  ethnicity__hispanic_or_latino__other_race?: number | null;
  ethnicity__hispanic_or_latino__pacific_islander?: number | null;
  ethnicity__hispanic_or_latino__white?: number | null;
  ethnicity__not_hispanic_or_latino?: number | null;
  ethnicity__not_hispanic_or_latino__amer_indian_alaskan_native?: number | null;
  ethnicity__not_hispanic_or_latino__asian?: number | null;
  ethnicity__not_hispanic_or_latino__black?: number | null;
  ethnicity__not_hispanic_or_latino__other_race?: number | null;
  ethnicity__not_hispanic_or_latino__pacific_islander?: number | null;
  ethnicity__not_hispanic_or_latino__two_or_more_races?: number | null;
  ethnicity__not_hispanic_or_latino__white?: number | null;
  food_stamps__not_received?: number | null;
  food_stamps__not_received__above_poverty?: number | null;
  food_stamps__not_received__below_poverty?: number | null;
  food_stamps__received?: number | null;
  food_stamps__received__above_poverty?: number | null;
  food_stamps__received__below_poverty?: number | null;
  geographic_mobility__abroad?: number | null;
  geographic_mobility__different_county_same_state?: number | null;
  geographic_mobility__different_state?: number | null;
  geographic_mobility__no_income?: number | null;
  geographic_mobility__no_movement?: number | null;
  geographic_mobility__same_county?: number | null;
  geographic_mobility__with_income?: number | null;
  grandparent__not_responsible_for_grandchild_under_18?: number | null;
  grandparent__responsible_for_grandchild_under_18?: number | null;
  has_computer__black?: number | null;
  has_computer__hispanic?: number | null;
  has_computer__total?: number | null;
  has_computer__white?: number | null;
  household_vehicles__0?: number | null;
  housing__total_occupied?: number | null;
  industry_employment__recreation_services_etc?: number | null;
  industry_employment__social_services_etc?: number | null;
  insurance_coverage__black__with_insurance?: number | null;
  insurance_coverage__black__without_insurance?: number | null;
  insurance_coverage__hispanic__with_insurance?: number | null;
  insurance_coverage__hispanic__without_insurance?: number | null;
  insurance_coverage__white__with_insurance?: number | null;
  insurance_coverage__white__without_insurance?: number | null;
  insurance_coverage__with_insurance?: number | null;
  insurance_coverage__without_insurance?: number | null;
  internet__broadband__black?: number | null;
  internet__broadband__hispanic?: number | null;
  internet__broadband__total?: number | null;
  internet__broadband__white?: number | null;
  median_household_income?: number | null;
  median_household_income__white?: number | null;
  no_computer__black?: number | null;
  no_computer__hispanic?: number | null;
  no_computer__total?: number | null;
  no_computer__white?: number | null;
  population__25_or_older?: number | null;
  population__children_living_with_grandparent_householder?: number | null;
  population__total?: number | null;
  poverty__above_poverty_household?: number | null;
  poverty__below_poverty_household?: number | null;
  tenure__black__owner?: number | null;
  tenure__black__renter?: number | null;
  tenure__hispanic__owner?: number | null;
  tenure__hispanic__renter?: number | null;
  tenure__owner?: number | null;
  tenure__owner_15_24?: number | null;
  tenure__owner_25_34?: number | null;
  tenure__owner_35_44?: number | null;
  tenure__owner_45_54?: number | null;
  tenure__owner_55_59?: number | null;
  tenure__owner_60_64?: number | null;
  tenure__owner_65_74?: number | null;
  tenure__owner_75_84?: number | null;
  tenure__owner_85_over?: number | null;
  tenure__renter?: number | null;
  tenure__renter_15_24?: number | null;
  tenure__renter_25_34?: number | null;
  tenure__renter_35_44?: number | null;
  tenure__renter_45_54?: number | null;
  tenure__renter_55_59?: number | null;
  tenure__renter_60_64?: number | null;
  tenure__renter_65_74?: number | null;
  tenure__renter_75_84?: number | null;
  tenure__renter_85_over?: number | null;
  tenure__white__owner?: number | null;
  tenure__white__renter?: number | null;
  veteran__18_to_64_years?: number | null;
  veteran__65_years_and_over?: number | null;
  vision_difficulty__18_34__female?: number | null;
  vision_difficulty__18_34__male?: number | null;
  vision_difficulty__35_64__female?: number | null;
  vision_difficulty__35_64__male?: number | null;
  vision_difficulty__5_17__female?: number | null;
  vision_difficulty__5_17__male?: number | null;
  vision_difficulty__65_74__female?: number | null;
  vision_difficulty__65_74__male?: number | null;
  vision_difficulty__75_over__female?: number | null;
  vision_difficulty__75_over__male?: number | null;
  vision_difficulty__under_5__female?: number | null;
  vision_difficulty__under_5__male?: number | null;
  household_vehicles__none_fraction?: number | null;
  age__under_5_fraction?: number | null;
  age__65_over_fraction?: number | null;
  population__children_living_with_grandparent_householder_fraction?: number | null;
  grandparent__responsible_for_grandchild_under_18_fraction?: number | null;
  grandparent__not_responsible_for_grandchild_under_18_fraction?: number | null;
  geographic_mobility__no_movement_fraction?: number | null;
  geographic_mobility__same_county_fraction?: number | null;
  geographic_mobility__different_county_same_state_fraction?: number | null;
  geographic_mobility__different_state_fraction?: number | null;
  geographic_mobility__abroad_fraction?: number | null;
  geographic_mobility__no_income_fraction?: number | null;
  geographic_mobility__with_income_fraction?: number | null;
  industry__service_fraction?: number | null;
  food_stamps__received_fraction?: number | null;
  poverty__below_poverty_household_fraction?: number | null;
  poverty__above_poverty_household_fraction?: number | null;
  has_computer__total_percent?: number | null;
  has_computer__black_percent?: number | null;
  has_computer__white_percent?: number | null;
  has_computer__hispanic_percent?: number | null;
  internet__broadband__total_percent?: number | null;
  internet__broadband__black_percent?: number | null;
  internet__broadband__white_percent?: number | null;
  internet__broadband__hispanic_percent?: number | null;
  disability__total?: number | null;
}

interface Scenario {
  pavementMiles: number;
  estimatedCostUSD: number;
  scenarioName: string;
  features: (
    | ScenarioStopInfrastructureFeature
    | ScenarioStopAccessibilityFeature
    | ScenarioRouteFrequencyFeature
    | ScenarioRouteAdditionFeature
    | ScenarioBusPurchaseFeature
    | ScenarioOnDemandPurchaseFeature
  )[];
}

interface ScenarioFeature {
  name: string;
  description?: string;
  additionalNote?: string;
}

interface ScenarioStopFeature extends ScenarioFeature {
  affects: 'stops';
}

interface ScenarioRouteFeature extends ScenarioFeature {
  affects: 'routes';
  routeIds: string[];
}

interface ScenarioBusFeature extends ScenarioFeature {
  affects: 'buses';
}

interface ScenarioOnDemandFeature extends ScenarioFeature {
  affects: 'on-demand';
}

interface ScenarioStopInfrastructureFeature extends ScenarioStopFeature {
  type: 'infrastructure';
  count: number;
}

interface ScenarioStopAccessibilityFeature extends ScenarioStopFeature {
  type: 'accessibility';
  count: number;
}

interface ScenarioRouteFrequencyFeature extends ScenarioRouteFeature {
  type: 'frequency';
  before: number;
  after: number;
}

interface ScenarioRouteAdditionFeature extends ScenarioRouteFeature {
  type: 'addition';
  frequency: number;
}

interface ScenarioBusPurchaseFeature extends ScenarioBusFeature {
  type: 'purchase';
  count: number;
}

interface ScenarioOnDemandPurchaseFeature extends ScenarioOnDemandFeature {
  type: 'purchase';
  count: number;
}
