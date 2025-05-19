import React, { useState } from 'react';
import { ScrollView, StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';

interface ScrollIfNeededProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ScrollIfNeeded({ children, style }: ScrollIfNeededProps) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const shouldScroll = contentHeight > viewportHeight && viewportHeight > 0;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setViewportHeight(height);
  };

  const handleContentSizeChange = (_width: number, height: number) => {
    setContentHeight(height);
  };

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={styles.contentContainer}
      scrollEnabled={shouldScroll}
      showsVerticalScrollIndicator={false}
      bounces={false}
      onLayout={handleLayout}
      onContentSizeChange={handleContentSizeChange}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
}); 