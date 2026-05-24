import React, {useRef, useState, useMemo, useEffect} from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Platform, Animated,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {generateMessage, ShareInfo} from '../../../utils/messageGenerator';

const EGM_URL = 'https://ihbar.ng112.gov.tr/';
const EGM_UA  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const buildDescScript = (info: ShareInfo): string => {
  const description = generateMessage(info, 'egm');
  const esc = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');

  return `
(function() {
  function fillDesc() {
    var ta = document.getElementById('description')
          || document.getElementById('olayDetay')
          || document.getElementById('aciklama')
          || document.querySelector('textarea')
          || document.querySelector('.ant-input[placeholder]');
    if (!ta) return false;
    var nsd = Object.getOwnPropertyDescriptor(
      ta.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'
    );
    if (nsd && nsd.set) nsd.set.call(ta, '${esc(description)}'); else ta.value = '${esc(description)}';
    var fk = Object.keys(ta).find(function(k) {
      return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance');
    });
    if (fk) {
      var fiber = ta[fk], depth = 0;
      while (fiber && depth++ < 40) {
        if (fiber.memoizedProps) {
          var h = fiber.memoizedProps.onChange || fiber.memoizedProps.onInput;
          if (typeof h === 'function') {
            try { h({target: ta, currentTarget: ta, preventDefault: function(){}, stopPropagation: function(){}}); } catch(e) {}
            break;
          }
        }
        fiber = fiber.return;
      }
    }
    ta.dispatchEvent(new Event('input',  {bubbles: true}));
    ta.dispatchEvent(new Event('change', {bubbles: true}));
    return true;
  }

  var attempts = 0;
  var interval = setInterval(function() {
    attempts++;
    if (fillDesc() || attempts > 60) clearInterval(interval);
  }, 300);
  true;
})();
`;
};

export const EGMWebViewScreen = () => {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const {colors}   = useTheme();
  const styles     = useMemo(() => makeStyles(colors), [colors]);
  const webViewRef = useRef<WebView>(null);

  const [webLoading,    setWebLoading]    = useState(true);
  const [canGoBack,     setCanGoBack]     = useState(false);
  const [cardVisible,   setCardVisible]   = useState(true);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scriptFired = useRef(false);

  const info = (route.params as any)?.info as ShareInfo | undefined;

  useEffect(() => {
    if (info) {
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        delay: 1000,
        tension: 60,
        friction: 14,
      }).start();
    }
  }, []);

  useEffect(() => {
    if (!webLoading && info && !scriptFired.current && webViewRef.current) {
      scriptFired.current = true;
      webViewRef.current.injectJavaScript(buildDescScript(info) + '\ntrue;');
    }
  }, [webLoading]);

  const dismissCard = () => {
    Animated.timing(cardAnim, {toValue: 0, duration: 250, useNativeDriver: true}).start(() =>
      setCardVisible(false),
    );
  };

  const loc = info?.location;
  const rows = [
    {label: 'İl',      value: loc?.city},
    {label: 'İlçe',    value: loc?.district},
    {label: 'Mahalle', value: loc?.neighbourhood},
    {label: 'Cadde',   value: loc?.road},
  ].filter(r => r.value);

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => canGoBack ? webViewRef.current?.goBack() : navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.6}>
          <Text style={[styles.backIcon, {color: colors.primary}]}>
            {Platform.OS === 'ios' ? '‹' : '←'}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>EGM İhbar Formu</Text>
          <Text style={styles.headerSub}>ihbar.ng112.gov.tr</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {webLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{uri: EGM_URL}}
        style={styles.webview}
        onLoadEnd={() => setWebLoading(false)}
        onError={() => setWebLoading(false)}
        onNavigationStateChange={s => setCanGoBack(s.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        userAgent={EGM_UA}
      />

      {info && cardVisible && rows.length > 0 && (
        <Animated.View
          style={[
            styles.locationCard,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              transform: [{translateY: cardAnim.interpolate({inputRange: [0, 1], outputRange: [220, 0]})}],
              opacity: cardAnim,
            },
          ]}>
          <View style={styles.locationCardHeader}>
            <Text style={styles.locationCardTitle}>📍 Konum bilgilerin</Text>
            <TouchableOpacity onPress={dismissCard} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <Text style={styles.locationCardClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.locationCardHint}>
            Forma girerken bu bilgileri kullan — açıklama kutusu otomatik dolduruldu.
          </Text>
          <View style={styles.locationCardRows}>
            {rows.map(r => (
              <View key={r.label} style={styles.locationCardRow}>
                <Text style={styles.locationCardLabel}>{r.label}</Text>
                <Text style={styles.locationCardValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container:      {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    paddingVertical: 10, paddingHorizontal: 8,
  },
  backBtn:        {width: 44, height: 40, justifyContent: 'center', alignItems: 'center'},
  backIcon:       {fontSize: 38, fontWeight: '300', lineHeight: 42, marginTop: -4},
  headerCenter:   {flex: 1, alignItems: 'center'},
  headerTitle:    {fontSize: 16, fontWeight: '700', color: colors.text},
  headerSub:      {fontSize: 11, color: colors.textSecondary, marginTop: 1},
  webview:        {flex: 1},
  loadingOverlay: {
    position: 'absolute', top: 70, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  loadingText: {marginTop: 12, fontSize: 14, color: colors.textSecondary},
  locationCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: -3},
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  locationCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  locationCardTitle:  {fontSize: 14, fontWeight: '700', color: colors.text},
  locationCardClose:  {fontSize: 16, color: colors.textSecondary, fontWeight: '500'},
  locationCardHint:   {fontSize: 11, color: colors.textSecondary, marginBottom: 10, lineHeight: 15},
  locationCardRows:   {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  locationCardRow: {
    backgroundColor: colors.background,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  locationCardLabel: {fontSize: 10, fontWeight: '700', color: colors.primary, textTransform: 'uppercase'},
  locationCardValue: {fontSize: 12, fontWeight: '500', color: colors.text},
});
