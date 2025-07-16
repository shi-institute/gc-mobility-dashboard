import { Button } from '../Button/Button';

interface DeveloperDetailsProps {
  data: any[] | null;
}

/**
 * When in development mode, this component renders a details section
 * that allows developers to inspect the data used in the component.
 *
 * It includes a button to log the data to the console and a preformatted
 * text area that displays the data in a readable JSON format.
 *
 * Deeply nested objects and arrays are simplified to show their structure
 * without overwhelming detail, making it easier to understand the data at a glance
 * without using too much memory (rendered JSON only).
 */
export function DeveloperDetails(props: DeveloperDetailsProps) {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <details>
      <summary>Developer details</summary>
      <p>
        <strong>Data</strong>
      </p>
      <Button onClick={() => console.log(props.data)}>Log to console</Button>
      <pre style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {JSON.stringify(
          (props.data || []).map((o) =>
            Object.fromEntries(
              Object.entries(o).map(([key, value]) => {
                if (Array.isArray(value)) {
                  return [key, `Array(${value.length})`];
                }
                if (typeof value === 'object' && value !== null) {
                  return [
                    key,
                    Object.fromEntries(
                      Object.entries(value).map(([k, v]) => {
                        if (Array.isArray(v)) {
                          return [k, `Array(${v.length})`];
                        }
                        return [k, v];
                      })
                    ),
                  ];
                }
                return [key, value];
              })
            )
          ),
          null,
          2
        )}
      </pre>
    </details>
  );
}
