import CardItem from './CardItem';
import type { Card } from '@/db/schema';

interface CardGridProps {
  cards: Card[];
  title?: string;
}

export default function CardGrid({ cards, title }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No cards found</h3>
        <p className="text-gray-500">Try adjusting your search or filters — or check back soon for new arrivals</p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">{title}</h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
