import styled from '@emotion/styled';

export const NavBar = styled.nav`
  display: grid;
  border-top: 1px solid #ccc;
  gap: 2rem;
  justify-content: center;
  align-items: center;
  grid-template-columns: repeat(4, 1fr);

  @media (max-width: 600px) {
    gap: 0.5rem;
  }
`;
