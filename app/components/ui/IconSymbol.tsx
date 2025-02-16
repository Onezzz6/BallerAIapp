import { Ionicons } from '@expo/vector-icons';

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}

export default function IconSymbol({ name, size = 24, color = '#000000' }: Props) {
  return <Ionicons name={name} size={size} color={color} />;
} 