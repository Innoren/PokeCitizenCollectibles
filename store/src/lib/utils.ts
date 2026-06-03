export function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numPrice);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'Common':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    case 'Uncommon':
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'Rare':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'Ultra Rare':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'Secret Rare':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}

export function getConditionColor(condition: string): string {
  switch (condition) {
    case 'Mint':
      return 'text-emerald-400';
    case 'Near Mint':
      return 'text-green-400';
    case 'Excellent':
      return 'text-blue-400';
    case 'Good':
      return 'text-yellow-400';
    case 'Played':
      return 'text-orange-400';
    default:
      return 'text-gray-400';
  }
}
