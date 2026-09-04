import React from 'react';
import {
  Home,
  ShoppingCart,
  Utensils,
  Car,
  Zap,
  Tv,
  ShoppingBag,
  HeartPulse,
  BookOpen,
  Plane,
  TrendingUp,
  Layers,
  LucideProps,
} from 'lucide-react';
import { CategoryId } from '../types';

interface CategoryIconProps extends LucideProps {
  categoryId: CategoryId | string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryId, ...props }) => {
  switch (categoryId) {
    case 'housing':
      return <Home {...props} />;
    case 'groceries':
      return <ShoppingCart {...props} />;
    case 'dining':
      return <Utensils {...props} />;
    case 'transport':
      return <Car {...props} />;
    case 'utilities':
      return <Zap {...props} />;
    case 'entertainment':
      return <Tv {...props} />;
    case 'shopping':
      return <ShoppingBag {...props} />;
    case 'health':
      return <HeartPulse {...props} />;
    case 'education':
      return <BookOpen {...props} />;
    case 'travel':
      return <Plane {...props} />;
    case 'investment':
      return <TrendingUp {...props} />;
    case 'other':
    default:
      return <Layers {...props} />;
  }
};
