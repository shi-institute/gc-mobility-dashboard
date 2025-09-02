type FlattenedKeys<T, P extends string = ''> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? T[K] extends any[]
      ? `${P}${string & K}`
      : FlattenedKeys<T[K], `${P}${string & K}.`>
    : `${P}${string & K}`;
}[keyof T];

type FlattenedObject<T> = {
  [K in FlattenedKeys<T>]: any;
};

export function flattenObject<T extends Record<string, any>>(
  obj: T,
  parentKey = '' as string,
  result = {} as FlattenedObject<T>
): FlattenedObject<T> {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, newKey, result);
    } else {
      result[newKey as keyof FlattenedObject<T>] = value;
    }
  }
  return result;
}
