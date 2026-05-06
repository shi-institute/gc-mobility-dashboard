import { getRootAttributes } from '../../utils';

const { homePath } = getRootAttributes();

export const LANDING_PAGE_FRAGMENT = '/';
export const TAB_1_ALT_FRAGMENT = '/general';
export const TAB_1_FRAGMENT = homePath ? TAB_1_ALT_FRAGMENT : '/';
export const TAB_2_FRAGMENT = '/future';
export const TAB_3_FRAGMENT = '/job-access';
export const TAB_4_FRAGMENT = '/services-access';
export const TAB_5_FRAGMENT = '/roads';
export const FAQ_TAB_FRAGMENT = '/faq';
export const COMPONENTS_ROUTE_FRAGMENT = '/components';
