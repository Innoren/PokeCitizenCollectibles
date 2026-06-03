import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-6xl font-bold text-pokemon-yellow mb-4">404</h2>
        <p className="text-xl text-white mb-2">Page not found</p>
        <p className="text-gray-400 mb-6">The page you're looking for doesn't exist.</p>
        <Link
          href="/"
          className="px-6 py-3 bg-pokemon-yellow text-gray-900 font-semibold rounded-lg hover:bg-yellow-400 transition-colors inline-block"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
