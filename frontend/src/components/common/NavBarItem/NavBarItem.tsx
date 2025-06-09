import styled from '@emotion/styled';

interface NavItemProps {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function NavBarItem(props: NavItemProps) {
  if (props.href) {
    return (
      <NavBarElement href={props.href} active={props.isActive}>
        <span className="nav-icon">{props.icon}</span>
        <span className="label">{props.label}</span>
      </NavBarElement>
    );
  }

  return (
    <NavBarElement onClick={props.onClick} active={props.isActive}>
      <span className="nav-icon">{props.icon}</span>
      <span className="label">{props.label}</span>
    </NavBarElement>
  );
}

const NavBarElement = styled.a<{ active?: boolean }>`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1.5rem 1fr;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: ${(props) => (props.active ? 'var(--color-primary)' : 'inherit')};
  font-size: 0.813rem;
  font-family: sans-serif;
  background: none;
  border: none;
  text-align: center;
  height: 4.25rem;
  gap: 0.25rem;
  padding: 0.5rem 0 0.25rem 0;
  box-sizing: border-box;
  line-height: 1.1;

  .nav-icon {
    display: inline-flex;
    justify-content: center;
    svg {
      block-size: 1.5rem;
      line-size: 1.5rem;
    }
  }

  &:hover {
    background-color: #f5f5f5;
    border-radius: 0.313rem;
  }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    letter-spacing: -0.01rem;
  }
`;
