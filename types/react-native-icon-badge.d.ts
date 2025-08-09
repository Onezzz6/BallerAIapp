declare module 'react-native-icon-badge' {
  import { Component } from 'react';
  import { ViewStyle, TextStyle } from 'react-native';

  interface IconBadgeProps {
    MainElement: React.ReactNode;
    BadgeElement: React.ReactNode;
    IconBadgeStyle?: ViewStyle;
    Hidden?: boolean;
  }

  export default class IconBadge extends Component<IconBadgeProps> {}
} 