import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const STEPS = ['Fotoğraf', 'Detaylar', 'Yayın'];

interface Props {
  currentStep: 1 | 2 | 3;
  dark?: boolean;
}

export const FlowStepper: React.FC<Props> = ({currentStep, dark = false}) => {
  const textColor    = dark ? 'rgba(255,255,255,0.9)' : '#333';
  const subColor     = dark ? 'rgba(255,255,255,0.45)' : '#999';
  const activeColor  = '#E53935';
  const doneColor    = '#43A047';
  const lineColor    = dark ? 'rgba(255,255,255,0.25)' : '#DDD';
  const lineDone     = doneColor;

  return (
    <View style={styles.container}>
      {STEPS.map((label, i) => {
        const step      = i + 1;
        const isDone    = step < currentStep;
        const isActive  = step === currentStep;
        const circleColor = isDone ? doneColor : isActive ? activeColor : (dark ? 'rgba(255,255,255,0.2)' : '#E0E0E0');
        const numColor    = isDone || isActive ? '#FFF' : subColor;

        return (
          <React.Fragment key={step}>
            {/* Step circle + label */}
            <View style={styles.stepWrap}>
              <View style={[styles.circle, {backgroundColor: circleColor}]}>
                <Text style={[styles.circleText, {color: numColor}]}>
                  {isDone ? '✓' : step}
                </Text>
              </View>
              <Text style={[styles.label, {color: isActive ? (dark ? '#FFF' : '#111') : subColor, fontWeight: isActive ? '700' : '400'}]}>
                {label}
              </Text>
            </View>

            {/* Connector line between steps */}
            {i < STEPS.length - 1 && (
              <View style={[styles.line, {backgroundColor: isDone ? lineDone : lineColor}]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  stepWrap: {alignItems: 'center', gap: 4},
  circle: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  circleText: {fontSize: 12, fontWeight: '700'},
  label:      {fontSize: 10, letterSpacing: 0.2},
  line:       {flex: 1, height: 2, marginHorizontal: 6, marginBottom: 14, borderRadius: 1},
});
