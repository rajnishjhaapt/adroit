import {
  Receipt, BookOpen, Building2, Users, BadgeCheck, Scale, FileWarning, Percent, Landmark, ShoppingCart, Briefcase,
} from "lucide-react";

export const ICONS = { Receipt, BookOpen, Building2, Users, BadgeCheck, Scale, FileWarning, Percent, Landmark, ShoppingCart, Briefcase };

export const ServiceIcon = ({ name, className = "h-6 w-6" }) => {
  const Icon = ICONS[name] || Briefcase;
  return <Icon className={className} strokeWidth={1.5} />;
};
