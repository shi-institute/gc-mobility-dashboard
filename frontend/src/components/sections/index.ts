import { flattenObject } from '../../utils';
import { AreaDemographics } from './AreaDemographics';
import { Coverage } from './Coverage';
import { EssentialServicesAccessViaPublicTransit } from './EssentialServicesAccessViaPublicTransit';
import { EssentialServicesTravelTimeViaPublicTransit } from './EssentialServicesTravelTimeViaPublicTransit';
import { RiderDemographics } from './RiderDemographics';
import { ServiceStatistics } from './ServiceStatistics';
import { WorkAndSchool2 } from './WorkAndSchool2';
import { WorkAndSchoolCommute } from './WorkAndSchoolCommute';

export const SectionBundle = {
  ServiceStatistics,
  WorkAndSchoolCommute,
  AreaDemographics,
  RiderDemographics,
  Future: {
    Coverage,
    WorkAndSchoolCommute: WorkAndSchool2,
  },
  EssentialServices: {
    AccessViaPublicTransit: EssentialServicesAccessViaPublicTransit,
    TravelTimeViaPublicTransit: EssentialServicesTravelTimeViaPublicTransit,
  },
};

export const sectionBundleId = {
  ServiceStatistics: 'servstat',
  WorkAndSchoolCommute: 'workedu',
  AreaDemographics: 'areadem',
  RiderDemographics: 'ridedem',
  Future: {
    Coverage: 'coverage',
    WorkAndSchoolCommute: 'futurews',
  },
  EssentialServices: {
    AccessViaPublicTransit: 'espubacc',
    TravelTimeViaPublicTransit: 'espubtt',
  },
};

export const manualSectionIds = {
  jobsTreeMap: 'jobstree',
  roadsVsTransitScenarios: 'bubbles',
};

export const flatSectionBundleIds = flattenObject(sectionBundleId);

export const allSectionIds = [
  ...Object.values(flatSectionBundleIds),
  ...Object.values(manualSectionIds),
];
