import {
  TrendingUp,
  Target,
  Search,
  ListOrdered,
  PenTool,
  CheckSquare,
  Type,
  Image,
  FileText,
  Rocket,
  Mic,
  MessageSquare,
  Home,
} from 'lucide-react';

export const stepIcons: Record<string, React.ElementType> = {
  TrendingUp,
  Target,
  Search,
  ListOrdered,
  PenTool,
  CheckSquare,
  Type,
  Image,
  FileText,
  Rocket,
  Mic,
  MessageSquare,
};

export function getStepIcon(name: string): React.ElementType {
  return stepIcons[name] || FileText;
}
