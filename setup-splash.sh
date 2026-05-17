#!/bin/bash

echo "🎨 Splash Screen Kurulumu Başlıyor..."
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Paket kur
echo "${BLUE}📦 react-native-linear-gradient kuruluyor...${NC}"
npm install react-native-linear-gradient

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ Paket kuruldu!${NC}"
else
    echo "${YELLOW}⚠️  Paket kurulamadı, manuel kur: npm install react-native-linear-gradient${NC}"
fi

echo ""

# 2. iOS bağımlılıkları
echo "${BLUE}📱 iOS bağımlılıkları kuruluyor...${NC}"
cd ios
pod install
cd ..

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ iOS bağımlılıkları kuruldu!${NC}"
else
    echo "${YELLOW}⚠️  iOS bağımlılıkları kurulamadı${NC}"
fi

echo ""
echo "${GREEN}================================${NC}"
echo "${GREEN}✅ SPLASH SCREEN HAZIR!${NC}"
echo "${GREEN}================================${NC}"
echo ""
echo "📁 Oluşturulan dosyalar:"
echo "  - SplashScreen.tsx → src/features/dashboard/screens/"
echo "  - App.tsx (güncellenmiş)"
echo ""
echo "🚀 Çalıştırmak için:"
echo "  npm run ios"
echo ""
echo "${BLUE}🎨 Ne göreceksin:${NC}"
echo "  1. Yeşil gradient background"
echo "  2. ♿ Logo animasyonu"
echo "  3. 'parkihbar' yazısı"
echo "  4. 2.5 saniye sonra Dashboard"
echo ""
