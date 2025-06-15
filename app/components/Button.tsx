import { Text, Pressable, View, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../utils/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  containerStyle?: ViewStyle;
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
};

export default function Button({ 
  title, 
  onPress, 
  containerStyle,
  buttonStyle,
  textStyle,
  disabled = false 
}: ButtonProps) {
  return (
    <View style={containerStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => ({
          backgroundColor: colors.brandBlue,
          padding: 16,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          ...(buttonStyle as object),
        })}
      >
        <Text style={[
          {
            color: colors.white,
            fontSize: 18,
            fontWeight: '600',
            textAlign: 'center',
          },
          textStyle
        ]}>
          {title}
        </Text>
      </Pressable>
    </View>
  );
} 