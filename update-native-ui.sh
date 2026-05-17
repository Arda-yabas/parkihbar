#!/bin/bash

echo "📱 Platform-Specific Camera UI - Güncelleme"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ ! -f "package.json" ]; then
    echo "❌ parkihbar klasöründe değilsin!"
    exit 1
fi

echo "${BLUE}📦 React Native Vector Icons kuruluyor...${NC}"
npm install react-native-vector-icons --silent

echo "${GREEN}✅ Paket kuruldu!${NC}"
echo ""

echo "${BLUE}🔧 iOS pod güncelleniyor...${NC}"
cd ios
pod install --silent
cd ..

echo "${GREEN}✅ iOS hazır!${NC}"
echo ""

echo "${BLUE}✍️  Platform-specific Camera UI yazılıyor...${NC}"

# CameraScreen.tsx - Platform-specific
cat > src/features/camera/screens/CameraScreen.tsx << 'EOF'
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../../../theme';

export const CameraScreen = () => {
  const navigation = useNavigation();
  const [flash, setFlash] = useState(false);

  const handleTakePhoto = () => {
    Alert.alert(
      '📸 Fotoğraf Çekildi!',
      'Şimdi ihbar detaylarını girelim',
      [
        {
          text: 'Devam',
          onPress: () => navigation.navigate('Form' as never),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header - Platform Specific */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}>
          <Icon 
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
            size={28} 
            color="white" 
          />
        </TouchableOpacity>
        
        <Text style={styles.title}>İhbar Et</Text>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setFlash(!flash)}>
          <Icon 
            name={flash ? 'flash' : 'flash-off'} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      </View>

      {/* Camera Preview */}
      <View style={styles.cameraPreview}>
        <Icon name="camera-outline" size={80} color="rgba(255,255,255,0.3)" />
        <Text style={styles.previewText}>Kamera Görünümü</Text>
        <Text style={styles.hint}>
          Park ihlalini net bir şekilde{'\n'}
          fotoğraflayın
        </Text>
      </View>

      {/* Bottom Controls - Platform Specific */}
      <View style={styles.controls}>
        <View style={styles.controlsInner}>
          {/* Gallery Button */}
          <TouchableOpacity style={styles.iconButton}>
            <Icon 
              name={Platform.OS === 'ios' ? 'images-outline' : 'image'} 
              size={28} 
              color="white" 
            />
          </TouchableOpacity>

          {/* Capture Button - Native Style */}
          <TouchableOpacity 
            style={styles.captureButton}
            onPress={handleTakePhoto}>
            <View style={styles.captureOuter}>
              <View style={styles.captureInner} />
            </View>
          </TouchableOpacity>

          {/* Flip Button */}
          <TouchableOpacity style={styles.iconButton}>
            <Icon 
              name={Platform.OS === 'ios' ? 'camera-reverse-outline' : 'camera-reverse'} 
              size={28} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    color: 'white',
  },
  cameraPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  previewText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 16,
    marginBottom: 32,
    fontWeight: '500',
  },
  hint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  controls: {
    paddingVertical: Platform.OS === 'ios' ? 40 : 30,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  controlsInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
});
EOF

echo "  ✓ CameraScreen.tsx (Platform-specific)"

# FormScreen.tsx - Native butonlar
cat > src/features/camera/screens/FormScreen.tsx << 'EOF'
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, typography, spacing} from '../../../theme';

const VIOLATION_TYPES = [
  {id: 'disabled', label: 'Engelli Park Yeri', icon: 'accessibility'},
  {id: 'sidewalk', label: 'Kaldırım', icon: 'walk'},
  {id: 'crosswalk', label: 'Yaya Geçidi', icon: 'people'},
  {id: 'bike', label: 'Bisiklet Yolu', icon: 'bicycle'},
  {id: 'other', label: 'Diğer', icon: 'alert-circle'},
];

export const FormScreen = () => {
  const navigation = useNavigation();
  const [selectedType, setSelectedType] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!selectedType) {
      alert('Lütfen ihlal tipini seçin');
      return;
    }
    navigation.navigate('Success' as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header - Native */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon 
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
            size={28} 
            color={colors.text} 
          />
        </TouchableOpacity>
        <Text style={styles.title}>İhbar Detayları</Text>
        <View style={{width: 44}} />
      </View>

      <ScrollView style={styles.content}>
        {/* Photo Preview */}
        <View style={styles.photoPreview}>
          <Icon name="checkmark-circle" size={48} color={colors.primary} />
          <Text style={styles.photoText}>Fotoğraf kaydedildi</Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="location" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Konum</Text>
          </View>
          <View style={styles.locationCard}>
            <Text style={styles.locationText}>Beşiktaş, İstanbul</Text>
            <Text style={styles.locationSubtext}>Barbaros Bulvarı yakını</Text>
          </View>
        </View>

        {/* Violation Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İhlal Tipi</Text>
          <View style={styles.typeGrid}>
            {VIOLATION_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardSelected,
                ]}
                onPress={() => setSelectedType(type.id)}>
                <Icon 
                  name={type.icon} 
                  size={32} 
                  color={selectedType === type.id ? colors.primary : colors.textSecondary} 
                />
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type.id && styles.typeLabelSelected,
                  ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Açıklama (Opsiyonel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ek bilgi ekleyin..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={{height: 120}} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.submitButton,
            !selectedType && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedType}>
          <Text style={styles.submitText}>İhbar Et (+15p)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  photoPreview: {
    backgroundColor: 'white',
    margin: spacing.xl,
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  photoText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: colors.text,
  },
  locationCard: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: 12,
  },
  locationText: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  typeCard: {
    width: '47%',
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: 12,
    fontSize: typography.sizes.base,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    backgroundColor: 'white',
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 20 : spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.accent,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitText: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: 'white',
  },
});
EOF

echo "  ✓ FormScreen.tsx (Native icons)"

echo "${GREEN}✅ Platform-specific UI hazır!${NC}"
echo ""

echo "${GREEN}================================${NC}"
echo "${GREEN}📱 NATIVE UI HAZIR!${NC}"
echo "${GREEN}================================${NC}"
echo ""
echo "✨ Özellikler:"
echo "  ✓ iOS: SF Symbols benzeri Ionicons"
echo "  ✓ Android: Material Design icons"
echo "  ✓ Platform.OS ile otomatik seçim"
echo "  ✓ Native görünüm ve his"
echo ""
echo "📱 Test et:"
echo "  npm run ios"
echo ""
echo "🎨 Görünüm:"
echo "  • iOS: Geri ok (chevron), native butonlar"
echo "  • Android: Material back arrow, Material icons"
echo "  • Her platform kendi tarzı!"
echo ""
