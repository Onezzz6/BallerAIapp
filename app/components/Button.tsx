import { Text, Pressable } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
}

export default function Button({ onPress, title }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#0056b3' : '#007AFF',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Text style={{
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
      }}>
        {title}
      </Text>
    </Pressable>
  );
} 