import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AccordionProps = {
  title: string;
  expanded?: boolean;
  children: React.ReactNode;
};

const Accordion = ({ title, expanded = false, children }: AccordionProps) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.title}>{title}</Text>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color="#000000" 
        />
      </Pressable>
      
      {isExpanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    maxHeight: 500,
  },
});

export default Accordion; 