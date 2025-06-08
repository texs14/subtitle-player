import dynamic from 'next/dynamic';

const NextApp = dynamic(() => import('../NextApp'), { ssr: false });

export default function Home() {
  return <NextApp />;
}
