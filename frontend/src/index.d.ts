/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'htl' {
  export const html: {
    <T extends HTMLElement | Text>(...args: any[]): T;
    fragment(...args: any[]): DocumentFragment;
  };
  export const svg: {
    <T extends SVGElement | Text>(...args: any[]): T;
    fragment(...args: any[]): DocumentFragment;
  };
}
