interface TreeMapProps {
  data: TreeMapEntry;
}

type TreeMapEntry = { name: string; value: number } | { name: string; children: TreeMapEntry[] };

export function TreeMap(props: TreeMapProps) {
  return <>Tree nao</>;
}
