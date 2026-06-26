function calculateDiscount(originalPrice: number | null | undefined, price: number | null | undefined): number {
  if (!originalPrice || !price || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

function mapProduct(product: any) {
  return {
    _id: product.id,
    id: product.id,
    name: product.name,
    description: product.description ?? '',
    price: product.price,
    originalPrice: product.originalPrice ?? 0,
    image: product.image,
    category: product.category,
    unit: product.unit ?? 'piece',
    stock: product.stock ?? 0,
    isOrganic: product.isOrganic ?? false,
    rating: product.rating ?? 0,
    reviewCount: product.reviewCount ?? 0,
    discount: calculateDiscount(product.originalPrice, product.price),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function buildProductFilter(query: Record<string, string>) {
  const { q, category, organic, minPrice, maxPrice } = query;
  const where: any = {};

  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (category && category !== 'all') where.category = category;
  if (organic === 'true') where.isOrganic = true;

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }

  return where;
}

function buildProductSort(sort: string | undefined) {
  const sortMap: Record<string, any> = {
    price_asc: { price: 'asc' },
    price_desc: { price: 'desc' },
    rating: { rating: 'desc' },
    name: { name: 'asc' },
  };
  return sortMap[sort ?? ''] ?? { createdAt: 'desc' };
}

function getPaginationParams(page: string, limit: string) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

export { calculateDiscount, mapProduct, buildProductFilter, buildProductSort, getPaginationParams };
