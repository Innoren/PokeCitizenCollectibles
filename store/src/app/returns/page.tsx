export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Return Policy</h1>

      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-gray-700">
          Due to fluctuating market conditions all sales are final.
        </p>

        <p className="text-gray-700">
          If you have any issues or concerns with your order we will always work with you to rectify
          the situation. Please contact our customer service department and they will be happy to
          assist you!
        </p>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Service:</h2>
          <a
            href="mailto:pokecitizenpacks@gmail.com"
            className="text-pokemon-red hover:underline"
          >
            pokecitizenpacks@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}
