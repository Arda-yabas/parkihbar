import React, {useRef, useState, useMemo, useEffect} from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Platform, Alert,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {generateMessage, ShareInfo} from '../../../utils/messageGenerator';

// ── EGM API ──────────────────────────────────────────────────────────────────
const EGM_BASE  = 'https://ihbar.ng112.gov.tr/api';
const EGM_CSRF  = 'fb8484f40e6dfc6a9d674b870a4a369dca696321a2be2e8e4f3f9bc241ef97bb';
const EGM_UA    = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

interface EGMItem { id: number; label: string; }

interface EGMLocation {
  token: string;
  city:         string;
  district:     string;
  neighbourhood: string;
  road:         string;
}

const egmHeaders = (token: string): Record<string, string> => ({
  Authorization:    `Bearer ${token}`,
  Accept:           'application/json',
  'User-Agent':     EGM_UA,
  Referer:          'https://ihbar.ng112.gov.tr/',
  'X-CSRF-Token':   EGM_CSRF,
});

/* EGM suffix normalization — strip "MAH.", "SK.", "CD.", "CAD.", "BLV." etc. */
const normEGM = (s: string): string => {
  let t = s.toLocaleLowerCase('tr-TR').trim();
  const suffixes = [
    'mahallesi','mahalle','mah\\.','mah',
    'caddesi','cadde','cad\\.','cad','cd\\.','cd',
    'sokağı','sokak','sok\\.','sok','sk\\.','sk',
    'bulvarı','bulvar','blv\\.','blv','bul\\.','bul',
    'çıkmazı','çıkmaz','çk\\.','çk',
    'yolu','yol','köyü','köy','sitesi','sit\\.','sit',
  ];
  for (const w of suffixes) {
    t = t.replace(new RegExp(`(^|\\s)${w}(\\s|$)`, 'g'), ' ');
  }
  /* Boşlukları sıkıştır, tire/nokta DOKUNMA */
  return t.replace(/\s+/g, ' ').trim();
};

/* "Cafer Ağa" ↔ "CAFERAĞA" gibi boşluk farkını da handle et */
const squeezed = (s: string) => s.replace(/\s+/g, '');

const findBestMatch = (items: EGMItem[], search: string): EGMItem | null => {
  if (!search || !items.length) return null;
  const ns = normEGM(search);
  const nsq = squeezed(ns);

  for (const item of items) {
    const ne  = normEGM(item.label);
    const neq = squeezed(ne);
    if (!ne) continue;
    if (ne === ns || neq === nsq) return item;
    const shorter = ne.length <= ns.length ? ne : ns;
    const longer  = ne.length <= ns.length ? ns : ne;
    if (shorter.length >= 3 && longer.includes(shorter)) return item;
    /* boşluk-sıkıştırılmış substring */
    const shq = neq.length <= nsq.length ? neq : nsq;
    const loq = neq.length <= nsq.length ? nsq : neq;
    if (shq.length >= 3 && loq.includes(shq)) return item;
  }
  return null;
};

const egmFetch = async (url: string, token: string) => {
  const res = await fetch(url, {headers: egmHeaders(token)});
  const json = await res.json() as {result: EGMItem[]; success: boolean};
  if (!json.success || !json.result) throw new Error(`EGM fetch failed: ${url}`);
  return json.result;
};

const resolveEGMLocation = async (info: ShareInfo): Promise<EGMLocation | null> => {
  try {
    /* 1. IP al */
    const ipRes  = await fetch('https://api.ipify.org?format=json');
    const {ip}   = await ipRes.json() as {ip: string};
    const encoded = btoa(ip).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    /* 2. EGM token al */
    const tokenRes  = await fetch(`${EGM_BASE}/login?localData=${encoded}`, {
      headers: {'Accept': 'application/json', 'User-Agent': EGM_UA, Referer: 'https://ihbar.ng112.gov.tr/'},
    });
    const tokenJson = await tokenRes.json() as {result?: {token: string}; success: boolean};
    const token     = tokenJson.result?.token;
    if (!token) return null;

    /* 3. Şehir */
    const cities  = await egmFetch(`${EGM_BASE}/location/get-city`, token);
    const city    = findBestMatch(cities, info.location.city ?? '');
    if (!city) { console.log('[EGM] şehir bulunamadı:', info.location.city); return null; }

    /* 4. İlçe */
    const districts = await egmFetch(`${EGM_BASE}/location/get-district?cityId=${city.id}`, token);
    const district  = findBestMatch(districts, info.location.district ?? '');
    if (!district) { console.log('[EGM] ilçe bulunamadı:', info.location.district); return null; }

    /* 5. Mahalle */
    const hoods = await egmFetch(`${EGM_BASE}/location/get-neighborhood?districtId=${district.id}`, token);
    const hood  = findBestMatch(hoods, info.location.neighbourhood ?? '');

    /* 6. Cadde/Sokak */
    let street: EGMItem | null = null;
    if (hood && info.location.road) {
      const streets = await egmFetch(`${EGM_BASE}/location/get-street?neighborhoodId=${hood.id}`, token);
      street = findBestMatch(streets, info.location.road);
    }

    console.log('[EGM] çözüldü →', city.label, '/', district.label, '/', hood?.label, '/', street?.label);

    return {
      token,
      city:          city.label,
      district:      district.label,
      neighbourhood: hood?.label    ?? '',
      road:          street?.label  ?? '',
    };
  } catch (e) {
    console.log('[EGM] ön-çözüm hatası:', e);
    return null;
  }
};

const EGM_URL = 'https://ihbar.ng112.gov.tr/';

const buildFillScript = (info: ShareInfo, egm?: EGMLocation | null): string => {
  const description   = generateMessage(info, 'egm');
  /* EGM'den çözüldüyse exact label kullan, yoksa Nominatim fallback */
  const city          = egm?.city          || info.location.city          || '';
  const district      = egm?.district      || info.location.district      || '';
  const neighbourhood = egm?.neighbourhood || info.location.neighbourhood || '';
  const road          = egm?.road          || info.location.road          || '';

  const esc = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');

  return `
(function() {
  var CITY  = '${esc(city)}';
  var DIST  = '${esc(district)}';
  var HOOD  = '${esc(neighbourhood)}';
  var ROAD  = '${esc(road)}';
  var DESC  = '${esc(description)}';

  function dbg(msg) {
    try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({t:'dbg', m: String(msg)})); } catch(e) {}
  }

  /* ── Turkish char normalizer: ğ→g, ş→s, ı→i, ö→o, ü→u, ç→c ─────────── */
  function normTR(s) {
    return s
      .replace(/ğ/g,'g').replace(/ş/g,'s').replace(/ı/g,'i')
      .replace(/ö/g,'o').replace(/ü/g,'u').replace(/ç/g,'c');
  }

  /* ── Strip address type words, preserve punctuation/numbers ───────────── */
  function normAddr(s) {
    var t = s.toLocaleLowerCase('tr-TR').trim();
    var words = [
      'mahallesi','mahalle','mah\\.','mah',
      'caddesi','cadde','cad\\.','cad','cd\\.','cd',
      'sokağı','sokak','sok\\.','sok','sk\\.','sk',
      'bulvarı','bulvar','bul\\.','bul','blv\\.','blv',
      'köyü','köy','sitesi','sit\\.','sit',
      'yolu','yol','kavşağı','kavşak',
      'no\\.?\\s*\\d+[a-zığşöüç]?',
    ];
    for (var wi = 0; wi < words.length; wi++) {
      t = t.replace(new RegExp('(^|\\s)' + words[wi] + '(\\s|$)', 'g'), ' ');
    }
    /* Sadece fazla boşlukları temizle — tire/nokta DOKUNMA ("2-5-6." bozulmasın) */
    return t.replace(/\s+/g, ' ').trim();
  }

  /* ── Puntuation-blind version for fuzzy compare ────────────────────────── */
  function stripPunct(s) {
    return s.replace(/[^a-zğşıöüç\d\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ── First significant word (for broad fallback search) ──────────────── */
  function firstWord(s) {
    var norm = normAddr(s);
    var parts = norm.split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].replace(/[^a-zğşıöüçı]/g, '');
      if (p.length >= 3) return p;
    }
    return norm.split(/\s+/)[0] || norm;
  }

  /* ── Match two address strings — 4 kademeli karşılaştırma ───────────── */
  function addrMatch(egmText, searchText) {
    var ne = normAddr(egmText);
    var ns = normAddr(searchText);
    if (!ne || !ns) return false;

    /* 1. Tam eşleşme */
    if (ne === ns) return true;

    /* 2. Noktalama körü eşleşme ("2-5-6" == "2 5 6" için) */
    var nep = stripPunct(ne), nsp = stripPunct(ns);
    if (nep && nsp && nep === nsp) return true;

    /* 3. Substring (kısa olan ≥4 karakter olmalı) */
    var shorter = ne.length <= ns.length ? ne : ns;
    var longer  = ne.length <= ns.length ? ns : ne;
    if (shorter.length >= 4 && longer.includes(shorter)) return true;

    /* 4. Türkçe karakter normalizasyonu ile tekrar (I→ı, İ→i farkları) */
    var neTR = normTR(nep), nsTR = normTR(nsp);
    if (neTR && nsTR && neTR === nsTR) return true;
    var shTR = neTR.length <= nsTR.length ? neTR : nsTR;
    var loTR = neTR.length <= nsTR.length ? nsTR : neTR;
    if (shTR.length >= 4 && loTR.includes(shTR)) return true;

    /* 5. Noktalama körü substring */
    var shP = nep.length <= nsp.length ? nep : nsp;
    var loP = nep.length <= nsp.length ? nsp : nep;
    return shP.length >= 4 && loP.includes(shP);
  }

  /* ── Fill textarea ────────────────────────────────────────────────────── */
  function fillDesc() {
    var ta = document.getElementById('description')
          || document.getElementById('olayDetay')
          || document.getElementById('aciklama')
          || document.querySelector('textarea')
          || document.querySelector('.ant-input[placeholder]');
    if (!ta || !DESC) { dbg('fillDesc: textarea not found'); return; }

    /* 1. Set native value via prototype setter (bypasses React's tracker) */
    var nsd = Object.getOwnPropertyDescriptor(
      ta.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    );
    if (nsd && nsd.set) nsd.set.call(ta, DESC); else ta.value = DESC;

    /* 2. Call React's onChange via fiber — needed so form state updates */
    var fk = Object.keys(ta).find(function(k) {
      return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance');
    });
    var fiberCalled = false;
    if (fk) {
      var fiber = ta[fk], depth = 0;
      while (fiber && depth++ < 40) {
        if (fiber.memoizedProps) {
          var h = fiber.memoizedProps.onChange || fiber.memoizedProps.onInput;
          if (typeof h === 'function') {
            try { h({target: ta, currentTarget: ta, preventDefault: function(){}, stopPropagation: function(){}}); fiberCalled = true; } catch(e) {}
            break;
          }
        }
        fiber = fiber.return;
      }
    }

    /* 3. DOM events as additional signal */
    ta.dispatchEvent(new Event('input',  {bubbles: true}));
    ta.dispatchEvent(new Event('change', {bubbles: true}));
    dbg('fillDesc: fiberCalled=' + fiberCalled + ' len=' + ta.value.length);
  }

  /* ── Select option: fiber onClick (en güvenilir), el.click() fallback ── */
  function selectOption(el) {
    var fk = Object.keys(el).find(function(k) {
      return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance');
    });
    var fiberOk = false;
    if (fk) {
      var fiber = el[fk];
      if (fiber && fiber.memoizedProps && typeof fiber.memoizedProps.onClick === 'function') {
        try {
          fiber.memoizedProps.onClick({
            preventDefault: function(){}, stopPropagation: function(){},
            target: el, currentTarget: el, nativeEvent: {target: el},
          });
          fiberOk = true;
        } catch(e) {}
      }
    }
    /* Fiber çalışmadıysa native click — ama yalnızca birini çağır */
    if (!fiberOk) {
      try { el.click(); } catch(e) {}
    }
  }

  /* ── Call onSearch via fiber ──────────────────────────────────────────── */
  function callOnSearch(searchInput, text) {
    var fk = Object.keys(searchInput).find(function(k) {
      return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance');
    });
    if (fk) {
      var f = searchInput[fk], n = 0;
      while (f && n++ < 60) {
        if (f.memoizedProps && typeof f.memoizedProps.onSearch === 'function') {
          try { f.memoizedProps.onSearch(text); return true; } catch(e) {}
        }
        f = f.return;
      }
    }
    /* Fallback: native setter + input event */
    var tracker = searchInput._valueTracker;
    if (tracker) tracker.setValue('');
    var ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (ns) ns.set.call(searchInput, text); else searchInput.value = text;
    searchInput.dispatchEvent(new Event('input', {bubbles: true}));
    searchInput.dispatchEvent(new Event('change', {bubbles: true}));
    return false;
  }

  /* ── Find the visible dropdown container ─────────────────────────────── */
  function getVisibleDropdown() {
    var ds = document.querySelectorAll('.ant-select-dropdown');
    for (var d = 0; d < ds.length; d++) {
      var cs = window.getComputedStyle(ds[d]);
      if (cs.display !== 'none' && !ds[d].classList.contains('ant-select-dropdown-hidden')) {
        return ds[d];
      }
    }
    return null;
  }

  /* ── Open a select and choose the best matching option ───────────────── */
  function openAndSelect(inputId, searchText, fallbackOrder, then) {
    if (!searchText) { dbg('skip ' + inputId + ': empty text'); if (then) then(); return; }

    /* Find the select wrapper — by ID first, then by DOM order */
    var wrapper = null;
    var input = document.getElementById(inputId);
    if (input) {
      wrapper = input.closest ? input.closest('.ant-select') : null;
    }
    if (!wrapper) {
      /* Fallback: find all top-level ant-select elements and pick by order */
      var allSelects = document.querySelectorAll('.ant-form-item .ant-select, .ant-row .ant-select');
      if (allSelects[fallbackOrder]) wrapper = allSelects[fallbackOrder];
    }
    if (!wrapper) {
      dbg('NOT FOUND: ' + inputId + ' (order=' + fallbackOrder + ')');
      if (then) then();
      return;
    }

    /* Wait if disabled */
    if (wrapper.classList.contains('ant-select-disabled')) {
      var retries = 0;
      var wait = setInterval(function() {
        retries++;
        if (!wrapper.classList.contains('ant-select-disabled')) {
          clearInterval(wait);
          dbg(inputId + ' enabled after ' + retries + ' retries');
          openAndSelect(inputId, searchText, fallbackOrder, then);
        } else if (retries > 40) {
          clearInterval(wait);
          dbg(inputId + ' still disabled after 12s — skipping');
          if (then) then();
        }
      }, 300);
      return;
    }

    /* Open the dropdown */
    var selector = wrapper.querySelector('.ant-select-selector');
    if (selector) {
      selector.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
      selector.dispatchEvent(new MouseEvent('click',     {bubbles: true, cancelable: true}));
    }

    setTimeout(function() {
      var searchInput = wrapper.querySelector('input');
      if (searchInput) {
        /* Önce orijinal metni dene — EGM'de doğru büyük harf görünür.
           Sonuç bulunamazsa normAddr ile tekrar dener (suffix farkları için). */
        var didFiber = callOnSearch(searchInput, searchText);
        dbg(inputId + ' onSearch("' + searchText + '") fiber=' + didFiber);
      }

      var normSearch = normAddr(searchText);
      var firstW     = firstWord(searchText);
      var attempts   = 0;
      var retryCount = 0; /* 0=original tried, 1=norm tried, 2=firstWord tried */
      var skipTicks  = 0; /* wait N ticks after a new search before re-checking */

      var poll = setInterval(function() {
        attempts++;

        if (skipTicks > 0) { skipTicks--; return; }

        var dropdown = getVisibleDropdown();
        if (!dropdown) {
          if (attempts > 30) { clearInterval(poll); if (then) then(); }
          return;
        }

        /* Empty result → retry with next strategy */
        if (dropdown.querySelector('.ant-select-item-empty, .ant-empty')) {
          if (retryCount === 0 && searchInput) {
            retryCount = 1; skipTicks = 3;
            dbg(inputId + ': "Veri Yok" with original, retrying norm: ' + normSearch);
            callOnSearch(searchInput, normSearch);
          } else if (retryCount === 1 && searchInput && firstW !== normSearch) {
            retryCount = 2; skipTicks = 3;
            dbg(inputId + ': "Veri Yok" with norm, retrying firstWord: ' + firstW);
            callOnSearch(searchInput, firstW);
          } else {
            clearInterval(poll);
            dbg(inputId + ': no match after retries — skipping');
            if (then) setTimeout(then, 200);
          }
          return;
        }

        var items = dropdown.querySelectorAll('.ant-select-item-option');
        for (var i = 0; i < items.length; i++) {
          var contentEl = items[i].querySelector('.ant-select-item-option-content');
          if (!contentEl) continue;
          var optText = contentEl.textContent.trim();
          if (addrMatch(optText, searchText)) {
            clearInterval(poll);
            dbg(inputId + ': matched "' + optText + '" for "' + searchText + '"');
            selectOption(items[i]);
            /* React state + EGM API'nin yüklenmesi için yeterli süre */
            setTimeout(function() { if (then) then(); }, 800);
            return;
          }
        }

        if (attempts > 40) {
          clearInterval(poll);
          dbg(inputId + ': timeout — no match found among ' + items.length + ' options');
          if (then) then();
        }
      }, 150);
    }, 250);
  }

  /* ── Wait until the form dropdowns are ready ────────────────────────── */
  function waitForm(cb, n) {
    n = n || 0;
    var selects = document.querySelectorAll('.ant-select');
    if (selects.length >= 2) {
      dbg('form ready at n=' + n + ' selects=' + selects.length);
      cb();
      return;
    }
    var el = document.getElementById('description')
          || document.getElementById('olayDetay')
          || document.getElementById('aciklama')
          || document.querySelector('textarea')
          || document.querySelector('.ant-input[placeholder]');
    if (el) {
      dbg('form ready (textarea) at n=' + n);
      cb();
      return;
    }
    if (n > 100) { dbg('TIMEOUT: form element not found after 20s'); return; }
    setTimeout(function() { waitForm(cb, n + 1); }, 200);
  }

  /* ── EGM auto-login + data yüklenene kadar city dropdown'ı bekle ─────── */
  function waitForCityOptions(cb, n) {
    n = n || 0;
    /* DOM'da city wrapper'ı bul */
    var cityInput = document.getElementById('cityDropdown');
    var wrapper = cityInput
      ? (cityInput.closest ? cityInput.closest('.ant-select') : null)
      : document.querySelectorAll('.ant-form-item .ant-select, .ant-row .ant-select')[0];

    if (!wrapper) {
      if (n > 20) { dbg('waitForCityOptions: wrapper not found'); cb(); return; }
      setTimeout(function() { waitForCityOptions(cb, n + 1); }, 300);
      return;
    }

    /* Dropdown'ı aç, option sayısına bak, hemen kapat */
    var sel = wrapper.querySelector('.ant-select-selector');
    if (sel) {
      sel.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
      sel.dispatchEvent(new MouseEvent('click',     {bubbles: true, cancelable: true}));
    }
    setTimeout(function() {
      var dropdown = getVisibleDropdown();
      var items = dropdown ? dropdown.querySelectorAll('.ant-select-item-option').length : 0;
      /* Dropdown'ı kapat */
      document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));

      dbg('waitForCityOptions n=' + n + ' items=' + items);
      if (items > 0 || n > 24) {
        /* Kısa bekleme — kapat animasyonu bitsin */
        setTimeout(cb, 400);
      } else {
        /* EGM henüz token almadı / şehir listesi gelmedi, tekrar dene */
        setTimeout(function() { waitForCityOptions(cb, n + 1); }, 600);
      }
    }, 400);
  }

  /* ── Main sequence ────────────────────────────────────────────────────── */
  dbg('script start: city=' + CITY + ' dist=' + DIST + ' hood=' + HOOD + ' road=' + ROAD);

  waitForm(function() {
    /* Önce EGM'nin auto-login + şehir verisini yüklemesini bekle */
    waitForCityOptions(function() {
      openAndSelect('cityDropdown',          CITY, 0, function() {
        openAndSelect('districtDropdown',    DIST, 1, function() {
          openAndSelect('neighboorhoodDropdown', HOOD, 2, function() {
            openAndSelect('streetDropdown', ROAD, 3, function() {
              setTimeout(function() {
                fillDesc();
                setTimeout(fillDesc, 600);
              }, 300);
              dbg('cascade complete');
            });
          });
        });
      });
    });
  });

  true;
})();
`;
};

export const EGMWebViewScreen = () => {
  const navigation  = useNavigation();
  const route       = useRoute();
  const insets      = useSafeAreaInsets();
  const {colors}    = useTheme();
  const styles      = useMemo(() => makeStyles(colors), [colors]);
  const webViewRef  = useRef<WebView>(null);

  const [webLoading,  setWebLoading]  = useState(true);
  const [egmLoading,  setEgmLoading]  = useState(true);
  const [egmLocation, setEgmLocation] = useState<EGMLocation | null>(null);
  const [canGoBack,   setCanGoBack]   = useState(false);
  const scriptFired = useRef(false);

  const info = (route.params as any)?.info as ShareInfo | undefined;

  /* EGM API'sinden konum verilerini çöz */
  useEffect(() => {
    if (!info) { setEgmLoading(false); return; }
    resolveEGMLocation(info).then(res => {
      setEgmLocation(res);
      setEgmLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* WebView yüklendi + EGM çözüldü → script çalıştır */
  useEffect(() => {
    if (webLoading || egmLoading || scriptFired.current) return;
    if (!info || !webViewRef.current) return;
    scriptFired.current = true;
    webViewRef.current.injectJavaScript(buildFillScript(info, egmLocation) + '\ntrue;');
  }, [webLoading, egmLoading, info, egmLocation]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.t === 'dbg') {
        console.log('[EGM]', data.m);
        if (data.m.startsWith('TIMEOUT') || data.m.startsWith('NOT FOUND')) {
          Alert.alert('EGM Debug', data.m);
        }
      }
    } catch {}
  };

  /* Token varsa WebView açılmadan localStorage'a yaz → EGM anında hazır */
  const preloadScript = egmLocation?.token
    ? `try{localStorage.setItem('NEXT_TRANSLATES_VALUES','${egmLocation.token}');}catch(e){}true;`
    : undefined;

  const isLoading = webLoading || egmLoading;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => canGoBack ? webViewRef.current?.goBack() : navigation.goBack()}
          style={styles.backBtn} activeOpacity={0.6}>
          <Text style={[styles.backIcon, {color: colors.primary}]}>
            {Platform.OS === 'ios' ? '‹' : '←'}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>EGM İhbar Formu</Text>
          <Text style={[styles.headerSub, {color: colors.textSecondary}]} numberOfLines={1}>
            {egmLoading ? 'Konum eşleştiriliyor...' : egmLocation ? 'Konum hazır ✓' : 'ihbar.ng112.gov.tr'}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
            {egmLoading ? 'EGM konumu eşleştiriliyor...' : 'Form yükleniyor...'}
          </Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{uri: EGM_URL}}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={preloadScript}
        onLoadEnd={() => setWebLoading(false)}
        onError={() => setWebLoading(false)}
        onNavigationStateChange={s => setCanGoBack(s.canGoBack)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        userAgent={EGM_UA}
      />

      {info && (
        <View style={[styles.hint, {backgroundColor: colors.card, borderTopColor: colors.border}]}>
          <Text style={[styles.hintText, {color: colors.textSecondary}]}>
            {egmLocation
              ? `✓ ${egmLocation.city} / ${egmLocation.district}${egmLocation.neighbourhood ? ' / ' + egmLocation.neighbourhood : ''}`
              : '💡 İl → İlçe → Mahalle → Cadde otomatik dolduruluyor'}
          </Text>
        </View>
      )}
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container:     {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    paddingVertical: 10, paddingHorizontal: 8,
  },
  backBtn:       {width: 44, height: 40, justifyContent: 'center', alignItems: 'center'},
  backIcon:      {fontSize: 38, fontWeight: '300', lineHeight: 42, marginTop: -4},
  headerCenter:  {flex: 1, alignItems: 'center'},
  headerTitle:   {fontSize: 16, fontWeight: '700', color: colors.text},
  headerSub:     {fontSize: 11, color: colors.textSecondary, marginTop: 1},
  webview:       {flex: 1},
  loadingOverlay: {
    position: 'absolute', top: 80, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  loadingText:   {marginTop: 12, fontSize: 14},
  hint: {paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth},
  hintText:      {fontSize: 12, textAlign: 'center', lineHeight: 17},
});
