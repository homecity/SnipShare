import type { Metadata } from 'next';
import DiffClient from './DiffClient';

export const metadata: Metadata = {
  title: 'Diff Tool - Compare Text & Code',
  description: 'Compare two text or code snippets side by side with syntax highlighting. Free online diff tool.',
};

export default function DiffPage() {
  return <DiffClient />;
}
