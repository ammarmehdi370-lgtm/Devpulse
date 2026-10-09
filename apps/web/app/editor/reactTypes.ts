export const REACT_TYPE_DEFINITIONS = `
declare module "react" {
  namespace React {
    type Key = string | number;
    type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[];
    interface ReactElement<P = unknown> {
      type: unknown;
      props: P;
      key: Key | null;
    }
    interface FunctionComponent<P = {}> {
      (props: P): ReactElement | null;
    }
    type FC<P = {}> = FunctionComponent<P>;
    function createElement(type: unknown, props?: unknown, ...children: ReactNode[]): ReactElement;
    function useState<S>(initialState: S | (() => S)): [S, (value: S | ((previous: S) => S)) => void];
    function useEffect(effect: () => void | (() => void), dependencies?: readonly unknown[]): void;
  }
  export = React;
}

declare namespace JSX {
  interface Element {
    type: unknown;
    props: unknown;
    key: string | number | null;
  }
  interface IntrinsicElements {
    [elementName: string]: { [attribute: string]: unknown };
  }
}

declare namespace React {
  namespace JSX {
    interface Element {
      type: unknown;
      props: unknown;
      key: string | number | null;
    }
    interface IntrinsicElements {
      [elementName: string]: { [attribute: string]: unknown };
    }
  }
}
`;
