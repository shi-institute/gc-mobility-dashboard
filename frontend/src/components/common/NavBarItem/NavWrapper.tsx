import styled from '@emotion/styled';

export const NavWrapper = styled.div`
  border-top: 1px solid #ccc;
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const NavBar = styled.nav`
  display: grid;
  gap: 2rem;
  justify-content: center;
  align-items: center;
  grid-template-columns: repeat(4, 1fr);

  @media (max-width: 600px) {
    gap: 0.5rem;
`;
