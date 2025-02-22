import { Text, Pressable, View, ViewStyle } from 'react-native';

type ButtonProps = {
  title: string;
  onPress: () => void;
  containerStyle?: ViewStyle;
  buttonStyle?: ViewStyle;
  disabled?: boolean;
};

export default function Button({ 
  title, 
  onPress, 
  containerStyle,
  buttonStyle,
  disabled = false 
}: ButtonProps) {
  return (
    <View style={containerStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => ({
          backgroundColor: '#007AFF',
          padding: 16,
          borderRadius: 100,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          ...(buttonStyle as object),
        })}
      >
        <Text style={{
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: '600',
          textAlign: 'center',
        }}>
          {title}
        </Text>
      </Pressable>
    </View>
  );
} 