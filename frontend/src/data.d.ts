type CensusHouseholdsTimeSeries = CensusHouseholdsValue[];
type CensusRaceEthnicityTimeSeries = CensusRaceEthnicityValue[];
type CensusPopulationTotalTimeSeries = CensusPopulationTotalValue[];
type CensusEducationalAttainmentTimeSeries = CensusEducationalAttainmentValue[];
type ReplicaNetworkSegments = GeoJSON<{ frequency: number; frequency_bucket: number }>;
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

interface GeoJSON<T = Record<string, any>> {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: string;
      coordinates: any;
    };
    properties: T;
  }>;
}
