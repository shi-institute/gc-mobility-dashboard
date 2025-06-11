import { useLocation, useNavigate } from 'react-router';
import { Tab, Tabs } from '../common';
import {
  TAB_1_FRAGMENT,
  TAB_2_FRAGMENT,
  TAB_3_FRAGMENT,
  TAB_4_FRAGMENT,
  TAB_5_FRAGMENT,
} from './constants';

export function AppNavigation() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const handleClick =
    (to: string) => (evt: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement, MouseEvent>) => {
      evt.preventDefault();
      navigate(to);
    };

  return (
    <Tabs>
      <Tab
        label="General Access"
        href={'#' + TAB_1_FRAGMENT + search}
        isActive={pathname === TAB_1_FRAGMENT}
        onClick={handleClick(TAB_1_FRAGMENT + search)}
      />
      <Tab
        label="Future Opportunities"
        href={'#' + TAB_2_FRAGMENT + search}
        isActive={pathname === TAB_2_FRAGMENT}
        onClick={handleClick(TAB_2_FRAGMENT + search)}
      />
      <Tab
        label="Job Access"
        href={'#' + TAB_3_FRAGMENT + search}
        isActive={pathname === TAB_3_FRAGMENT}
        onClick={handleClick(TAB_3_FRAGMENT + search)}
      />
      <Tab
        label="Access to Essential Services"
        href={'#' + TAB_4_FRAGMENT + search}
        isActive={pathname === TAB_4_FRAGMENT}
        onClick={handleClick(TAB_4_FRAGMENT + search)}
      />
      <Tab
        label="Roads or Transit?"
        href={'#' + TAB_5_FRAGMENT + search}
        isActive={pathname === TAB_5_FRAGMENT}
        onClick={handleClick(TAB_5_FRAGMENT + search)}
      />
    </Tabs>
  );
}
